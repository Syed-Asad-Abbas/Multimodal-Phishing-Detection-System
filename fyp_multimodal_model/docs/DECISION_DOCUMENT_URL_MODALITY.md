# Decision Document: URL Modality Feature Engineering

**Date:** 2026-01-17
**Topic:** Resolving Zero-Variance Issue in URL Phishing Detection
**Status:** PROPOSAL

---

## 1. Problem Statement
The URL modality of the multimodal phishing detection system currently contributes **0.00%** to the final fusion model's decision making. 
- **Symptom:** The URL model outputs a constant, near-zero phishing probability for every single website it scans, regardless of whether it is `google.com` or a known phishing site.
- **Impact:** The system effectively ignores the URL entirely, relying solely on Visual and DOM features. This significantly degrades detection capabilities, especially for "zero-day" phishing sites that look visually identical to legitimate ones but have suspicious URLs.

## 2. Root Cause & Blockers
The issue stems from a mismatch between the **Research Environment** and the **Production Environment**.

- **The Dataset:** The model was trained on the PhiUSIIL dataset, which includes 12 features. Two of these features are **statistical**, meaning they were derived from private, proprietary databases owned by the dataset authors:
    1.  `TLDLegitimateProb`: A historical "trust score" for Top-Level Domains (e.g., .com vs .xyz).
    2.  `URLCharProb`: A probability score based on a private n-gram language model.
- **The Blocker:** We do not have access to the authors' private database or language model. 
- **The Previous Failure:** To work around this, the "Production Model" simply **removed** these two features. However, these were the *two most important features*. Without them, the model became "blind" and defaulted to a safe, constant prediction (Zero Variance).

## 3. Available Solutions

| Option | Approach | Pros | Cons | Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **1. Current State** | **Remove Features**<br>Train model on remaining 10 computable features. | • 100% Reproducible<br>• No external dependencies | • **Model Failure**<br>• Loss of critical signal<br>• Zero variance in predictions | **REJECTED**<br>(Current Failing State) |
| **2. Dataset Lookup** | **Use Cached Values**<br>Look up features from the training CSV. | • 100% Accuracy (to dataset)<br>• Matches training perfectly | • **Not Viable for Live URLs**<br>• Cannot handle any new URL not in the CSV | **REJECTED**<br>(Only for testing) |
| **3. Recommendation** | **Open-Source Heuristics**<br>Re-create the missing features using public data. | • **Restores Accuracy**<br>• Works on ALL URLs<br>• Free & Maintainable | • Values are approximations, not exact matches to dataset | **RECOMMENDED** |

---

## 4. The Recommended Solution: "Open-Source Heuristics"

We propose restoring the 12-feature "Research Model" by engineering our own versions of the missing features using free, public data sources.

### A. Replacing `TLDLegitimateProb` (The Domain Trust Score)
Instead of the private database, we will use **Spamhaus**, the industry-standard authority on domain reputation.
*   **Source:** Public "Most Abused TLDs" data from Spamhaus (e.g., `.top`, `.xyz` often appear here).
*   **Implementation:** 
    *   If TLD is on Spamhaus "Bad" list → Assign Low Score (0.1)
    *   If TLD is standard (.com, .org) → Assign High Score (0.9)
    *   Others → Neutral Score (0.5)

### B. Replacing `URLCharProb` (The Randomness Score)
Instead of the private language model, we will build a lightweight **N-gram Analyzer**.
*   **Source:** The **Tranco Top 1M** list (free list of top benign websites).
*   **Implementation:** 
    *   We write a script to analyze character patterns in the top 10,000 benign sites (e.g., "google" is a common pattern).
    *   When checking a new URL, we calculate how closely it matches these "benign patterns."
    *   High match = Legit; Low match = Random/Suspicious.

---

## 5. Pros & Cons of Recommendation

### ✅ Pros
1.  **Restores Model Function:** This immediately fixes the zero-variance issue. The URL modality will start contributing meaningfully to the fusion result.
2.  **Free & Sustainable:** Uses data sources that are free and regularly updated (Spamhaus, Tranco). We are not dependent on a paid API.
3.  **Explainable:** We can justify *why* a URL got a certain score (e.g., "Flagged because .xyz is currently a high-risk TLD according to Spamhaus").
4.  **No Retraining Required:** We can use the highly accurate "Research Model" (99.74%) that is already trained, simply by feeding it these estimated inputs.

### ⚠️ Cons
1.  **Approximate Values:** Our calculated `0.1` might correspond to the dataset's `0.12`. This small discrepancy is acceptable for robust ML models (LightGBM is tree-based and handles slight shifts well), but it is technically a "proxy."
2.  **Maintenance:** We may need to update the "Bad TLD List" occasionally (e.g., once a month) to keep it fresh.

## 6. Recommendation
**Proceed with Option 3.** This is the only viable path to a functional multimodal system that actually detects likelihood of phishing in URLs.
