"""
Explainability Module
- Generates SHAP feature importance for URL and DOM modalities
- Creates natural language explanations using LLM
- Provides detailed breakdown of prediction reasoning

Usage:
  python explain_prediction.py --url "https://example.com" --config config.json
  python explain_prediction.py --url "https://phishing.com" --screenshot image.png --output explanation.json
"""

import argparse
import os
import json
import joblib
import numpy as np
import shap
from inference_pipeline import predict_fusion, load_all_models
from url_feature_extractor import extract_url_features_from_string
from utils import load_config, build_dom_tokens


def get_shap_url_explanations(url_features, models, feature_names, top_k=5):
    """
    Get SHAP explanations for URL modality
    Returns top-k contributing features
    """
    try:
        X = np.array(url_features).reshape(1, -1)
        X_scaled = models["url_scaler"].transform(X)
        
        # Create SHAP explainer for URL model
        explainer = shap.TreeExplainer(models["url_model"])
        shap_values = explainer.shap_values(X_scaled)
        
        # Get SHAP values for phishing class (class 1)
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]  # class 1
        else:
            shap_vals = shap_values[0]
        
        # Get top-k features by absolute SHAP value
        indices = np.argsort(np.abs(shap_vals))[::-1][:top_k]
        
        top_features = []
        for idx in indices:
            top_features.append({
                "feature": feature_names[idx],
                "value": float(url_features[idx]),
                "shap_impact": float(shap_vals[idx]),
                "abs_impact": float(abs(shap_vals[idx]))
            })
        
        return top_features
    except Exception as e:
        print(f"[SHAP-URL] Error: {e}")
        return []


def get_shap_fusion_explanations(fusion_features, models):
    """
    Get SHAP explanations for fusion layer
    Shows which modality contributed most
    """
    try:
        X = np.array(fusion_features).reshape(1, -1)
        
        explainer = shap.TreeExplainer(models["fusion_model"])
        shap_values = explainer.shap_values(X)
        
        if isinstance(shap_values, list):
            shap_vals = shap_values[1][0]
        else:
            shap_vals = shap_values[0]
        
        # Feature names for fusion
        fusion_feature_names = [
            "p_url", "p_dom", "p_visual",
            "conf_url", "conf_dom", "conf_visual",
            "has_url", "has_dom", "has_visual"
        ]
        
        # Aggregate by modality
        modality_contributions = {
            "url": float(shap_vals[0] + shap_vals[3] + shap_vals[6]),
            "dom": float(shap_vals[1] + shap_vals[4] + shap_vals[7]),
            "visual": float(shap_vals[2] + shap_vals[5] + shap_vals[8])
        }
        
        # Normalize to weights (0-1)
        total = sum(abs(v) for v in modality_contributions.values())
        if total > 0:
            modality_weights = {k: abs(v)/total for k, v in modality_contributions.items()}
        else:
            modality_weights = {"url": 0.33, "dom": 0.33, "visual": 0.33}
        
        return {
            "modality_contributions": modality_contributions,
            "modality_weights": modality_weights
        }
    except Exception as e:
        print(f"[SHAP-Fusion] Error: {e}")
        return {
            "modality_contributions": {"url": 0, "dom": 0, "visual": 0},
            "modality_weights": {"url": 0.33, "dom": 0.33, "visual": 0.33}
        }


from google import genai

def _generate_fallback_explanation(prediction_result, shap_url_features, shap_fusion):
    """
    Generate a rule-based explanation from SHAP data when LLM is unavailable.
    This always returns a meaningful, data-driven explanation.
    """
    pred = prediction_result.get('prediction', 'UNKNOWN')
    conf = prediction_result.get('confidence', 0)
    modality_scores = prediction_result.get('modality_scores', {})

    is_phishing = pred.upper() == 'PHISHING'
    verdict = "Unsafe" if is_phishing else "Safe"
    conf_pct = f"{conf:.0%}"

    reasons = []

    # Reason 1: top SHAP URL feature
    if shap_url_features:
        top = shap_url_features[0]
        feat_name = top['feature'].replace('_', ' ').title()
        impact = top['shap_impact']
        direction = "suspicious" if impact > 0 else "characteristic of a legitimate site"
        reasons.append(f"The URL's {feat_name} appears {direction}")

    # Reason 2: strongest modality signal
    if shap_fusion and shap_fusion.get('modality_weights'):
        weights = shap_fusion['modality_weights']
        top_mod = max(weights, key=weights.get)
        top_score = modality_scores.get(top_mod)
        if top_score is not None:
            score_pct = f"{top_score:.0%}"
            reasons.append(f"The {top_mod.upper()} analysis was the strongest signal ({score_pct} phishing probability)")

    # Reason 3: confidence context
    if conf >= 0.85:
        reasons.append(f"The model is highly confident ({conf_pct}) in this assessment")
    elif conf >= 0.65:
        reasons.append(f"The model is moderately confident ({conf_pct}) in this assessment")
    else:
        reasons.append(f"The model shows lower certainty ({conf_pct}); exercise caution regardless")

    reason_text = ". ".join(reasons) + "." if reasons else ""
    recommendation = (
        "Do not enter any personal information or credentials on this site."
        if is_phishing else
        "This site appears legitimate, but always verify the URL before sharing sensitive data."
    )
    return f"Verdict: {verdict}. {reason_text} {recommendation}"


def generate_llm_explanation(prediction_result, shap_url_features, shap_fusion):
    """
    Generate natural language explanation using Google Gemini.
    Falls back to rule-based explanation if API fails or quota exceeded.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return _generate_fallback_explanation(prediction_result, shap_url_features, shap_fusion)

    try:
        client = genai.Client(api_key=api_key)

        pred = prediction_result['prediction']
        conf = prediction_result['confidence']
        url = prediction_result['url']

        context = f"""
        Analyze this URL scan result and explain why it is {pred} (Confidence: {conf:.1%}).
        URL: {url}

        Key Technical Indicators:
        """

        if shap_url_features:
            context += "\nURL Features (SHAP importance):"
            for feat in shap_url_features[:3]:
                context += f"\n- {feat['feature']}: {feat['value']} (Impact: {feat['shap_impact']:.4f})"

        if shap_fusion:
            weights = shap_fusion['modality_weights']
            top_modality = max(weights, key=weights.get)
            context += f"\n\nModality Analysis:\n- Top Factor: {top_modality.upper()} ({weights[top_modality]:.1%} weight)"
            context += f"\n- Full weights: {weights}"

        prompt = f"""
        Act as a cybersecurity expert. {context}

        Provide a concise, non-technical explanation for a regular user.
        1. Start with a clear verdict (Safe/Unsafe).
        2. Explain 2-3 key reasons based on the indicators above.
        3. Give a safety recommendation.
        Keep it under 100 words. Do not use markdown bolding too heavily.
        """

        # Try models in order of preference
        models_to_try = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']
        last_error = None

        for model_name in models_to_try:
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                return response.text
            except Exception as model_err:
                last_error = model_err
                err_str = str(model_err)
                if '403' in err_str or 'PERMISSION_DENIED' in err_str:
                    break  # Key is invalid, no point trying other models
                print(f"[Gemini] Model {model_name} failed, trying next... ({err_str[:80]})")
                continue

        raise last_error

    except Exception as e:
        error_msg = str(e)
        print(f"[Gemini] All models failed: {error_msg[:120]}")
        with open("gemini_error.log", "a") as f:
            f.write(f"Gemini API Error: {error_msg}\n")
        # Always return a meaningful fallback, never an empty/useless string
        return _generate_fallback_explanation(prediction_result, shap_url_features, shap_fusion)



def explain_prediction(url_string, screenshot_path=None, models=None, device="cpu"):
    """
    Generate full explanation for a prediction
    
    Returns:
        Dict with prediction, SHAP values, and natural language explanation
    """
    # Get prediction
    result = predict_fusion(
        url_string=url_string,
        screenshot_path=screenshot_path,
        models=models,
        device=device
    )
    
    # Extract URL features for SHAP
    url_features = extract_url_features_from_string(url_string, models["url_features"])
    
    # Get SHAP explanations for URL
    shap_url = get_shap_url_explanations(url_features, models, models["url_features"])
    
    # Build fusion features
    p_url = result['modality_scores']['url'] if result['modality_scores']['url'] is not None else -1.0
    p_dom = result['modality_scores']['dom'] if result['modality_scores']['dom'] is not None else -1.0
    p_visual = result['modality_scores']['visual'] if result['modality_scores']['visual'] is not None else -1.0
    
    conf_url = result['modality_confidence']['url'] if result['modality_confidence']['url'] is not None else 0.0
    conf_dom = result['modality_confidence']['dom'] if result['modality_confidence']['dom'] is not None else 0.0
    conf_visual = result['modality_confidence']['visual'] if result['modality_confidence']['visual'] is not None else 0.0
    
    fusion_features = [
        p_url, p_dom, p_visual,
        conf_url, conf_dom, conf_visual,
        1.0 if result['modality_available']['url'] else 0.0,
        1.0 if result['modality_available']['dom'] else 0.0,
        1.0 if result['modality_available']['visual'] else 0.0
    ]
    
    # Get SHAP explanations for fusion
    shap_fusion = get_shap_fusion_explanations(fusion_features, models)
    
    # Generate natural language explanation
    llm_explanation = generate_llm_explanation(result, shap_url, shap_fusion)
    
    # Combine everything
    result['explanation'] = {
        "summary": llm_explanation,
        "shap_url_features": shap_url,
        "shap_fusion": shap_fusion
    }
    
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True, help="URL to analyze")
    parser.add_argument("--screenshot", default=None, help="Path to screenshot (optional)")
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--output", default=None, help="Save explanation to JSON file")
    args = parser.parse_args()
    
    # Load config
    cfg = load_config(args.config)
    models_dir = cfg["models_dir"]
    
    # Device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    
    # Load models
    print("[Explain] Loading models...")
    models = load_all_models(models_dir, device)
    print("[Explain] Models loaded.")
    
    # Generate explanation
    print(f"\n[Explain] Analyzing and explaining: {args.url}\n")
    result = explain_prediction(
        url_string=args.url,
        screenshot_path=args.screenshot,
        models=models,
        device=device
    )
    
    # Display explanation
    print("="*70)
    print("PREDICTION WITH EXPLANATION")
    print("="*70)
    print(f"URL: {result['url']}\n")
    print(result['explanation']['summary'])
    print("\n" + "="*70)
    print("TECHNICAL DETAILS")
    print("="*70)
    print(f"\nTop URL Features (SHAP):")
    for feat in result['explanation']['shap_url_features'][:5]:
        print(f"  {feat['feature']:20s} = {feat['value']:8.2f}  (SHAP: {feat['shap_impact']:+.4f})")
    
    print(f"\nModality Contribution Weights:")
    for mod, weight in result['explanation']['shap_fusion']['modality_weights'].items():
        print(f"  {mod.upper():10s}: {weight:.2%}")
    print("="*70)
    
    # Save if requested
    if args.output:
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"\n[Explain] Full result saved to {args.output}")
    
    return result


if __name__ == "__main__":
    import torch  # Import here to avoid circular dependency
    main()
