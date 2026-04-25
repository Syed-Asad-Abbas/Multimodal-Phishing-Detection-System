"""
Phase 3.2 - Visual Live Site Testing on Pakistani Benign Sites
Fetches 15 live benign URLs, captures screenshots, runs visual model prediction.

Run:
  cd fyp_multimodal_model
  python -m tests.test_visual_live_sites
"""

import sys, os, json, time, warnings
warnings.filterwarnings("ignore")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import torch.nn as nn
from torchvision import transforms, models as torch_models
from PIL import Image
from webpage_fetcher import SafeWebpageFetcher

LIVE_BENIGN_URLS = [
    "https://www.google.com",
    "https://github.com",
    "https://www.daraz.pk",
    "https://www.dawn.com",
    "https://nadra.gov.pk",
    "https://bahria.edu.pk",
    "https://nust.edu.pk",
    "https://www.hbl.com",
    "https://www.facebook.com",
    "https://www.instagram.com",
    "https://foodpanda.pk",
    "https://www.ptcl.com.pk",
    "https://icloud.com",
    "https://www.geo.tv",
    "https://easypaisa.com.pk",
]


def load_visual_model(models_dir="models", device="cpu"):
    model = torch_models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(torch.load(
        os.path.join(models_dir, "visual_resnet50.pt"), map_location=device
    ))
    model = model.to(device)
    model.eval()
    return model


def predict_visual(screenshot_path, model, device):
    transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(224),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    img = Image.open(screenshot_path).convert("RGB")
    tensor = transform(img).unsqueeze(0).to(device)
    with torch.no_grad():
        out = model(tensor)
        probs = torch.softmax(out, dim=1)[0]
    return probs[1].item()  # P(phishing)


def main():
    print("=" * 70)
    print("PHASE 3.2 - VISUAL LIVE SITE TESTING (15 BENIGN URLs)")
    print("=" * 70)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device: {device}")
    visual_model = load_visual_model(device=device)
    print(f"Visual model loaded.\n")

    fetcher = SafeWebpageFetcher(timeout=20, headless=True)
    results = []
    false_positives = []

    for i, url in enumerate(LIVE_BENIGN_URLS):
        print(f"\n[{i+1}/{len(LIVE_BENIGN_URLS)}] {url}")
        result = {"url": url, "prediction": "ERROR", "p_phishing": None}

        try:
            page = fetcher.fetch_page(url)

            if not page["success"] or not page.get("screenshot_path"):
                reason = page.get("error", "no_screenshot")
                print(f"  [SKIP] {reason[:60]}")
                result["prediction"] = "SKIP"
                result["skip_reason"] = reason
                results.append(result)
                continue

            screenshot = page["screenshot_path"]
            p_phish = predict_visual(screenshot, visual_model, device)
            pred = "PHISHING" if p_phish > 0.5 else "BENIGN"

            result.update({
                "prediction": pred,
                "p_phishing": float(p_phish),
                "screenshot_path": screenshot,
                "page_title": page.get("page_title", ""),
            })
            results.append(result)

            marker = "[OK]" if pred == "BENIGN" else "[FP]"
            title = page.get("page_title", "")[:40]
            print(f"  {marker} {pred}  P(phishing)={p_phish:.4f}  title={title}")
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
    print(f"  Pass Criteria:    FPR <= 15.0%  (visual model baseline: 12.62%)")
    passed = fpr <= 15.0
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
    with open("tests/results/visual_live_sites.json", "w") as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved to tests/results/visual_live_sites.json")
    print("=" * 70)
    return passed


if __name__ == "__main__":
    passed = main()
    sys.exit(0 if passed else 1)
