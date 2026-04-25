"""
Phase 2.2 - DOM Live Site Testing on Pakistani Benign Sites
Fetches 20 live benign URLs, extracts DOM features, runs DOM model prediction.

Run:
  cd fyp_multimodal_model
  python -m tests.test_dom_live_sites
"""

import sys, os, json, time, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import joblib
from webpage_fetcher import SafeWebpageFetcher
from inference_pipeline import is_interstitial_page
from utils import build_dom_tokens

LIVE_BENIGN_URLS = [
    "https://www.google.com",
    "https://github.com",
    "https://www.daraz.pk",
    "https://priceoye.pk",
    "https://www.dawn.com",
    "https://www.geo.tv",
    "https://nadra.gov.pk",
    "https://hec.gov.pk",
    "https://bahria.edu.pk",
    "https://nust.edu.pk",
    "https://vu.edu.pk",
    "https://www.hbl.com",
    "https://easypaisa.com.pk",
    "https://www.facebook.com",
    "https://www.instagram.com",
    "https://foodpanda.pk",
    "https://www.bookme.pk",
    "https://www.ptcl.com.pk",
    "https://jazz.com.pk",
    "https://icloud.com",
]


def load_dom_model(models_dir="models"):
    data = joblib.load(os.path.join(models_dir, "dom_doc2vec_lgbm.joblib"))
    return data["doc2vec"], data["model"]


def predict_dom(dom_features_dict, doc2vec, dom_model):
    tokens = build_dom_tokens(dom_features_dict)
    embedding = doc2vec.infer_vector(tokens)
    proba = dom_model.predict_proba([embedding])[0]
    return 1.0 - proba[1]  # proba[1]=P(benign) in PhiUSIIL labels, invert


def main():
    print("=" * 70)
    print("PHASE 2.2 - DOM LIVE SITE TESTING (20 BENIGN URLs)")
    print("=" * 70)

    doc2vec, dom_model = load_dom_model()
    print(f"DOM model loaded.\n")

    fetcher = SafeWebpageFetcher(timeout=20, headless=True)
    results = []
    false_positives = []

    for i, url in enumerate(LIVE_BENIGN_URLS):
        print(f"\n[{i+1}/{len(LIVE_BENIGN_URLS)}] {url}")
        result = {"url": url, "prediction": "ERROR", "p_phishing": None}

        try:
            page = fetcher.fetch_page(url)

            if not page["success"]:
                print(f"  [SKIP] Fetch failed: {page.get('error', '?')[:60]}")
                result["prediction"] = "SKIP"
                result["skip_reason"] = page.get("error", "fetch_failed")
                results.append(result)
                continue

            html = page["html"]

            if is_interstitial_page(html):
                print(f"  [SKIP] CAPTCHA/interstitial detected")
                result["prediction"] = "SKIP"
                result["skip_reason"] = "captcha"
                results.append(result)
                continue

            dom_features = fetcher.extract_dom_features(html)
            p_phish = predict_dom(dom_features, doc2vec, dom_model)
            pred = "PHISHING" if p_phish > 0.5 else "BENIGN"

            result.update({
                "prediction": pred,
                "p_phishing": float(p_phish),
                "dom_features": dom_features,
                "page_title": page.get("page_title", ""),
            })
            results.append(result)

            marker = "[OK]" if pred == "BENIGN" else "[FP]"
            print(f"  {marker} {pred}  P(phishing)={p_phish:.4f}  "
                  f"forms={dom_features.get('NoOfForm',0)}  "
                  f"pw={dom_features.get('HasPasswordField',0)}")
            if pred == "PHISHING":
                false_positives.append(result)

        except Exception as e:
            print(f"  [ERR] {e}")
            result["error"] = str(e)
            results.append(result)

        time.sleep(1)

    total = len(results)
    skipped = sum(1 for r in results if r["prediction"] in ("SKIP", "ERROR"))
    valid = total - skipped
    fp_count = len(false_positives)
    fpr = fp_count / valid * 100 if valid > 0 else 0

    print(f"\n{'='*70}")
    print(f"RESULTS SUMMARY")
    print(f"{'='*70}")
    print(f"  Total URLs:       {total}")
    print(f"  Skipped/Errors:   {skipped}")
    print(f"  Valid:            {valid}")
    print(f"  Correct (BENIGN): {valid - fp_count}")
    print(f"  FALSE POSITIVES:  {fp_count}")
    print(f"  FPR:              {fpr:.2f}%")
    print(f"  Pass Criteria:    FPR <= 5.0%")
    passed = fpr <= 5.0
    print(f"  Status:           {'[OK] PASSED' if passed else '[FP] FAILED'}")

    if false_positives:
        print(f"\n  False Positive URLs:")
        for fp in false_positives:
            print(f"    {fp['url']}  P={fp['p_phishing']:.4f}")

    os.makedirs("tests/results", exist_ok=True)
    output = {
        "total": total, "skipped": skipped, "valid": valid,
        "false_positives_count": fp_count, "fpr_percent": fpr, "passed": passed,
        "false_positives": false_positives, "all_results": results,
    }
    with open("tests/results/dom_live_sites.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved to tests/results/dom_live_sites.json")
    print("=" * 70)
    return passed


if __name__ == "__main__":
    passed = main()
    sys.exit(0 if passed else 1)
