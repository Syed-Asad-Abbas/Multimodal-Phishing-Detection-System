"""
Phase 4.4 — Generate Comprehensive Test Report
Aggregates results from all test phases into a markdown report.

Run:
  cd fyp_multimodal_model
  python -m tests.generate_test_report
"""

import sys, os, json, datetime

RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "results")
REPORT_PATH = os.path.join(RESULTS_DIR, "edge_case_report.md")


def load_json(filename):
    path = os.path.join(RESULTS_DIR, filename)
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)


def main():
    print("=" * 70)
    print("PHASE 4.4 - GENERATING COMPREHENSIVE TEST REPORT")
    print("=" * 70)

    url_edge = load_json("url_edge_cases.json")
    url_benign = load_json("url_batch_benign.json")
    url_phishing = load_json("url_batch_phishing.json")
    dom_live = load_json("dom_live_sites.json")
    visual_live = load_json("visual_live_sites.json")
    fusion_benign = load_json("fusion_batch_benign.json")
    fusion_phishing = load_json("fusion_batch_phishing.json")

    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")

    lines = []
    lines.append(f"# Multimodal Phishing Detection — Edge Case Test Report")
    lines.append(f"**Generated:** {now}\n")
    lines.append("---\n")

    # -- Model Baseline --------------------------------------------------------
    lines.append("## Model Baseline (Training Metrics)\n")
    lines.append("| Modality | Accuracy | FPR | FNR | ROC-AUC |")
    lines.append("|----------|----------|-----|-----|---------|")

    try:
        um = json.load(open("models/url_metrics_production.json"))
        lines.append(f"| URL | {um['accuracy']*100:.2f}% | {um['FPR']*100:.2f}% | {um['FNR']*100:.2f}% | {um['ROC_AUC']:.4f} |")
    except:
        lines.append("| URL | — | — | — | — |")
    try:
        dm = json.load(open("models/dom_metrics.json"))
        lines.append(f"| DOM | {dm['accuracy']*100:.2f}% | — | — | — |")
    except:
        lines.append("| DOM | — | — | — | — |")
    try:
        vm = json.load(open("models/visual_metrics.json"))
        lines.append(f"| Visual | {vm['accuracy']*100:.2f}% | {vm['FPR']*100:.2f}% | {vm['FNR']*100:.2f}% | {vm['ROC_AUC']:.4f} |")
    except:
        lines.append("| Visual | — | — | — | — |")
    try:
        fm = json.load(open("models/fusion_metrics.json"))
        lines.append(f"| **Fusion** | **{fm['accuracy']*100:.2f}%** | **{fm['FPR']*100:.2f}%** | **{fm['FNR']*100:.2f}%** | **{fm['ROC_AUC']:.4f}** |")
    except:
        lines.append("| Fusion | — | — | — | — |")
    lines.append("")

    # -- Phase 1.1: URL Edge Cases ---------------------------------------------
    lines.append("---\n## Phase 1.1 — URL Model Edge Case Diagnosis\n")
    if url_edge:
        fp_list = [r for r in url_edge if r["prediction"] == "PHISHING"]
        bn_list = [r for r in url_edge if r["prediction"] == "BENIGN"]
        lines.append(f"- **Tested:** {len(url_edge)} targeted URLs")
        lines.append(f"- **Correct (BENIGN):** {len(bn_list)}")
        lines.append(f"- **False Positives:** {len(fp_list)}\n")
        if fp_list:
            lines.append("| URL | P(phishing) | Top SHAP Driver |")
            lines.append("|-----|-------------|-----------------|")
            for fp in fp_list:
                top_feat = max(fp["shap_values"].items(), key=lambda x: x[1])
                lines.append(f"| `{fp['url'][:55]}` | {fp['p_phishing']:.4f} | {top_feat[0]} ({top_feat[1]:+.4f}) |")
            lines.append("")
    else:
        lines.append("*Test not yet run.*\n")

    # -- Phase 1.2: URL Batch Benign -------------------------------------------
    lines.append("---\n## Phase 1.2 — URL Model vs 300 Benign URLs\n")
    if url_benign:
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total tested | {url_benign['total']} |")
        lines.append(f"| False positives | {url_benign['false_positives_count']} |")
        lines.append(f"| FPR | {url_benign['fpr_percent']:.2f}% |")
        lines.append(f"| Pass (<= 2%) | {'[OK]' if url_benign['passed'] else '[FP]'} |")
        if url_benign["false_positives"]:
            lines.append(f"\n**False Positive URLs:**\n")
            for fp in url_benign["false_positives"][:15]:
                lines.append(f"- `{fp['url']}` — P={fp['p_phishing']:.4f}")
        lines.append("")
    else:
        lines.append("*Test not yet run.*\n")

    # -- Phase 1.3: URL Batch Phishing -----------------------------------------
    lines.append("---\n## Phase 1.3 — URL Model vs Phishing URLs\n")
    if url_phishing:
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total sampled | {url_phishing['total_sampled']} |")
        lines.append(f"| Dead links | {url_phishing['dead_links']} |")
        lines.append(f"| Tested (live) | {url_phishing['valid']} |")
        lines.append(f"| Detected | {url_phishing['detected']} |")
        lines.append(f"| Missed | {url_phishing['missed']} |")
        lines.append(f"| Detection rate | {url_phishing['detection_rate_percent']:.2f}% |")
        lines.append(f"| FNR | {url_phishing['fnr_percent']:.2f}% |")
        lines.append(f"| Pass (<= 5%) | {'[OK]' if url_phishing['passed'] else '[FP]'} |")
        lines.append("")
    else:
        lines.append("*Test not yet run.*\n")

    # -- Phase 2.2: DOM Live Sites -----------------------------------------------
    lines.append("---\n## Phase 2.2 - DOM Live Site Testing (20 Benign URLs)\n")
    if dom_live:
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total tested | {dom_live['total']} |")
        lines.append(f"| Skipped/Errors | {dom_live['skipped']} |")
        lines.append(f"| Valid | {dom_live['valid']} |")
        lines.append(f"| False positives | {dom_live['false_positives_count']} |")
        lines.append(f"| FPR | {dom_live['fpr_percent']:.2f}% |")
        lines.append(f"| Pass (<= 5%) | {'[OK]' if dom_live['passed'] else '[FP]'} |")
        if dom_live.get("false_positives"):
            lines.append(f"\n**DOM False Positives:**\n")
            for fp in dom_live["false_positives"]:
                lines.append(f"- `{fp['url']}` — P={fp['p_phishing']:.4f}")
        lines.append("")
    else:
        lines.append("*Test not yet run.*\n")

    # -- Phase 3.2: Visual Live Sites --------------------------------------------
    lines.append("---\n## Phase 3.2 - Visual Live Site Testing (15 Benign URLs)\n")
    if visual_live:
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total tested | {visual_live['total']} |")
        lines.append(f"| Skipped/Errors | {visual_live['skipped']} |")
        lines.append(f"| Valid | {visual_live['valid']} |")
        lines.append(f"| False positives | {visual_live['false_positives_count']} |")
        lines.append(f"| FPR | {visual_live['fpr_percent']:.2f}% |")
        lines.append(f"| Pass (<= 15%) | {'[OK]' if visual_live['passed'] else '[FP]'} |")
        if visual_live.get("false_positives"):
            lines.append(f"\n**Visual False Positives:**\n")
            for fp in visual_live["false_positives"]:
                lines.append(f"- `{fp['url']}` — P={fp['p_phishing']:.4f}")
        lines.append("")
    else:
        lines.append("*Test not yet run.*\n")

    # -- Phase 4.2: Fusion Batch Benign ----------------------------------------
    lines.append("---\n## Phase 4.2 — Fusion Pipeline vs Live Benign URLs\n")
    if fusion_benign:
        mc = fusion_benign.get("modality_coverage", {})
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total tested | {fusion_benign['total']} |")
        lines.append(f"| False positives | {fusion_benign['false_positives_count']} |")
        lines.append(f"| FPR | {fusion_benign['fpr_percent']:.2f}% |")
        lines.append(f"| DOM coverage | {mc.get('dom_available',0)}/{fusion_benign['total']} |")
        lines.append(f"| Visual coverage | {mc.get('visual_available',0)}/{fusion_benign['total']} |")
        lines.append(f"| Pass (<= 1%) | {'[OK]' if fusion_benign['passed'] else '[FP]'} |")
        if fusion_benign.get("false_positives"):
            lines.append(f"\n**Fusion False Positives:**\n")
            for fp in fusion_benign["false_positives"]:
                lines.append(f"- `{fp['url']}` — Fusion P={fp['fusion_p_phishing']:.4f} "
                             f"(URL={fp.get('url_score','N/A')}, DOM={fp.get('dom_score','N/A')}, Vis={fp.get('visual_score','N/A')})")
        lines.append("")
    else:
        lines.append("*Test not yet run.*\n")

    # -- Phase 4.3: Fusion Batch Phishing --------------------------------------
    lines.append("---\n## Phase 4.3 — Fusion Pipeline vs Live Phishing URLs\n")
    if fusion_phishing:
        lines.append(f"| Metric | Value |")
        lines.append(f"|--------|-------|")
        lines.append(f"| Total tested | {fusion_phishing['total']} |")
        lines.append(f"| Detected | {fusion_phishing['detected']} |")
        lines.append(f"| Missed | {fusion_phishing['missed']} |")
        lines.append(f"| Detection rate | {fusion_phishing['detection_rate_percent']:.2f}% |")
        lines.append(f"| FNR | {fusion_phishing['fnr_percent']:.2f}% |")
        lines.append(f"| Pass (<= 3%) | {'[OK]' if fusion_phishing['passed'] else '[FP]'} |")
        lines.append("")
    else:
        lines.append("*Test not yet run.*\n")

    # -- Overall Summary -------------------------------------------------------
    lines.append("---\n## Overall Summary\n")
    all_tests = [
        ("1.2 URL Benign FPR <= 2%", url_benign),
        ("1.3 URL Phishing FNR <= 5%", url_phishing),
        ("2.2 DOM Live Benign FPR <= 5%", dom_live),
        ("3.2 Visual Live Benign FPR <= 15%", visual_live),
        ("4.2 Fusion Benign FPR <= 1%", fusion_benign),
        ("4.3 Fusion Phishing FNR <= 3%", fusion_phishing),
    ]
    lines.append("| Test | Status |")
    lines.append("|------|--------|")
    for name, data in all_tests:
        if data is None:
            lines.append(f"| {name} | [--] Not run |")
        elif data.get("passed"):
            lines.append(f"| {name} | [OK] Passed |")
        else:
            lines.append(f"| {name} | [FP] Failed |")
    lines.append("")

    # Write report
    report_content = "\n".join(lines)
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report_content)

    print(f"\n  Report generated: {REPORT_PATH}")
    print(f"  Report length: {len(lines)} lines")
    print("=" * 70)

    return REPORT_PATH


if __name__ == "__main__":
    main()
