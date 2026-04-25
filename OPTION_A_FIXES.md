# PHISHING DETECTION PIPELINE — Claude Code Master Context File
> You are Claude Code operating inside the `fyp_multimodal_model/` directory.
> This file contains the FULL context of all decisions made so far and your next task.
> Read this entire file before touching any code.

---

## HOW TO USE THIS FILE (For the human reading this)

### Starting Claude Code
1. Open your terminal inside `fyp_multimodal_model/`
2. Type: `claude` and press Enter
3. When Claude Code starts, type exactly:
   ```
   Read the file OPTION_A_FIXES.md and execute all tasks in order
   ```
4. Claude Code will read this file and start implementing
5. If it stops or asks a question — answer it and it will continue
6. If it makes a mistake — type `undo that and try again`
7. When it finishes a task it will tell you — then type `continue to the next task`

### Useful Claude Code Commands
```
# Ask it to explain what it's about to do before doing it:
"Before you change anything, explain what you are going to do"

# If something breaks:
"Revert the last change to [filename]"

# Check progress:
"Show me a summary of what has been completed so far"

# Run a specific verification:
"Run the sanity check and show me the output"
```

---

## FULL PROJECT CONTEXT

### What This Project Is
A multimodal phishing detection system with 4 services:
- Backend: Node.js/Express (`/backend_new`)
- User Frontend: React/Vite (`/Frontend/user-frontend`)
- Admin Frontend: React/Vite (`/Frontend/admin-frontend`)
- ML Service: Python/Flask (`/fyp_multimodal_model`) ← YOU ARE WORKING HERE

### ML Service Architecture
Three independent models fused into one prediction:
```
URL → LightGBM (url_lgbm_production.joblib)
DOM → Doc2Vec + LightGBM (dom_doc2vec_lgbm.joblib)
Visual → ResNet50 (visual_resnet50.pt)
All three → Fusion LightGBM (fusion_lgbm.joblib)
```

### Key Files in fyp_multimodal_model/
```
url_feature_extractor.py     ← MAIN FILE TO EDIT (Task 1)
train_url_production.py      ← EDIT feature list (Task 2)
retrain_url_from_extractor.py ← RUN to retrain (Task 3)
train_fusion_model.py        ← RUN to retrain fusion (Task 4)
test_live_urls.py            ← RUN final test (Task 5)
models/                      ← trained model .joblib files live here
data/tld_reputation.json     ← TLD blacklist/whitelist data
data/tld_inference_map.json  ← DO NOT USE (superseded by Option A)
```

---

## FULL HISTORY — WHAT HAS ALREADY BEEN DONE

### Completed Fixes (already in the codebase)
These were implemented by a previous Claude Code session. DO NOT redo them:

| Fix | Status | What Was Done |
|-----|--------|---------------|
| F1 — URLSimilarityIndex | ✅ DONE | Restored real computation, removed hardcoded 100.0 |
| F1 — CharContinuationRate | ✅ DONE | Restored itertools computation, removed hardcoded 1.0 |
| F4 — Dead TLD code | ✅ DONE | Removed duplicate get_tld_legitimate_prob() call |
| F5 — Subdomain stripping | ✅ DONE | STANDARD_PREFIXES set strips m., cdn., api., etc. |
| F5 — BrandKeywordInSLD | ✅ DONE | Detects brand names in second-level domain |
| F11 — IDN Homograph | ✅ DONE | check_idn_homograph() function added |
| F2 — Signed confidence | ✅ DONE | conf = (proba[1] - 0.5) * 2.0 in all prediction functions |
| F3 — NaN sentinel | ✅ DONE | Missing modalities use float('nan') not -1.0 |
| F6 — Ablation protocol | ✅ DONE | visual_only trains and tests on visual-present only |
| F9 — CAPTCHA detection | ✅ DONE | is_interstitial_page() added to inference_pipeline.py |
| F12 — Spec update | ✅ DONE | CLAUDE.md Visual row already correct |
| TLD blacklist | ✅ DONE | Added icu, cfd, sbs, cyou, live, etc. to data/tld_reputation.json |

### The Current Unresolved Problem
After all fixes above, the phishing feed test still shows 20/20 URLs predicted as BENIGN.

**Root Cause (confirmed by diagnostic):**
The features `TLDLegitimateProb` and `URLCharProb` cannot be faithfully reproduced from a raw URL string at inference time. The PhiUSIIL dataset creators computed these using proprietary external databases. Our three-bucket approximation produces values (0.0, 0.26, 0.52) that are completely different from what the model was trained on, causing the model to output p_url=0.0000 for all phishing URLs.

**Evidence from diagnose_inference.py output:**
```
TLDLegitimateProb in vector: 0.0   ← correct value
URLCharProb in vector:       0.15  ← correct value  
p_url (phishing prob):       0.0000 ← WRONG — model says benign
```

The model sees 0.0 for TLDLegitimateProb and maps it to BENIGN because in the
training dataset, 12,487 benign rows had TLDLegitimateProb=0.0 vs only 1,263
phishing rows. The feature is inverted relative to our intent.

**The Decision Made:**
Remove TLDLegitimateProb and URLCharProb entirely.
Replace with 6 new features that are 100% computable from raw URL strings.
This is called "Option A" and is the correct permanent fix.

---

## YOUR TASK — OPTION A IMPLEMENTATION

### Overview
Remove 2 broken features. Add 6 new computable features. Retrain both models.

```
TASK 1 → Edit url_feature_extractor.py  (remove 2, add 6)
TASK 2 → Edit train_url_production.py   (update feature list)
TASK 3 → Run retrain_url_from_extractor.py  (retrain URL model)
TASK 4 → Run train_fusion_model.py          (retrain fusion model)
TASK 5 → Run test_live_urls.py              (final verification)
```

**DO NOT start Task 2 until Task 1 is verified.**
**DO NOT start Task 3 until Task 2 is verified.**
**DO NOT start Task 4 until Task 3 sanity check passes.**

---

## TASK 1 — Edit `url_feature_extractor.py`

### 1A — Remove TLDLegitimateProb and URLCharProb entirely

Find and DELETE these two functions from the file:
```python
# DELETE this entire function:
def get_tld_legitimate_prob(domain):
    ...

# DELETE this entire function:
def get_url_char_prob(url_string):
    ...
```

Find and DELETE these lines near the top of the file
(they are only used by the deleted functions):
```python
TLD_DATA = None
NGRAM_DATA = None

def load_data():
    global TLD_DATA, NGRAM_DATA
    ...

# Load on import
load_data()
```

Inside `extract_url_features_from_string()`, find and DELETE
these two feature blocks (both of them):
```python
# DELETE — block that assigns features["TLDLegitimateProb"]
# DELETE — block that assigns features["URLCharProb"]
```

Also DELETE from the return list at the bottom:
- Any reference to `"TLDLegitimateProb"`
- Any reference to `"URLCharProb"`

Also DELETE from `COMPUTABLE_URL_FEATURES` if they exist there:
- `"TLDLegitimateProb"`
- `"URLCharProb"`

### 1B — Add required imports at the top of the file
Add these imports at the very top of `url_feature_extractor.py`
if they are not already present:
```python
import math
import re
from collections import Counter
```

### 1C — Add 6 new features inside `extract_url_features_from_string()`
Add these AFTER the `ObfuscationRatio` block and BEFORE the
`HasIDNHomograph` block:

```python
# ── NEW FEATURE 1: DomainDigitRatio ──────────────────────────
# Phishing domains contain more digits than legitimate ones
# e.g. allegro.pl-oferta73419590.icu has many digits
digit_count = sum(c.isdigit() for c in domain)
features["DomainDigitRatio"] = (
    digit_count / len(domain) if len(domain) > 0 else 0.0
)

# ── NEW FEATURE 2: DomainHyphenCount ─────────────────────────
# Phishing uses hyphens to mimic brands: paypal-login-secure.tk
features["DomainHyphenCount"] = domain.count('-')

# ── NEW FEATURE 3: MaxDigitRunLength ─────────────────────────
# Catches long numeric strings like "73419590" in phishing domains
# Legitimate domains rarely have digit runs longer than 4
digit_runs = re.findall(r'\d+', domain)
features["MaxDigitRunLength"] = (
    max((len(r) for r in digit_runs), default=0)
)

# ── NEW FEATURE 4: URLEntropy ─────────────────────────────────
# Shannon entropy — phishing URLs have higher randomness
# Random subdomains like "abszfgrtr65" have high entropy
if len(full_url) > 0:
    char_counts = Counter(full_url)
    url_entropy = -sum(
        (c / len(full_url)) * math.log2(c / len(full_url))
        for c in char_counts.values()
    )
    features["URLEntropy"] = round(url_entropy, 6)
else:
    features["URLEntropy"] = 0.0

# ── NEW FEATURE 5: IsSLDNumeric ──────────────────────────────
# Catches URLs like http://78382google.com where SLD starts with digits
# Also catches pure numeric domains
sld = parts[-2] if len(parts) >= 2 else ''
sld_stripped = sld.replace('-', '').replace('_', '')
features["IsSLDNumeric"] = (
    1 if sld_stripped.isdigit() and len(sld_stripped) > 0 else 0
)

# ── NEW FEATURE 6: PathDepth ──────────────────────────────────
# Number of path segments in the URL
# Phishing URLs often have deep paths to simulate legitimate structure
path_parts = [p for p in parsed.path.split('/') if p]
features["PathDepth"] = len(path_parts)
```

### 1D — Update `extract_url_features_dict()` function
At the bottom of the file there is a `extract_url_features_dict()` function
that defines `feature_names`. Update it to use the new feature list:

```python
def extract_url_features_dict(url_string):
    feature_names = [
        "URLLength", "DomainLength", "IsDomainIP",
        "URLSimilarityIndex", "CharContinuationRate",
        "TLDLength", "NoOfSubDomain",
        "HasObfuscation", "NoOfObfuscatedChar", "ObfuscationRatio",
        "DomainDigitRatio", "DomainHyphenCount", "MaxDigitRunLength",
        "URLEntropy", "IsSLDNumeric", "PathDepth",
        "HasIDNHomograph", "BrandKeywordInSLD",
    ]
    values = extract_url_features_from_string(url_string, feature_names)
    return dict(zip(feature_names, values))
```

### VERIFY TASK 1
Run this command:
```bash
python -c "
from url_feature_extractor import extract_url_features_dict
import json

print('=== PHISHING URL ===')
d1 = extract_url_features_dict('http://allegro.pl-oferta73419590.icu')
print(json.dumps(d1, indent=2))

print()
print('=== BENIGN URL ===')
d2 = extract_url_features_dict('https://www.google.com')
print(json.dumps(d2, indent=2))
"
```

**Task 1 passes when ALL of these are true:**
- `TLDLegitimateProb` does NOT appear in either output
- `URLCharProb` does NOT appear in either output
- `DomainDigitRatio` appears in both outputs
- `MaxDigitRunLength` appears in both outputs
- `URLEntropy` appears in both outputs
- For `allegro.pl-oferta73419590.icu`:
  - `MaxDigitRunLength` >= 6 (the "73419590" run)
  - `DomainDigitRatio` > 0.1
  - `DomainHyphenCount` >= 1
- For `google.com`:
  - `MaxDigitRunLength` == 0
  - `DomainDigitRatio` == 0.0
  - `DomainHyphenCount` == 0

**DO NOT proceed to Task 2 until all conditions above are true.**

---

## TASK 2 — Edit `train_url_production.py`

### Replace COMPUTABLE_URL_FEATURES entirely
Find the `COMPUTABLE_URL_FEATURES` list and replace it completely with:

```python
COMPUTABLE_URL_FEATURES = [
    "URLLength",          # ✅ len(url)
    "DomainLength",       # ✅ len(domain)
    "IsDomainIP",         # ✅ regex check
    "URLSimilarityIndex", # ✅ unique_chars / total * 100
    "CharContinuationRate", # ✅ max_consecutive / total
    "TLDLength",          # ✅ len(tld)
    "NoOfSubDomain",      # ✅ count with prefix stripping
    "HasObfuscation",     # ✅ @, %, \\ present
    "NoOfObfuscatedChar", # ✅ count obfuscation chars
    "ObfuscationRatio",   # ✅ obfuscated / total
    "DomainDigitRatio",   # ✅ NEW: digits in domain / domain length
    "DomainHyphenCount",  # ✅ NEW: number of hyphens in domain
    "MaxDigitRunLength",  # ✅ NEW: longest consecutive digit sequence
    "URLEntropy",         # ✅ NEW: Shannon entropy of URL string
    "IsSLDNumeric",       # ✅ NEW: is second-level domain purely numeric
    "PathDepth",          # ✅ NEW: number of URL path segments
    "HasIDNHomograph",    # ✅ NEW: Unicode/Punycode spoofing detection
    "BrandKeywordInSLD",  # ✅ NEW: brand keyword in second-level domain
]
```

### Also update the print statement in main()
Find the line that says:
```python
print(f"Features used: {len(COMPUTABLE_URL_FEATURES)} (Full Feature Set)")
```
The count will now say 18. This is correct.

### VERIFY TASK 2
Run:
```bash
python -c "
from train_url_production import COMPUTABLE_URL_FEATURES
print('Feature count:', len(COMPUTABLE_URL_FEATURES))
print('TLDLegitimateProb present:', 'TLDLegitimateProb' in COMPUTABLE_URL_FEATURES)
print('URLCharProb present:', 'URLCharProb' in COMPUTABLE_URL_FEATURES)
print('DomainDigitRatio present:', 'DomainDigitRatio' in COMPUTABLE_URL_FEATURES)
print('URLEntropy present:', 'URLEntropy' in COMPUTABLE_URL_FEATURES)
"
```

**Task 2 passes when:**
- Feature count == 18
- TLDLegitimateProb present: False
- URLCharProb present: False
- DomainDigitRatio present: True
- URLEntropy present: True

---

## TASK 3 — Retrain URL Model

Run:
```bash
python retrain_url_from_extractor.py --config config.json
```

This will:
1. Load the dataset (235,795 rows)
2. Recompute ALL 18 features from raw URL strings (takes ~20 seconds)
3. Show TLDLegitimateProb unique values — should now say "not found" since we removed it
4. Train LightGBM
5. Run sanity check on phishing URLs

### VERIFY TASK 3
The sanity check at the end of the script output must show:

```
✅ phishing .icu: p_phish > 0.5
✅ phishing .cfd: p_phish > 0.5
✅ phishing .cn:  p_phish > 0.5
✅ benign .com (google): p_phish < 0.5
✅ benign .com (github): p_phish < 0.5
```

**If ANY phishing URL shows ❌ (p_phish < 0.5), STOP.**
Do not proceed to Task 4.
Report what you see and debug the feature extraction.

**Minimum acceptable metrics:**
- Accuracy >= 0.93
- ROC-AUC >= 0.94
- FPR <= 0.08

**Note:** Accuracy may be slightly lower than the previous 99.83% because
we removed two high-information features. 95–98% is expected and acceptable.
This is an honest model — the previous 99.83% was a false result caused by
dataset-specific features that don't work at inference time.

---

## TASK 4 — Retrain Fusion Model

Run:
```bash
python train_fusion_model.py --config config.json
```

This takes 30–60 minutes. It runs all three base models on every dataset row
to build the fusion training data.

### VERIFY TASK 4
Check the ablation study output:

```
all_modalities should have the HIGHEST accuracy
url_only should be >= 0.93
dom_only should be >= 0.96
visual_only will show 0.0000 (this is correct — not enough visual samples)
```

Also run the kill-switch diagnostic:
```bash
python diagnose_killswitch.py
```

Expected output:
```
Prediction: PHISHING
Phishing probability: >= 0.55
STATUS: Kill-switch not active
```

---

## TASK 5 — Final Phishing Feed Test

Run:
```bash
python test_live_urls.py --file data/phising_feed.txt --output results/option_a_results.json
```

### SUCCESS CRITERIA
```
Predicted PHISHING: >= 12 out of 20
Predicted BENIGN:   <= 8 out of 20  (blogspot.com and .com typosquatting are hard cases)
Errors:             0
```

**Known hard cases that may still show BENIGN — this is acceptable:**
- `https://abszfgrtr65.blogspot.com` — free platform abuse on .com, needs DOM/visual
- `https://serbasi1.blogspot.com` — same
- `http://78382google.com` — .com typosquatting without DOM/visual
- `https://scanned.page/55eUnV` — .page is not flagged, redirect-based attack

**URLs that MUST show PHISHING after Option A:**
- Any URL with `.icu`, `.cfd`, `.sbs`, `.cyou`, `.live` in the domain
- Any URL with `.cn` in the domain
- Any URL with a long digit run (>5 digits) in the domain

---

## ALSO RUN — Benign URL Test

Run this to confirm we haven't broken benign detection:
```bash
python test_live_urls.py --benign --output results/option_a_benign.json
```

**ALL 8 benign URLs must show BENIGN:**
```
https://www.google.com      → BENIGN
https://www.github.com      → BENIGN
https://www.wikipedia.org   → BENIGN
https://www.microsoft.com   → BENIGN
https://www.stackoverflow.com → BENIGN
https://www.reddit.com      → BENIGN
https://www.amazon.com      → BENIGN
https://www.paypal.com      → BENIGN
```

If any benign URL shows PHISHING — that is a false positive and must be
investigated before declaring success.

---

## FINAL VERIFICATION — Run All Unit Tests

```bash
python test_all_fixes.py
```

Expected: All tests pass except any that specifically check for
TLDLegitimateProb or URLCharProb (those features are now removed —
update the test file to remove those specific assertions if they fail).

---

## WHAT TO REPORT WHEN DONE

When all 5 tasks are complete, show the human this summary:

```
OPTION A IMPLEMENTATION COMPLETE
==================================
Task 1 — url_feature_extractor.py: [PASS/FAIL]
Task 2 — train_url_production.py:  [PASS/FAIL]
Task 3 — URL model retrained:
  Accuracy: X.XXXX
  ROC-AUC:  X.XXXX
  FPR:      X.XXXX
  Sanity check: X/5 correct
Task 4 — Fusion model retrained:
  all_modalities accuracy: X.XXXX
  Kill-switch: NOT ACTIVE
Task 5 — Phishing feed test:
  PHISHING: XX/20
  BENIGN:   XX/20
Benign URL test: XX/8 correct
```

---

## IMPORTANT CONSTRAINTS

1. Do NOT edit `train_dom_doc2vec_lgbm.py` — DOM model is working correctly
2. Do NOT edit `train_visual_resnet.py` — Visual model is working correctly
3. Do NOT edit `data/tld_reputation.json` — already updated
4. Do NOT delete `diagnose_killswitch.py` — needed for verification
5. Do NOT delete `diagnose_features.py` — needed for debugging
6. Do NOT delete `retrain_url_from_extractor.py` — needed for Task 3
7. The `models/` directory should have these files when done:
   - `url_lgbm_production.joblib` (retrained in Task 3)
   - `fusion_lgbm.joblib` (retrained in Task 4)
   - `dom_doc2vec_lgbm.joblib` (unchanged)
   - `visual_resnet50.pt` (unchanged)
