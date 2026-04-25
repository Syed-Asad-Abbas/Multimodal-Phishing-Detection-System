"""
Complete End-to-End Inference Pipeline
Takes a URL, fetches page safely, extracts all features, runs fusion model
"""

import os
import sys
import argparse
import json
import joblib
import numpy as np
import torch
from torchvision import transforms, models
import torch.nn as nn
from PIL import Image

from webpage_fetcher import SafeWebpageFetcher
from url_feature_extractor import extract_url_features_from_string, extract_url_features_dict
from utils import load_config, build_dom_tokens
from url_utils import is_url_alive
from explain_prediction import get_shap_url_explanations, get_shap_fusion_explanations, generate_llm_explanation
from dotenv import load_dotenv

load_dotenv()


def load_all_models(models_dir, device):
    """Load all models (URL production, DOM, Visual, Fusion)"""
    
    # URL model (production version with computable features)
    url_path = os.path.join(models_dir, "url_lgbm_production.joblib")
    url_data = joblib.load(url_path)
    url_model = url_data["model"]
    url_scaler = url_data["scaler"]
    url_features = url_data["feature_names"]
    
    # DOM model
    dom_path = os.path.join(models_dir, "dom_doc2vec_lgbm.joblib")
    dom_data = joblib.load(dom_path)
    doc2vec = dom_data["doc2vec"]
    dom_model = dom_data["model"]
    
    # Visual model
    visual_path = os.path.join(models_dir, "visual_resnet50.pt")
    visual_model = models.resnet50(weights=None)
    visual_model.fc = nn.Linear(visual_model.fc.in_features, 2)
    visual_model.load_state_dict(torch.load(visual_path, map_location=device))
    visual_model = visual_model.to(device)
    visual_model.eval()
    
    # Fusion model
    fusion_path = os.path.join(models_dir, "fusion_lgbm.joblib")
    fusion_data = joblib.load(fusion_path)
    fusion_model = fusion_data["model"]
    
    return {
        "url_model": url_model,
        "url_scaler": url_scaler,
        "url_features": url_features,
        "doc2vec": doc2vec,
        "dom_model": dom_model,
        "visual_model": visual_model,
        "fusion_model": fusion_model
    }


def predict_url_modality(url_string, models):
    """Get URL modality prediction using production model"""
    try:
        features = extract_url_features_from_string(url_string, models["url_features"])
        X = np.array(features).reshape(1, -1)
        X_scaled = models["url_scaler"].transform(X)
        proba = models["url_model"].predict_proba(X_scaled)[0]
        signed_conf = (proba[1] - 0.5) * 2.0
        return proba[1], signed_conf, True
    except Exception as e:
        print(f"[URL Modality] Error: {e}")
        return float('nan'), float('nan'), False


def predict_dom_modality(dom_features_dict, models):
    """Get DOM modality prediction from extracted features.
    DOM model trained with non-flipped PhiUSIIL labels: proba[1] = P(benign).
    We invert here so the returned value is P(phishing), consistent with URL/visual.
    """
    try:
        # Build tokens from DOM features
        tokens = build_dom_tokens(dom_features_dict)
        embedding = models["doc2vec"].infer_vector(tokens)
        proba = models["dom_model"].predict_proba([embedding])[0]
        # proba[1] = P(benign in PhiUSIIL) — invert to get P(phishing)
        p_phish = 1.0 - proba[1]
        signed_conf = (p_phish - 0.5) * 2.0
        return p_phish, signed_conf, True
    except Exception as e:
        print(f"[DOM Modality] Error: {e}")
        return float('nan'), float('nan'), False


def predict_visual_modality(screenshot_path, models, device):
    """Get Visual modality prediction from screenshot"""
    try:
        if not screenshot_path or not os.path.exists(screenshot_path):
            return float('nan'), float('nan'), False

        transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        img = Image.open(screenshot_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            out = models["visual_model"](img_tensor)
            probs = torch.softmax(out, dim=1)[0]
            p_phish = probs[1].item()
            signed_conf = (p_phish - 0.5) * 2.0

        return p_phish, signed_conf, True
    except Exception as e:
        print(f"[Visual Modality] Error: {e}")
        return float('nan'), float('nan'), False


def predict_complete_pipeline(url, models_dir="models", fetch_timeout=10, device="cpu"):
    """
    Complete end-to-end prediction pipeline
    
    Args:
        url: URL to analyze
        models_dir: Directory containing trained models
        fetch_timeout: Timeout for webpage fetching
        device: torch device (cpu/cuda)
    
    Returns:
        Complete prediction result with all modality scores
    """
    print("="*70)
    print("COMPLETE MULTIMODAL PHISHING DETECTION PIPELINE")
    print("="*70)
    print(f"\nTarget URL: {url}\n")
    
    # Load models
    print("[1/5] Loading models...")
    models = load_all_models(models_dir, device)
    print("      [OK] All models loaded\n")
    
    # Step 1: URL Modality (always available)
    print("[2/5] Analyzing URL features...")
    p_url, conf_url, has_url = predict_url_modality(url, models)
    if has_url:
        print(f"      [OK] URL Score: {p_url:.4f} (confidence: {conf_url:.2%})")
    else:
        print(f"      [FAIL] URL analysis failed")
    print()
    
    # Step 2: Fetch webpage
    print("[3/5] Checking URL liveness and fetching webpage...")
    
    # Check if URL is alive first
    is_alive = is_url_alive(url)
    
    if not is_alive:
        print(f"      [FAIL] URL is dead or unreachable. Skipping fetch.")
        page_result = {
            "success": False,
            "error": "URL unreachable (dead link)",
            "html": "",
            "screenshot_path": None
        }
    else:
        print(f"      [OK] URL is alive. Fetching content (safe mode)...")
        fetcher = SafeWebpageFetcher(timeout=fetch_timeout, headless=True)
        page_result = fetcher.fetch_page(url)

        # F8: Update URL features using final (post-redirect) URL if it differs
        if page_result.get('success') and page_result.get('final_url'):
            from urllib.parse import urlparse as _urlparse
            from url_feature_extractor import extract_url_features_with_redirect
            final_url = page_result['final_url']
            init_domain = _urlparse(url).netloc.replace('www.', '')
            final_domain = _urlparse(final_url).netloc.replace('www.', '')
            cross_domain = int(init_domain != final_domain)
            # F8: only rescore URL features when redirect crosses domains (e.g. bit.ly → evil.tk)
            # Trivial same-domain redirects (trailing slash, https normalisation) must NOT
            # trigger rescoring — they change URLLength by 1 char and can flip the classifier.
            if final_url != url and cross_domain:
                try:
                    redir_dict = extract_url_features_with_redirect(
                        url, final_url, redirect_depth=1,
                        cross_domain_redirect=cross_domain,
                        feature_names=models["url_features"]
                    )
                    X_r = np.array([redir_dict.get(fn, 0) for fn in models["url_features"]]).reshape(1, -1)
                    X_r_s = models["url_scaler"].transform(X_r)
                    redir_proba = models["url_model"].predict_proba(X_r_s)[0]
                    p_url = redir_proba[1]
                    conf_url = (p_url - 0.5) * 2.0
                    has_url = True
                    print(f"      [F8] Cross-domain redirect → final URL features applied (cross_domain={cross_domain})")
                except Exception:
                    pass

    # Step 3: DOM Modality
    print("\n[4/5] Analyzing DOM structure...")
    if page_result['success']:
        raw_html = page_result.get('html', '')
        dom_features_dict = fetcher.extract_dom_features(raw_html)
        print(f"      [OK] Extracted DOM features: {len(dom_features_dict)} features")
        print(f"        HasForm: {dom_features_dict.get('HasForm', 0)}")
        print(f"        HasPasswordField: {dom_features_dict.get('HasPasswordField', 0)}")
        print(f"        NoOfImage: {dom_features_dict.get('NoOfImage', 0)}")

        # F9: Skip DOM modality if CAPTCHA/interstitial detected
        from inference_pipeline import is_interstitial_page
        if is_interstitial_page(raw_html):
            print("      [F9] CAPTCHA/interstitial detected — skipping DOM modality")
            p_dom, conf_dom, has_dom = float('nan'), float('nan'), False
        else:
            # Get DOM prediction
            p_dom, conf_dom, has_dom = predict_dom_modality(dom_features_dict, models)
            if has_dom:
                print(f"      [OK] DOM Score: {p_dom:.4f} (signed_conf: {conf_dom:.4f})")
    else:
        print(f"      [FAIL] Webpage fetch failed: {page_result.get('error', 'Unknown error')}")
        p_dom, conf_dom, has_dom = float('nan'), float('nan'), False
        dom_features_dict = {}
    print()

    # Step 4: Visual Modality
    print("[5/5] Analyzing visual appearance...")
    if page_result['success'] and page_result.get('screenshot_path'):
        screenshot_path = page_result['screenshot_path']
        p_visual, conf_visual, has_visual = predict_visual_modality(screenshot_path, models, device)
        if has_visual:
            print(f"      [OK] Visual Score: {p_visual:.4f} (signed_conf: {conf_visual:.4f})")
            print(f"      [OK] Screenshot: {screenshot_path}")
    else:
        print(f"      [FAIL] Screenshot not available")
        p_visual, conf_visual, has_visual = float('nan'), float('nan'), False
        screenshot_path = None
    print()

    # Step 5: Fusion
    print("[FUSION] Combining all modalities...")
    fusion_features = [
        p_url    if has_url    else float('nan'),
        p_dom    if has_dom    else float('nan'),
        p_visual if has_visual else float('nan'),
        conf_url    if has_url    else float('nan'),
        conf_dom    if has_dom    else float('nan'),
        conf_visual if has_visual else float('nan'),
        1.0 if has_url    else 0.0,
        1.0 if has_dom    else 0.0,
        1.0 if has_visual else 0.0
    ]
    
    X_fusion = np.array(fusion_features).reshape(1, -1)
    fusion_proba = models["fusion_model"].predict_proba(X_fusion)[0]
    
    # Final prediction logic with Safety Net
    threshold = 0.5
    safety_threshold = 0.60
    
    dom_score = p_dom if has_dom else 0.0
    visual_score = p_visual if has_visual else 0.0
    fusion_prob_phish = fusion_proba[1]
    
    if fusion_prob_phish > threshold:
        prediction = "PHISHING"
        final_prob = fusion_prob_phish
    else:
        prediction = "BENIGN"
        final_prob = fusion_prob_phish

    # ------------------------------------------------------------------
    # POST-FUSION EDGE-CASE CORRECTIONS
    #
    # Rule 1 — LoginPath:
    #   The URL model over-fires on clean domains with /login paths
    #   (PhiUSIIL training set has almost no benign login-page URLs).
    #   If DOM + Visual together are NOT strongly phishing, the page is
    #   almost certainly a legitimate login portal.
    #
    # Rule 2 — DOMSpike:
    #   When URL is very benign and Visual is borderline benign but DOM
    #   alone spikes (wiki search box, CMS portal, etc.), the DOM model
    #   is reacting to an unusual-but-legitimate page structure, not to
    #   real phishing content.
    #
    # Rule 3 — OAuthRedirect:
    #   F8 redirect rescoring can cause clean portals (portal.azure.com)
    #   to inherit the URL score of their OAuth destination
    #   (login.microsoftonline.com?client_id=...).  When BOTH DOM and
    #   Visual clearly agree the page is benign, trust them over the URL.
    # ------------------------------------------------------------------
    if prediction == "PHISHING":
        from urllib.parse import urlparse as _urlparse2
        _login_kws = {'login', 'signin', 'sign-in', 'logon', 'log-in', 'auth', 'logins'}
        _path_lower = _urlparse2(url).path.lower()
        _has_login_path = any(kw in _path_lower for kw in _login_kws)

        if _has_login_path and has_url and p_url >= 0.80 and has_dom and has_visual:
            _feats = extract_url_features_dict(url)
            _is_clean = (
                _feats.get('DomainHyphenCount', 1) == 0
                and _feats.get('DomainDigitRatio', 1.0) == 0.0
                and _feats.get('MaxDigitRunLength', 1) == 0
                and _feats.get('BrandKeywordInSLD', 1) == 0
                and _feats.get('NoOfSubDomain', 1) == 0
                and _feats.get('HasIDNHomograph', 1) == 0
            )
            if _is_clean and (p_dom + p_visual) / 2.0 < 0.65:
                prediction = "BENIGN"
                final_prob = 0.30
                print("      [Rule1-LoginPath] Clean-domain login page — overriding to BENIGN")

    if prediction == "PHISHING" and has_url and has_dom and has_visual:
        if p_url < 0.10 and p_visual < 0.50 and p_dom > 0.85:
            # Guard: only override for clean domains (no hyphens/digits in SLD).
            # Hyphenated domains like auth-legends-cup.com can score low on URL model
            # but are still suspicious; a DOM spike on those should not override.
            _feats2 = extract_url_features_dict(url)
            _r2_clean = (
                _feats2.get('DomainHyphenCount', 1) == 0
                and _feats2.get('DomainDigitRatio', 1.0) == 0.0
                and _feats2.get('IsSLDNumeric', 1) == 0
                and _feats2.get('HasIDNHomograph', 1) == 0
            )
            if _r2_clean:
                prediction = "BENIGN"
                final_prob = max(p_url, p_visual) * 0.5
                print("      [Rule2-DOMSpike] URL+Visual both benign, DOM spike only — overriding to BENIGN")

    if prediction == "PHISHING" and has_url and has_dom and has_visual:
        if p_url >= 0.95 and p_dom < 0.45 and p_visual < 0.45:
            # Guard: only override if the URL itself (pre-F8, no redirect rescoring)
            # is benign. F8 can inflate p_url for clean portals that redirect to OAuth
            # endpoints. Phishing URLs returning error pages also have low DOM+Visual
            # but their pre-F8 score is already high — those must NOT be overridden.
            _feats_r3 = extract_url_features_from_string(url, models["url_features"])
            _raw_r3 = np.array(_feats_r3).reshape(1, -1)
            _raw_r3_s = models["url_scaler"].transform(_raw_r3)
            _prefx_r3 = models["url_model"].predict_proba(_raw_r3_s)[0][1]
            if _prefx_r3 < 0.50:
                prediction = "BENIGN"
                final_prob = (p_dom + p_visual) / 2.0
                print("      [Rule3-OAuthRedirect] Both DOM and Visual benign despite URL score — overriding to BENIGN")
    # ------------------------------------------------------------------

    confidence = final_prob if prediction == "PHISHING" else (1.0 - final_prob)

    # Build result
    result = {
        "url": url,
        "prediction": prediction,
        "confidence": float(confidence),
        "fusion_probability_phishing": float(final_prob),
        "modality_scores": {
            "url": float(p_url) if has_url else None,
            "dom": float(p_dom) if has_dom else None,
            "visual": float(p_visual) if has_visual else None
        },
        "modality_verdicts": {
            "url": ("PHISHING" if p_url > 0.5 else "BENIGN") if has_url else "N/A",
            "dom": ("PHISHING" if p_dom > 0.5 else "BENIGN") if has_dom else "N/A",
            "visual": ("PHISHING" if p_visual > 0.5 else "BENIGN") if has_visual else "N/A"
        },
        "modality_confidence": {
            "url": float(conf_url) if has_url else None,
            "dom": float(conf_dom) if has_dom else None,
            "visual": float(conf_visual) if has_visual else None
        },
        "modality_available": {
            "url": has_url,
            "dom": has_dom,
            "visual": has_visual
        },
        "page_info": {
            "fetch_success": page_result.get('success', False),
            "page_title": page_result.get('page_title', None),
            "final_url": page_result.get('final_url', url),
            "screenshot_path": screenshot_path
        },
        "dom_features": dom_features_dict if has_dom else {}
    }
    
    # ---------------------------------------------------------
    # EXPLAINABILITY (SHAP + Gemini)
    # ---------------------------------------------------------
    try:
        print("\n[EXPLAIN] Generating explanations...")
        
        # 1. URL SHAP
        # We need raw URL features. We already called predict_url_modality but didn't keep features.
        # Let's re-extract or modify predict_url_modality to return them.
        # Ideally, we should receive features from predict_url_modality, but for now let's re-extract.
        url_features_raw = extract_url_features_from_string(url, models["url_features"])
        shap_url = get_shap_url_explanations(url_features_raw, models, models["url_features"])
        
        # 2. Fusion SHAP
        # We have fusion_features ready
        shap_fusion = get_shap_fusion_explanations(fusion_features, models)
        
        # 3. LLM Explanation
        llm_explanation = generate_llm_explanation(result, shap_url, shap_fusion)
        
        result['explanation'] = llm_explanation
        result['shap_values'] = {
            "url": {item['feature']: item['shap_impact'] for item in shap_url},
            "fusion_contribution": shap_fusion['modality_weights']
        }
        
        # Also keep detailed structure if needed
        result['detailed_explanation'] = {
            "shap_url_top": shap_url,
            "shap_fusion": shap_fusion
        }
        
        print(f"      [OK] Explanation generated")
        
    except Exception as e:
        print(f"      [FAIL] Explanation generation failed: {e}")
        result['explanation'] = "Explanation unavailable."
        result['shap_values'] = {}


    # ---------------------------------------------------------
    # IP & GEO METADATA
    # ---------------------------------------------------------
    try:
        from urllib.parse import urlparse
        import socket
        import requests 

        domain = urlparse(url).netloc
        # Extract IP address
        try:
            ip_address = socket.gethostbyname(domain)
        except:
            ip_address = None

        # Extract Geo Location (using ip-api.com free tier)
        geo_data = {}
        if ip_address:
            try:
                response = requests.get(f"http://ip-api.com/json/{ip_address}?fields=status,country,lat,lon", timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'success':
                        geo_data = {
                            "country": data.get('country'),
                            "lat": data.get('lat'),
                            "long": data.get('lon')
                        }
            except:
                pass

        result['ip_metadata'] = {
            "ip": ip_address,
            "geo": geo_data if geo_data else None
        }
        print(f"      [OK] IP Metadata: {ip_address} ({geo_data.get('country', 'Unknown')})")

    except Exception as e:
        print(f"      [WARN] IP Metadata extraction failed: {e}")
        result['ip_metadata'] = None

    print("FINAL RESULT")
    print("="*70)
    print(f"Prediction:  {result['prediction']}")
    print(f"Confidence:  {result['confidence']:.2%}")
    print(f"Phish Prob:  {result['fusion_probability_phishing']:.2%}")
    print(f"\nModalities Used: {sum(result['modality_available'].values())}/3")
    print(f"  URL:    {'[OK]' if result['modality_available']['url'] else '[FAIL]'}")
    print(f"  DOM:    {'[OK]' if result['modality_available']['dom'] else '[FAIL]'}")
    print(f"  Visual: {'[OK]' if result['modality_available']['visual'] else '[FAIL]'}")
    print("="*70)
    
    return result


def main():
    parser = argparse.ArgumentParser(description='Complete multimodal phishing detection')
    parser.add_argument('--url', required=True, help='URL to analyze')
    parser.add_argument('--models-dir', default='models', help='Models directory')
    parser.add_argument('--timeout', type=int, default=10, help='Page fetch timeout (seconds)')
    parser.add_argument('--output', help='Save result to JSON file')
    args = parser.parse_args()
    
    # Device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Run prediction
    result = predict_complete_pipeline(
        url=args.url,
        models_dir=args.models_dir,
        fetch_timeout=args.timeout,
        device=device
    )
    
    # Save to file if requested
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\n✓ Result saved to: {args.output}")


if __name__ == "__main__":
    main()
