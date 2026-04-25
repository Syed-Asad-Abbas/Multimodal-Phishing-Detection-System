"""
End-to-End Inference Pipeline
- Single URL prediction combining all modalities
- Gracefully handles missing modalities
- Returns structured result with predictions and scores

Usage:
  python inference_pipeline.py --url "https://example.com" --config config.json
  python inference_pipeline.py --url "https://phishing-site.com" --screenshot path/to/image.png
"""

import argparse
import os
import json
import joblib
import numpy as np
from PIL import Image
import torch
from torchvision import transforms, models
import torch.nn as nn
from utils import load_config, build_dom_tokens


def load_all_models(models_dir, device):
    """Load all four models (URL, DOM, Visual, Fusion)"""
    
    # URL model
    url_path = os.path.join(models_dir, "url_lgbm.joblib")
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


from url_feature_extractor import extract_url_features_from_string


CAPTCHA_SIGNATURES = [
    'cf-browser-verification',
    'just-a-moment',
    'jschl-answer',
    'hcaptcha.com',
    'recaptcha/api',
    'verifying you are human',
    'please enable javascript',
    'access denied',
    'page has been denied',      # pairs with 'access denied' for bot-protection pages
    'you have been blocked',
    'ray-id',
    'please wait while we verify',
    'ddos-guard',
]


def is_interstitial_page(html: str) -> bool:
    """
    Returns True if the fetched HTML is a bot-detection/CAPTCHA interstitial.
    Requires >= 2 signature matches to avoid false positives.
    """
    if not html or len(html.strip()) < 50:
        return True
    html_lower = html.lower()
    matches = sum(1 for sig in CAPTCHA_SIGNATURES if sig in html_lower)
    return matches >= 2


def predict_url_modality(url_string, models):
    """Get URL modality prediction"""
    try:
        features = extract_url_features_from_string(url_string, models["url_features"])
        X = np.array(features).reshape(1, -1)
        X_scaled = models["url_scaler"].transform(X)
        proba = models["url_model"].predict_proba(X_scaled)[0]
        signed_conf = (proba[1] - 0.5) * 2.0
        return proba[1], signed_conf, True
    except Exception as e:
        print(f"[URL] Error: {e}")
        return float('nan'), float('nan'), False


def predict_dom_modality(dom_features_dict, models):
    """Get DOM modality prediction from extracted DOM features"""
    try:
        # Build tokens from DOM feature dict
        tokens = build_dom_tokens(dom_features_dict)
        embedding = models["doc2vec"].infer_vector(tokens)
        proba = models["dom_model"].predict_proba([embedding])[0]
        signed_conf = (proba[1] - 0.5) * 2.0
        return proba[1], signed_conf, True
    except Exception as e:
        print(f"[DOM] Error: {e}")
        return float('nan'), float('nan'), False


def predict_visual_modality(image_path, models, device):
    """Get Visual modality prediction from screenshot"""
    try:
        if not image_path or not os.path.exists(image_path):
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

        img = Image.open(image_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            out = models["visual_model"](img_tensor)
            probs = torch.softmax(out, dim=1)[0]
            p_phish = probs[1].item()
            signed_conf = (p_phish - 0.5) * 2.0

        return p_phish, signed_conf, True
    except Exception as e:
        print(f"[Visual] Error: {e}")
        return float('nan'), float('nan'), False


def predict_fusion(url_string, dom_features=None, screenshot_path=None, models=None, device="cpu"):
    """
    End-to-end fusion prediction
    
    Args:
        url_string: URL to analyze
        dom_features: Dict of DOM features (if available, otherwise extracted)
        screenshot_path: Path to screenshot image (optional)
        models: Pre-loaded models dict
        device: torch device
    
    Returns:
        Dict with prediction results
    """
    # Get modality predictions
    p_url, conf_url, has_url = predict_url_modality(url_string, models)
    
    # DOM features — skip if interstitial/CAPTCHA page
    if dom_features is None:
        dom_features = {
            "HasForm": 0,
            "HasPasswordField": 0,
            "NoOfImage": 0,
            "NoOfJS": 0
        }

    raw_html = dom_features.get("_raw_html", "") if isinstance(dom_features, dict) else ""
    if raw_html and is_interstitial_page(raw_html):
        print("[Warning] CAPTCHA/interstitial detected — skipping DOM modality")
        p_dom, conf_dom, has_dom = float('nan'), float('nan'), False
    else:
        p_dom, conf_dom, has_dom = predict_dom_modality(dom_features, models)

    # Visual
    p_visual, conf_visual, has_visual = predict_visual_modality(screenshot_path, models, device)

    # Build fusion feature vector
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
    
    # Final prediction
    fusion_proba = models["fusion_model"].predict_proba(X_fusion)[0]
    fusion_pred = models["fusion_model"].predict(X_fusion)[0]
    
    result = {
        "url": url_string,
        "prediction": "phishing" if fusion_pred == 1 else "benign",
        "confidence": float(max(fusion_proba)),
        "fusion_proba_phishing": float(fusion_proba[1]),
        "modality_scores": {
            "url": float(p_url) if has_url else None,
            "dom": float(p_dom) if has_dom else None,
            "visual": float(p_visual) if has_visual else None
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
        }
    }
    
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="URL to analyze")
    parser.add_argument("--screenshot", default=None, help="Path to screenshot image (optional)")
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--output", default=None, help="Save result to JSON file")
    args = parser.parse_args()
    
    # Load config
    cfg = load_config(args.config)
    models_dir = cfg["models_dir"]
    
    # Device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Load all models
    print("[Inference] Loading models...")
    models = load_all_models(models_dir, device)
    print("[Inference] Models loaded successfully.")
    
    # Run prediction
    print(f"\n[Inference] Analyzing URL: {args.url}")
    result = predict_fusion(
        url_string=args.url,
        screenshot_path=args.screenshot,
        models=models,
        device=device
    )
    
    # Display result
    print("\n" + "="*60)
    print("PREDICTION RESULT")
    print("="*60)
    print(f"URL:        {result['url']}")
    print(f"Prediction: {result['prediction'].upper()}")
    print(f"Confidence: {result['confidence']:.2%}")
    print(f"\nFusion Probability (Phishing): {result['fusion_proba_phishing']:.2%}")
    print(f"\nModality Scores:")
    print(f"  URL:    {result['modality_scores']['url']:.4f}" if result['modality_scores']['url'] is not None else "  URL:    N/A")
    print(f"  DOM:    {result['modality_scores']['dom']:.4f}" if result['modality_scores']['dom'] is not None else "  DOM:    N/A")
    print(f"  Visual: {result['modality_scores']['visual']:.4f}" if result['modality_scores']['visual'] is not None else "  Visual: N/A")
    print("="*60)
    
    # Save to file if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\n[Inference] Result saved to {args.output}")
    
    return result


if __name__ == "__main__":
    main()
