"""
Phase 4.2 — Full Pipeline Test on ~30 Live Benign URLs
Runs the complete multimodal pipeline (URL + DOM + Visual >> Fusion) on
a diverse subset of benign Pakistani URLs.

Run:
  cd fyp_multimodal_model
  python -m tests.test_fusion_batch_benign [--count 30] [--timeout 20]
"""

import sys, os, json, re, time, argparse, random, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from inference_complete import predict_complete_pipeline

# -- Path to benign URL list --------------------------------------------------
BENIGN_LIST_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "pakistan_top_sites.md",
)

# -- Diverse hand-picked subset covering all categories ------------------------
# We pick ~30 URLs from different categories for maximum coverage.
DIVERSE_BENIGN_URLS = [
    # Global & Tech
    "https://www.google.com",
    "https://github.com",
    "https://www.wikipedia.org",
    # Pakistani E-Commerce
    "https://www.daraz.pk",
    "https://priceoye.pk",
    "https://www.olx.com.pk",
    # News
    "https://www.dawn.com",
    "https://www.geo.tv",
    # Government
    "https://nadra.gov.pk",
    "https://hec.gov.pk",
    "https://fbr.gov.pk",
    # Education (the problem category)
    "https://bahria.edu.pk",
    "https://cms.bahria.edu.pk/Logins/Student/Login.aspx",
    "https://vu.edu.pk",
    "https://nust.edu.pk",
    # Banking & Finance
    "https://www.hbl.com",
    "https://www.meezanbank.com",
    "https://easypaisa.com.pk",
    # Social Media
    "https://www.facebook.com",
    "https://www.instagram.com",
    "https://www.linkedin.com",
    # Login pages (legitimate)
    "https://www.facebook.com/login",
    "https://discord.com/login",
    "https://netflix.com/login",
    # Tech Portals
    "https://portal.azure.com",
    "https://icloud.com",
    # Food & Travel
    "https://foodpanda.pk",
    "https://www.bookme.pk",
    # Utilities
    "https://www.ptcl.com.pk",
    "https://www.ke.com.pk",
]


def load_all_benign_urls(path):
    """Parse all benign URLs from the flat list."""
    urls = []
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    code_block_match = re.search(r"```\n(.*?)```", content, re.DOTALL)
    if code_block_match:
        lines = code_block_match.group(1).strip().split("\n")
        for line in lines:
            line = line.strip()
            if line and not line.startswith("#"):
                if not line.startswith("http"):
                    line = "https://" + line
                urls.append(line)
    return urls


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=30, help="Number of URLs to test")
    parser.add_argument("--timeout", type=int, default=20, help="Page fetch timeout")
    parser.add_argument("--random", action="store_true", help="Use random sample instead of hand-picked")
    args = parser.parse_args()

    print("=" * 70)
    print("PHASE 4.2 — FULL PIPELINE TEST ON LIVE BENIGN URLs")
    print("=" * 70)

    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"

    # Select URLs
    if args.random:
        all_urls = load_all_benign_urls(BENIGN_LIST_PATH)
        random.seed(42)
        test_urls = random.sample(all_urls, min(args.count, len(all_urls)))
        print(f"Using random sample of {len(test_urls)} URLs")
    else:
        test_urls = DIVERSE_BENIGN_URLS[:args.count]
        print(f"Using hand-picked diverse set of {len(test_urls)} URLs")

    results = []
    false_positives = []
    errors = []

    for i, url in enumerate(test_urls):
        print(f"\n[{i+1}/{len(test_urls)}] Testing: {url}")
        print("-" * 50)

        try:
            result = predict_complete_pipeline(
                url=url,
                models_dir="models",
                fetch_timeout=args.timeout,
                device=device,
            )

            # Extract key info
            pred = result.get("prediction", "ERROR")
            conf = result.get("confidence", 0)
            modalities_used = sum(result.get("modality_available", {}).values())
            scores = result.get("modality_scores", {})

            summary = {
                "url": url,
                "prediction": pred,
                "confidence": conf,
                "fusion_p_phishing": result.get("fusion_probability_phishing", 0),
                "modalities_used": modalities_used,
                "url_score": scores.get("url"),
                "dom_score": scores.get("dom"),
                "visual_score": scores.get("visual"),
                "fetch_success": result.get("page_info", {}).get("fetch_success", False),
            }
            results.append(summary)

            if pred == "PHISHING":
                false_positives.append(summary)
                print(f"  [FP] FALSE POSITIVE — P(phish)={summary['fusion_p_phishing']:.4f}")
            else:
                print(f"  [OK] BENIGN — P(phish)={summary['fusion_p_phishing']:.4f} [{modalities_used}/3 modalities]")

        except Exception as e:
            print(f"  [WARN]  ERROR: {e}")
            errors.append({"url": url, "error": str(e)})
            results.append({"url": url, "prediction": "ERROR", "error": str(e)})

        # Brief delay between tests
        if i < len(test_urls) - 1:
            time.sleep(2)

    # -- Summary ---------------------------------------------------------------
    total = len(results)
    err_count = len(errors)
    valid = total - err_count
    fp_count = len(false_positives)
    benign_correct = sum(1 for r in results if r["prediction"] == "BENIGN")
    fpr = fp_count / valid * 100 if valid > 0 else 0

    # Modality usage stats
    dom_available = sum(1 for r in results if r.get("dom_score") is not None)
    visual_available = sum(1 for r in results if r.get("visual_score") is not None)
    fetch_success = sum(1 for r in results if r.get("fetch_success", False))

    print(f"\n{'='*70}")
    print(f"FUSION BATCH BENIGN — RESULTS")
    print(f"{'='*70}")
    print(f"  Total URLs:          {total}")
    print(f"  Errors:              {err_count}")
    print(f"  Valid predictions:   {valid}")
    print(f"  Correct (BENIGN):    {benign_correct}")
    print(f"  FALSE POSITIVES:     {fp_count}")
    print(f"  FPR:                 {fpr:.2f}%")
    print(f"  Pass Criteria:       FPR <= 1.0%")
    passed = fpr <= 1.0
    print(f"  Status:              {'[OK] PASSED' if passed else '[FP] FAILED'}")

    print(f"\n  Modality Coverage:")
    print(f"    Page fetch success: {fetch_success}/{total}")
    print(f"    DOM available:      {dom_available}/{total}")
    print(f"    Visual available:   {visual_available}/{total}")

    if false_positives:
        print(f"\n  [FP] False Positive Details:")
        for fp in false_positives:
            print(f"    {fp['url']}")
            print(f"      Fusion P={fp['fusion_p_phishing']:.4f}  "
                  f"URL={fp.get('url_score', 'N/A')}  "
                  f"DOM={fp.get('dom_score', 'N/A')}  "
                  f"Visual={fp.get('visual_score', 'N/A')}")

    # Save results
    os.makedirs("tests/results", exist_ok=True)
    output = {
        "total": total,
        "valid": valid,
        "errors": err_count,
        "false_positives_count": fp_count,
        "fpr_percent": fpr,
        "passed": passed,
        "modality_coverage": {
            "fetch_success": fetch_success,
            "dom_available": dom_available,
            "visual_available": visual_available,
        },
        "false_positives": false_positives,
        "all_results": results,
    }
    output_path = "tests/results/fusion_batch_benign.json"
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved to {output_path}")
    print("=" * 70)

    return passed


if __name__ == "__main__":
    passed = main()
    sys.exit(0 if passed else 1)
