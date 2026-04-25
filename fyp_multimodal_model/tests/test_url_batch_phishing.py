"""
Phase 1.3 — Batch Test Phishing URLs (URL Model Only)
Loads phishing URLs from the xlsx, checks liveness, and tests URL model detection.
No live fetching — pure URL feature extraction + prediction.

Run:
  cd fyp_multimodal_model
  python -m tests.test_url_batch_phishing [--sample 500] [--skip-liveness]
"""

import sys, os, json, argparse, random, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import joblib
from url_feature_extractor import extract_url_features_from_string

# -- Path to phishing links ---------------------------------------------------
PHISHING_XLSX_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "phising links.xlsx",
)


def load_phishing_urls(path, max_urls=None):
    """Load phishing URLs from xlsx file (Column A, skip header rows)."""
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    urls = []
    for i, row in enumerate(ws.iter_rows(min_row=1, max_col=1, values_only=True)):
        val = row[0]
        if val and isinstance(val, str) and val.startswith("http"):
            urls.append(val.strip())
    wb.close()
    if max_urls and len(urls) > max_urls:
        random.seed(42)
        urls = random.sample(urls, max_urls)
    return urls


def check_liveness_batch(urls, timeout=3, max_workers=20):
    """Check liveness of URLs in parallel using ThreadPool."""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    from url_utils import is_url_alive

    live = []
    dead = []

    print(f"  Checking liveness of {len(urls)} URLs (timeout={timeout}s)...")
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(is_url_alive, url, timeout): url for url in urls}
        done = 0
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            done += 1
            try:
                if future.result():
                    live.append(url)
                else:
                    dead.append(url)
            except Exception:
                dead.append(url)
            if done % 100 == 0:
                print(f"    [{done}/{len(urls)}] checked... ({len(live)} live so far)")

    print(f"  Liveness check complete: {len(live)} live, {len(dead)} dead")
    return live, dead


def load_url_model(models_dir="models"):
    path = os.path.join(models_dir, "url_lgbm_production.joblib")
    data = joblib.load(path)
    return data["model"], data["scaler"], data["feature_names"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=500, help="Number of URLs to sample from xlsx")
    parser.add_argument("--skip-liveness", action="store_true", help="Skip liveness check (test all URLs)")
    args = parser.parse_args()

    print("=" * 70)
    print("PHASE 1.3 - BATCH TEST PHISHING URLs (URL MODEL ONLY)")
    print("=" * 70)

    # Load model
    model, scaler, feature_names = load_url_model()

    # Load phishing URLs
    all_phishing = load_phishing_urls(PHISHING_XLSX_PATH, max_urls=args.sample)
    print(f"Loaded {len(all_phishing)} phishing URLs (sampled from xlsx)\n")

    # Liveness check
    if args.skip_liveness:
        test_urls = all_phishing
        dead_count = 0
        print("  Skipping liveness check (--skip-liveness flag)")
    else:
        test_urls, dead_urls = check_liveness_batch(all_phishing)
        dead_count = len(dead_urls)

    if not test_urls:
        print("  [WARN]  No live phishing URLs found! Cannot test.")
        return False

    print(f"\n  Testing {len(test_urls)} URLs...")

    results = []
    false_negatives = []  # Phishing URLs misclassified as benign

    for i, url in enumerate(test_urls):
        try:
            features = extract_url_features_from_string(url, feature_names)
            X = np.array(features).reshape(1, -1)
            X_scaled = scaler.transform(X)
            proba = model.predict_proba(X_scaled)[0]
            pred = "PHISHING" if proba[1] > 0.5 else "BENIGN"
            p_phish = float(proba[1])

            result = {"url": url, "prediction": pred, "p_phishing": p_phish}
            results.append(result)

            if pred == "BENIGN":
                false_negatives.append(result)
                if len(false_negatives) <= 20:  # Print first 20 FNs
                    print(f"  [FP] FN [{i+1:3d}] {url[:55]:<55s}  P={p_phish:.4f}")
            else:
                if (i + 1) % 100 == 0:
                    print(f"  [OK] [{i+1:3d}/{len(test_urls)}] processed...")
        except Exception as e:
            results.append({"url": url, "prediction": "ERROR", "error": str(e)})

    # -- Summary ---------------------------------------------------------------
    total = len(results)
    errors = sum(1 for r in results if r["prediction"] == "ERROR")
    valid = total - errors
    tp = sum(1 for r in results if r["prediction"] == "PHISHING")
    fn_count = len(false_negatives)
    fnr = fn_count / valid * 100 if valid > 0 else 0
    detection_rate = tp / valid * 100 if valid > 0 else 0

    print(f"\n{'='*70}")
    print(f"RESULTS SUMMARY")
    print(f"{'='*70}")
    print(f"  Total sampled:       {len(all_phishing)}")
    print(f"  Dead links:          {dead_count}")
    print(f"  Tested (live):       {total}")
    print(f"  Errors:              {errors}")
    print(f"  Valid predictions:   {valid}")
    print(f"  Detected (PHISHING): {tp}")
    print(f"  Missed (BENIGN):     {fn_count}")
    print(f"  Detection Rate:      {detection_rate:.2f}%")
    print(f"  FNR:                 {fnr:.2f}%")
    print(f"  Pass Criteria:       FNR <= 5.0%")
    passed = fnr <= 5.0
    print(f"  Status:              {'[OK] PASSED' if passed else '[FP] FAILED'}")

    if false_negatives:
        print(f"\n  False Negative URLs (top 20 by confidence):")
        false_negatives.sort(key=lambda x: x["p_phishing"])
        for fn in false_negatives[:20]:
            print(f"    P={fn['p_phishing']:.4f}  {fn['url'][:65]}")

    # -- TLD breakdown ---------------------------------------------------------
    from collections import Counter
    try:
        import tldextract
        tld_counter_tp = Counter()
        tld_counter_fn = Counter()
        for r in results:
            if r["prediction"] == "ERROR":
                continue
            ext = tldextract.extract(r["url"])
            tld = ext.suffix if ext.suffix else "unknown"
            if r["prediction"] == "PHISHING":
                tld_counter_tp[tld] += 1
            else:
                tld_counter_fn[tld] += 1

        print(f"\n  TLD Detection Breakdown (top 10 by miss rate):")
        all_tlds = set(tld_counter_tp.keys()) | set(tld_counter_fn.keys())
        tld_stats = []
        for tld in all_tlds:
            tp_c = tld_counter_tp.get(tld, 0)
            fn_c = tld_counter_fn.get(tld, 0)
            total_c = tp_c + fn_c
            miss = fn_c / total_c * 100 if total_c > 0 else 0
            tld_stats.append((tld, tp_c, fn_c, total_c, miss))
        tld_stats.sort(key=lambda x: x[4], reverse=True)
        for tld, tp_c, fn_c, total_c, miss in tld_stats[:10]:
            marker = "[FP]" if miss > 10 else "[OK]"
            print(f"    {marker} .{tld:<10s}: {fn_c}/{total_c} missed  ({miss:.1f}% FNR)")
    except ImportError:
        print("  (tldextract not available for TLD breakdown)")

    # Save results
    os.makedirs("tests/results", exist_ok=True)
    output = {
        "total_sampled": len(all_phishing),
        "dead_links": dead_count,
        "tested": total,
        "valid": valid,
        "detected": tp,
        "missed": fn_count,
        "detection_rate_percent": detection_rate,
        "fnr_percent": fnr,
        "passed": passed,
        "false_negatives": false_negatives[:50],  # Save top 50 FNs
        "all_results": results,
    }
    output_path = "tests/results/url_batch_phishing.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved to {output_path}")
    print("=" * 70)

    return passed


if __name__ == "__main__":
    passed = main()
    sys.exit(0 if passed else 1)
