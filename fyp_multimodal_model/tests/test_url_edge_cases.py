"""
Phase 1.1 — URL Model Edge Case Diagnosis
Diagnoses false positives on known-benign URLs using feature extraction + SHAP.
Specifically targets the Bahria CMS URLs and other Pakistani .edu.pk / .gov.pk sites.

Run:
  cd fyp_multimodal_model
  python -m tests.test_url_edge_cases
"""

import sys, os, json, warnings
warnings.filterwarnings("ignore")

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import joblib
import shap
from url_feature_extractor import extract_url_features_dict, extract_url_features_from_string

# ── URLs that are known to be BENIGN but may trigger false positives ─────────
PROBLEM_URLS = [
    "https://cms.bahria.edu.pk/Logins/Student/Login.aspx",
    "https://cms.bahria.edu.pk/Default.aspx",
]

EDU_GOV_URLS = [
    "https://vulms.vu.edu.pk",
    "https://lms.nust.edu.pk",
    "https://bahria.edu.pk",
    "https://e.fbr.gov.pk",
    "https://id.nadra.gov.pk",
    "https://e-portal.hec.gov.pk",
    "https://nadra.gov.pk",
    "https://hec.gov.pk",
    "https://fbise.edu.pk",
    "https://aiou.edu.pk",
]

LOGIN_SUBPATH_URLS = [
    "https://www.facebook.com/login",
    "https://www.instagram.com/accounts/login",
    "https://daraz.pk/customer/account/login",
    "https://fiverr.com/login",
    "https://linkedin.com/login",
    "https://discord.com/login",
    "https://zoom.us/signin",
    "https://netflix.com/login",
    "https://spotify.com/pk-en/login",
]

KNOWN_BENIGN_REFERENCE = [
    "https://www.google.com",
    "https://www.github.com",
    "https://www.wikipedia.org",
]


def load_url_model(models_dir="models"):
    """Load the production URL model."""
    path = os.path.join(models_dir, "url_lgbm_production.joblib")
    data = joblib.load(path)
    return data["model"], data["scaler"], data["feature_names"]


def diagnose_url(url, model, scaler, feature_names):
    """Extract features, predict, and get SHAP values for a single URL."""
    features = extract_url_features_from_string(url, feature_names)
    X = np.array(features).reshape(1, -1)
    X_scaled = scaler.transform(X)
    proba = model.predict_proba(X_scaled)[0]
    pred = "PHISHING" if proba[1] > 0.5 else "BENIGN"

    # SHAP
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_scaled)
    if isinstance(shap_values, list):
        shap_vals = shap_values[1][0]
    else:
        shap_vals = shap_values[0]

    feature_dict = dict(zip(feature_names, features))
    shap_dict = dict(zip(feature_names, shap_vals.tolist()))

    return {
        "url": url,
        "prediction": pred,
        "p_phishing": float(proba[1]),
        "p_benign": float(proba[0]),
        "features": feature_dict,
        "shap_values": shap_dict,
    }


def print_diagnosis(result):
    """Pretty-print a diagnosis result."""
    url = result["url"]
    pred = result["prediction"]
    p = result["p_phishing"]

    marker = "[OK]" if pred == "BENIGN" else "[FP] FALSE POSITIVE"
    print(f"\n{'-'*70}")
    print(f"  {marker} {url}")
    print(f"  Prediction: {pred}  |  P(phishing) = {p:.4f}")
    print(f"  {'Feature':<22s} {'Value':>10s}  {'SHAP':>10s}  Direction")
    print(f"  {'-'*60}")

    # Sort by absolute SHAP impact
    sorted_feats = sorted(
        result["shap_values"].items(), key=lambda x: abs(x[1]), reverse=True
    )
    for feat, shap_val in sorted_feats:
        val = result["features"].get(feat, 0)
        direction = ">> PHISHING" if shap_val > 0 else ">> BENIGN"
        print(f"  {feat:<22s} {val:>10.4f}  {shap_val:>+10.4f}  {direction}")


def main():
    print("=" * 70)
    print("PHASE 1.1 - URL MODEL EDGE CASE DIAGNOSIS")
    print("=" * 70)

    model, scaler, feature_names = load_url_model()
    print(f"Model loaded. Features: {feature_names}")

    all_results = []
    false_positives = []

    # ── Section 1: Known problem URLs ─────────────────────────────────────────
    print("\n\n> SECTION 1: KNOWN PROBLEM URLs (Bahria CMS)")
    for url in PROBLEM_URLS:
        result = diagnose_url(url, model, scaler, feature_names)
        print_diagnosis(result)
        all_results.append(result)
        if result["prediction"] == "PHISHING":
            false_positives.append(result)

    # ── Section 2: .edu.pk / .gov.pk sites ────────────────────────────────────
    print("\n\n> SECTION 2: EDU / GOV SITES")
    for url in EDU_GOV_URLS:
        result = diagnose_url(url, model, scaler, feature_names)
        print_diagnosis(result)
        all_results.append(result)
        if result["prediction"] == "PHISHING":
            false_positives.append(result)

    # ── Section 3: Login subpath URLs ─────────────────────────────────────────
    print("\n\n> SECTION 3: LOGIN SUBPATH URLs (legitimate with /login paths)")
    for url in LOGIN_SUBPATH_URLS:
        result = diagnose_url(url, model, scaler, feature_names)
        print_diagnosis(result)
        all_results.append(result)
        if result["prediction"] == "PHISHING":
            false_positives.append(result)

    # ── Section 4: Known-benign reference ─────────────────────────────────────
    print("\n\n> SECTION 4: KNOWN-BENIGN REFERENCE")
    for url in KNOWN_BENIGN_REFERENCE:
        result = diagnose_url(url, model, scaler, feature_names)
        print_diagnosis(result)
        all_results.append(result)
        if result["prediction"] == "PHISHING":
            false_positives.append(result)

    # ── Summary ───────────────────────────────────────────────────────────────
    total = len(all_results)
    fp_count = len(false_positives)
    print(f"\n\n{'='*70}")
    print(f"SUMMARY")
    print(f"{'='*70}")
    print(f"  Total URLs tested:   {total}")
    print(f"  Correctly BENIGN:    {total - fp_count}")
    print(f"  FALSE POSITIVES:     {fp_count}")
    print(f"  FPR:                 {fp_count/total*100:.1f}%")
    print(f"{'='*70}")

    if false_positives:
        print(f"\n  [FP] FALSE POSITIVE URLs:")
        for fp in false_positives:
            print(f"     - {fp['url']}  (P={fp['p_phishing']:.4f})")

        # Aggregate SHAP analysis: which features drive FPs most?
        print(f"\n  TOP FEATURES DRIVING FALSE POSITIVES (avg |SHAP|):")
        from collections import defaultdict
        feat_impacts = defaultdict(list)
        for fp in false_positives:
            for feat, shap_val in fp["shap_values"].items():
                if shap_val > 0:  # Only features pushing toward phishing
                    feat_impacts[feat].append(shap_val)

        avg_impacts = {
            feat: sum(vals) / len(vals) for feat, vals in feat_impacts.items()
        }
        for feat, avg in sorted(avg_impacts.items(), key=lambda x: x[1], reverse=True)[:5]:
            print(f"     {feat:<22s}  avg SHAP = {avg:+.4f}")

    # Save results
    os.makedirs("tests/results", exist_ok=True)
    output_path = "tests/results/url_edge_cases.json"
    with open(output_path, "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\n  Results saved to {output_path}")
    print("=" * 70)

    return false_positives


if __name__ == "__main__":
    fps = main()
    sys.exit(1 if fps else 0)
