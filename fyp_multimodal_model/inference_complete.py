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
from url_feature_extractor import extract_url_features_from_string
from utils import load_config, build_dom_tokens
from url_utils import is_url_alive


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
        return proba[1], max(proba), True
    except Exception as e:
        print(f"[URL Modality] Error: {e}")
        return -1.0, 0.0, False


def predict_dom_modality(dom_features_dict, models):
    """Get DOM modality prediction from extracted features"""
    try:
        # Build tokens from DOM features
        tokens = build_dom_tokens(dom_features_dict)
        embedding = models["doc2vec"].infer_vector(tokens)
        proba = models["dom_model"].predict_proba([embedding])[0]
        return proba[1], max(proba), True
    except Exception as e:
        print(f"[DOM Modality] Error: {e}")
        return -1.0, 0.0, False


def predict_visual_modality(screenshot_path, models, device):
    """Get Visual modality prediction from screenshot"""
    try:
        if not screenshot_path or not os.path.exists(screenshot_path):
            return -1.0, 0.0, False
        
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
            confidence = max(probs[0].item(), probs[1].item())
        
        return p_phish, confidence, True
    except Exception as e:
        print(f"[Visual Modality] Error: {e}")
        return -1.0, 0.0, False


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
    
    # Step 3: DOM Modality
    print("\n[4/5] Analyzing DOM structure...")
    if page_result['success']:
        # Extract DOM features
        dom_features_dict = fetcher.extract_dom_features(page_result['html'])
        print(f"      [OK] Extracted DOM features: {len(dom_features_dict)} features")
        print(f"        HasForm: {dom_features_dict.get('HasForm', 0)}")
        print(f"        HasPasswordField: {dom_features_dict.get('HasPasswordField', 0)}")
        print(f"        NoOfImage: {dom_features_dict.get('NoOfImage', 0)}")
        
        # Get DOM prediction
        p_dom, conf_dom, has_dom = predict_dom_modality(dom_features_dict, models)
        if has_dom:
            print(f"      [OK] DOM Score: {p_dom:.4f} (confidence: {conf_dom:.2%})")
    else:
        print(f"      [FAIL] Webpage fetch failed: {page_result.get('error', 'Unknown error')}")
        p_dom, conf_dom, has_dom = -1.0, 0.0, False
        dom_features_dict = {}
    print()
    
    # Step 4: Visual Modality
    print("[5/5] Analyzing visual appearance...")
    if page_result['success'] and page_result.get('screenshot_path'):
        screenshot_path = page_result['screenshot_path']
        p_visual, conf_visual, has_visual = predict_visual_modality(screenshot_path, models, device)
        if has_visual:
            print(f"      [OK] Visual Score: {p_visual:.4f} (confidence: {conf_visual:.2%})")
            print(f"      [OK] Screenshot: {screenshot_path}")
    else:
        print(f"      [FAIL] Screenshot not available")
        p_visual, conf_visual, has_visual = -1.0, 0.0, False
        screenshot_path = None
    print()
    
    # Step 5: Fusion
    print("[FUSION] Combining all modalities...")
    fusion_features = [
        p_url if has_url else -1.0,
        p_dom if has_dom else -1.0,
        p_visual if has_visual else -1.0,
        conf_url if has_url else 0.0,
        conf_dom if has_dom else 0.0,
        conf_visual if has_visual else 0.0,
        1.0 if has_url else 0.0,
        1.0 if has_dom else 0.0,
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
    
    # Print final result
    print("\n" + "="*70)
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
