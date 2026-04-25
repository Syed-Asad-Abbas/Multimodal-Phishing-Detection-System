# Multimodal Phishing Detection — Edge Case Test Report
**Generated:** 2026-04-25 19:10

---

## Model Baseline (Training Metrics)

| Modality | Accuracy | FPR | FNR | ROC-AUC |
|----------|----------|-----|-----|---------|
| URL | 98.76% | 0.47% | 2.28% | 0.9945 |
| DOM | 98.49% | — | — | — |
| Visual | 88.83% | 12.62% | 8.19% | 0.9567 |
| **Fusion** | **99.66%** | **0.14%** | **0.60%** | **0.9998** |

---
## Phase 1.1 — URL Model Edge Case Diagnosis

- **Tested:** 24 targeted URLs
- **Correct (BENIGN):** 24
- **False Positives:** 0

---
## Phase 1.2 — URL Model vs 300 Benign URLs

| Metric | Value |
|--------|-------|
| Total tested | 300 |
| False positives | 29 |
| FPR | 9.67% |
| Pass (<= 2%) | [OK] |

**False Positive URLs:**

- `https://daraz.pk/customer/account/login` — P=1.0000
- `https://upwork.com/ab/account-security/login` — P=1.0000
- `https://tradingview.com/accounts/signin` — P=1.0000
- `https://ptcl.com.pk/customer-login` — P=0.9999
- `https://instagram.com/accounts/login` — P=0.9998
- `https://spotify.com/pk-en/login` — P=0.9998
- `https://tinder.com/app/login` — P=0.9996
- `https://investing.com/registration` — P=0.9996
- `https://slack.com/signin` — P=0.9996
- `https://binance.com/en/login` — P=0.9995
- `https://zoom.us/signin` — P=0.9994
- `https://stripe.com/login` — P=0.9991
- `https://skrill.com/login` — P=0.9991
- `https://cloud.google.com/console` — P=0.9991
- `https://revolut.com/en-PK` — P=0.9989

---
## Phase 1.3 — URL Model vs Phishing URLs

| Metric | Value |
|--------|-------|
| Total sampled | 500 |
| Dead links | 427 |
| Tested (live) | 73 |
| Detected | 72 |
| Missed | 1 |
| Detection rate | 98.63% |
| FNR | 1.37% |
| Pass (<= 5%) | [OK] |

---
## Phase 2.2 - DOM Live Site Testing (20 Benign URLs)

| Metric | Value |
|--------|-------|
| Total tested | 20 |
| Skipped/Errors | 0 |
| Valid | 20 |
| False positives | 1 |
| FPR | 5.00% |
| Pass (<= 5%) | [OK] |

**DOM False Positives:**

- `https://foodpanda.pk` — P=0.5906

---
## Phase 3.2 - Visual Live Site Testing (15 Benign URLs)

| Metric | Value |
|--------|-------|
| Total tested | 15 |
| Skipped/Errors | 0 |
| Valid | 15 |
| False positives | 13 |
| FPR | 86.67% |
| Pass (<= 15%) | [FP] |

**Visual False Positives:**

- `https://github.com` — P=0.7413
- `https://www.daraz.pk` — P=0.9955
- `https://www.dawn.com` — P=0.9679
- `https://nadra.gov.pk` — P=0.9812
- `https://bahria.edu.pk` — P=0.9672
- `https://nust.edu.pk` — P=0.9219
- `https://www.hbl.com` — P=0.9907
- `https://www.facebook.com` — P=0.9821
- `https://www.instagram.com` — P=0.8975
- `https://www.ptcl.com.pk` — P=0.9890
- `https://icloud.com` — P=0.7830
- `https://www.geo.tv` — P=0.9702
- `https://easypaisa.com.pk` — P=0.7410

---
## Phase 4.2 — Fusion Pipeline vs Live Benign URLs

| Metric | Value |
|--------|-------|
| Total tested | 30 |
| False positives | 0 |
| FPR | 0.00% |
| DOM coverage | 29/30 |
| Visual coverage | 29/30 |
| Pass (<= 1%) | [OK] |

---
## Phase 4.3 — Fusion Pipeline vs Live Phishing URLs

| Metric | Value |
|--------|-------|
| Total tested | 20 |
| Detected | 20 |
| Missed | 0 |
| Detection rate | 100.00% |
| FNR | 0.00% |
| Pass (<= 3%) | [OK] |

---
## Overall Summary

| Test | Status |
|------|--------|
| 1.2 URL Benign FPR <= 2% | [OK] Passed |
| 1.3 URL Phishing FNR <= 5% | [OK] Passed |
| 2.2 DOM Live Benign FPR <= 5% | [OK] Passed |
| 3.2 Visual Live Benign FPR <= 15% | [FP] Failed |
| 4.2 Fusion Benign FPR <= 1% | [OK] Passed |
| 4.3 Fusion Phishing FNR <= 3% | [OK] Passed |
