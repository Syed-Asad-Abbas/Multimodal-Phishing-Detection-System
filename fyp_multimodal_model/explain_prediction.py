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
from dotenv import load_dotenv
load_dotenv()
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

def generate_llm_explanation(prediction_result, shap_url_features, shap_fusion):
    """
    Generate natural language explanation using Google Gemini
    """
    try:
        # Collect available API keys (1 to 10)
        available_keys = []
        for i in range(1, 10):
            key = os.environ.get(f"GEMINI_API_KEY_{i}")
            if key:
                available_keys.append(key)
                
        # Also check the default key just in case
        default_key = os.environ.get("GEMINI_API_KEY")
        if default_key and default_key not in available_keys:
            available_keys.append(default_key)

        if not available_keys:
            return "Note: Gemini API Keys not found. Please set GEMINI_API_KEY_1 environment variable for detailed explanations."

        pred = prediction_result['prediction']
        conf = prediction_result['confidence']
        url = prediction_result['url']

        FEATURE_MAP = {
            "URLLength": "Abnormally long or short web address",
            "DomainLength": "Unusual domain name length",
            "IsDomainIP": "Uses an IP address instead of a domain name",
            "URLSimilarityIndex": "Web address visually mimics a known brand",
            "CharContinuationRate": "Suspicious pattern of repeating characters",
            "TLDLegitimateProb": "Uses a domain extension rarely seen on legitimate sites",
            "NoOfSubDomain": "Excessive number of subdomains",
            "HasObfuscation": "Contains hidden or obfuscated text to bypass filters",
            "ObfuscationRatio": "High amount of hidden/obfuscated text",
            "NoOfObfuscatedChar": "Contains hidden characters",
            "LetterRatioInURL": "Suspicious ratio of letters to other characters",
            "DegitRatioInURL": "Unusually high number of digits in the web address",
            "NoOfDegitsInURL": "Contains many numbers in the web address",
            "SpcialCharRatioInURL": "High ratio of special characters",
            "IsHTTPS": "Lacks a secure HTTPS certificate",
        }

        scores = prediction_result.get('modality_scores', {})
        p_url    = scores.get('url')    or 0.0
        p_dom    = scores.get('dom')    or 0.0
        p_visual = scores.get('visual') or 0.0

        # Fusion-level SHAP top drivers to find primary modality
        primary_modality = "URL"
        modality_breakdown = ""
        if shap_fusion and 'modality_contributions' in shap_fusion:
            contribs = shap_fusion['modality_contributions']
            if contribs:
                primary_modality = max(contribs, key=contribs.get).upper()
                modality_breakdown = ", ".join([f"{k.upper()} ({v*100:.1f}%)" for k, v in shap_fusion.get('modality_weights', {}).items()])

        # Build human-readable URL red flags
        url_red_flags = []
        if shap_url_features:
            sorted_feats = sorted(shap_url_features, key=lambda x: abs(x['shap_impact']), reverse=True)[:3]
            for f in sorted_feats:
                human_name = FEATURE_MAP.get(f['feature'], f['feature'])
                url_red_flags.append(f"- {human_name}")
        url_red_flags_str = "\n".join(url_red_flags) if url_red_flags else "None specific."

        prompt = f"""
You are a cybersecurity assistant explaining why a website was flagged as {pred}.
Explain this to a non-technical user in 3 concise, easy-to-read sentences. 
Do NOT use technical jargon like "SHAP values", "Modality", or "Machine Learning".

EVIDENCE:
- The system is {conf:.1%} confident in its decision.
- The most suspicious aspect of this website was its: {primary_modality}
- Breakdown of suspicion by category: {modality_breakdown}
- Specific URL red flags detected:
{url_red_flags_str}
- URL score: {p_url:.3f}, DOM score: {p_dom:.3f}, Visual score: {p_visual:.3f} (1.0 = certain phishing)

Sentence 1: State the final decision and the main reason why (e.g., "This site is likely phishing because it visually mimics a login page but has a suspicious web address.")
Sentence 2: Explain the specific red flags found in plain English based on the evidence provided above. Focus on the primary suspicious aspect ({primary_modality}) and mention if other aspects (DOM/Visual) were also suspicious.
Sentence 3: Give a final confidence statement or warning.
"""

        last_error = None
        for i, api_key in enumerate(available_keys):
            try:
                client = genai.Client(api_key=api_key)
                response = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=prompt,
                )
                return response.text
            except Exception as e:
                last_error = str(e)
                print(f"[Gemini] Key {i+1} failed: {last_error}")

        # If all keys fail, log the last error and return standard message
        with open("gemini_error.log", "a") as f:
            f.write(f"Gemini API Error (All keys failed). Last error: {last_error}\n")
        return "explanation currently unavailable due to technical connection."
        
    except Exception as e:
        print(f"[Gemini] Outer error generating explanation: {e}")
        return "explanation currently unavailable due to technical connection."



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
