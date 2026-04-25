"""
Phase 4.3 — Full Pipeline Test on ~20 Live Phishing URLs

Run:
  cd fyp_multimodal_model
  python -m tests.test_fusion_batch_phishing [--count 20] [--timeout 15]
"""

import sys, os, json, time, argparse, random, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from inference_complete import predict_complete_pipeline
from url_utils import is_url_alive

PHISHING_XLSX_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "phising links.xlsx",
)


def load_phishing_urls(path, max_urls=200):
    import openpyxl
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.active
    urls = []
    for row in ws.iter_rows(min_row=1, max_col=1, values_only=True):
        val = row[0]
        if val and isinstance(val, str) and val.startswith("http"):
            urls.append(val.strip())
    wb.close()
    if len(urls) > max_urls:
        random.seed(42)
        urls = random.sample(urls, max_urls)
    return urls


def find_live_phishing_urls(urls, target_count=20, timeout=3):
    from concurrent.futures import ThreadPoolExecutor, as_completed
    live = []
    checked = 0
    print(f"  Scanning for {target_count} live phishing URLs...")
    with ThreadPoolExecutor(max_workers=15) as executor:
        future_to_url = {executor.submit(is_url_alive, url, timeout): url for url in urls}
        for future in as_completed(future_to_url):
            url = future_to_url[future]
            checked += 1
            try:
                if future.result():
                    live.append(url)
                    print(f"    [{len(live)}/{target_count}] Live: {url[:60]}")
                    if len(live) >= target_count:
                        for f in future_to_url:
                            f.cancel()
                        break
            except Exception:
                pass
    print(f"  Found {len(live)} live phishing URLs (checked {checked})")
    return live


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--timeout", type=int, default=15)
    parser.add_argument("--scan-pool", type=int, default=200)
    args = parser.parse_args()

    print("=" * 70)
    print("PHASE 4.3 — FULL PIPELINE TEST ON LIVE PHISHING URLs")
    print("=" * 70)

    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"

    all_phishing = load_phishing_urls(PHISHING_XLSX_PATH, max_urls=args.scan_pool)
    print(f"Loaded {len(all_phishing)} phishing URLs")
    live_urls = find_live_phishing_urls(all_phishing, target_count=args.count)

    if not live_urls:
        print("  No live phishing URLs found!")
        return False

    results, false_negatives, errors = [], [], []

    for i, url in enumerate(live_urls):
        print(f"\n[{i+1}/{len(live_urls)}] Testing: {url}")
        try:
            result = predict_complete_pipeline(url=url, models_dir="models",
                                               fetch_timeout=args.timeout, device=device)
            pred = result.get("prediction", "ERROR")
            scores = result.get("modality_scores", {})
            mods = sum(result.get("modality_available", {}).values())
            summary = {
                "url": url, "prediction": pred,
                "confidence": result.get("confidence", 0),
                "fusion_p_phishing": result.get("fusion_probability_phishing", 0),
                "modalities_used": mods,
                "url_score": scores.get("url"),
                "dom_score": scores.get("dom"),
                "visual_score": scores.get("visual"),
                "fetch_success": result.get("page_info", {}).get("fetch_success", False),
            }
            results.append(summary)
            if pred == "BENIGN":
                false_negatives.append(summary)
                print(f"  [FP] MISSED — P={summary['fusion_p_phishing']:.4f}")
            else:
                print(f"  [OK] DETECTED — P={summary['fusion_p_phishing']:.4f} [{mods}/3]")
        except Exception as e:
            errors.append({"url": url, "error": str(e)})
            results.append({"url": url, "prediction": "ERROR", "error": str(e)})
        if i < len(live_urls) - 1:
            time.sleep(2)

    # Summary
    total = len(results)
    err_count = len(errors)
    valid = total - err_count
    tp = sum(1 for r in results if r["prediction"] == "PHISHING")
    fn_count = len(false_negatives)
    fnr = fn_count / valid * 100 if valid > 0 else 0
    det_rate = tp / valid * 100 if valid > 0 else 0

    print(f"\n{'='*70}")
    print(f"FUSION PHISHING — RESULTS")
    print(f"{'='*70}")
    print(f"  Tested: {total}  Valid: {valid}  Detected: {tp}  Missed: {fn_count}")
    print(f"  Detection Rate: {det_rate:.2f}%  |  FNR: {fnr:.2f}%")
    passed = fnr <= 3.0
    print(f"  Pass (FNR <= 3%): {'[OK] PASSED' if passed else '[FP] FAILED'}")

    if false_negatives:
        print(f"\n  [FP] False Negatives:")
        for fn in false_negatives:
            print(f"    P={fn['fusion_p_phishing']:.4f}  {fn['url'][:60]}")

    os.makedirs("tests/results", exist_ok=True)
    output = {
        "total": total, "valid": valid, "detected": tp, "missed": fn_count,
        "detection_rate_percent": det_rate, "fnr_percent": fnr, "passed": passed,
        "false_negatives": false_negatives, "all_results": results,
    }
    with open("tests/results/fusion_batch_phishing.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"  Results saved to tests/results/fusion_batch_phishing.json")
    return passed


if __name__ == "__main__":
    passed = main()
    sys.exit(0 if passed else 1)
