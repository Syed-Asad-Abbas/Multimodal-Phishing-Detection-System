# PIPELINE FIXES — Claude Code Instruction File
> You are Claude Code. Read this file completely before writing a single line of code.
> Execute every fix in the order listed. After each fix, run the verification command and confirm the output matches before moving to the next fix.
> Do NOT skip fixes. Do NOT reorder fixes. Fixes F1–F4 must be complete before F5–F12.

---

## RULES

1. **No-skip policy** — complete each fix fully (code change + retrain if required + verification passing) before starting the next.
2. **Retrain triggers** — fixes marked `[RETRAIN REQUIRED]` require you to run the specified training command before the verification will pass.
3. **Do not change** any file not listed under a fix's `FILE` field.
4. **Verification must pass** — if a verification command produces output that does not match the expected result, stop and debug before continuing.
5. All paths are relative to `/fyp_multimodal_model/` unless stated otherwise.

---

## FIX EXECUTION ORDER

```
F1 → F4 → F11 → F5  →  retrain URL model
        ↓
F2 → F3 → F6         →  retrain Fusion model
        ↓
F9 → F8              →  no retrain needed
        ↓
F7 → F10             →  calibration run
        ↓
F12                  →  docs only
        ↓
RUN FULL TEST SUITE
```

---

## F1 — Restore URL Feature Variance
**Severity:** CRITICAL
**File:** `url_feature_extractor.py`
**Reason:** `URLSimilarityIndex` is hardcoded to `100.0` and `CharContinuationRate` is hardcoded to `1.0` for all non-IP URLs at inference time. The LightGBM was trained on real variance. This is a covariate shift — the model never sees at inference what it learned on.

### CHANGE 1 — URLSimilarityIndex
Find this block inside `extract_url_features_from_string()`:
```python
# FIND AND DELETE THIS ENTIRE BLOCK:
if is_ip:
     features["URLSimilarityIndex"] = 100.0
elif len(full_url) > 0:
    raw_sim = (len(set(full_url)) / len(full_url)) * 100.0
    features["URLSimilarityIndex"] = 100.0 if raw_sim > 40 else raw_sim
else:
    features["URLSimilarityIndex"] = 0.0
```

Replace with:
```python
if len(full_url) > 0:
    features["URLSimilarityIndex"] = (len(set(full_url)) / len(full_url)) * 100.0
else:
    features["URLSimilarityIndex"] = 0.0
```

### CHANGE 2 — CharContinuationRate
Find this block inside `extract_url_features_from_string()`:
```python
# FIND AND DELETE THIS ENTIRE BLOCK:
if is_ip:
     features["CharContinuationRate"] = 1.0
elif len(full_url) > 0:
    features["CharContinuationRate"] = 1.0
else:
     features["CharContinuationRate"] = 0.0
```

Replace with:
```python
import itertools
if len(full_url) > 0:
    groups = [len(list(g)) for _, g in itertools.groupby(full_url)]
    max_run = max(groups) if groups else 0
    features["CharContinuationRate"] = max_run / len(full_url)
else:
    features["CharContinuationRate"] = 0.0
```

> Note: add `import itertools` at the top of the file if not already present.

### VERIFICATION — F1
Run:
```bash
python -c "
from url_feature_extractor import extract_url_features_dict
d = extract_url_features_dict('https://www.google.com')
print('URLSimilarityIndex:', d['URLSimilarityIndex'])
print('CharContinuationRate:', d['CharContinuationRate'])
assert d['URLSimilarityIndex'] != 100.0, 'FAIL: still hardcoded 100'
assert d['CharContinuationRate'] != 1.0,  'FAIL: still hardcoded 1'
assert 30.0 < d['URLSimilarityIndex'] < 90.0, 'FAIL: value out of expected range'
assert 0.01 < d['CharContinuationRate'] < 0.5, 'FAIL: value out of expected range'
print('F1 PASS')
"
```
**Expected output:**
```
URLSimilarityIndex: [any value between 30.0 and 90.0]
CharContinuationRate: [any value between 0.01 and 0.50]
F1 PASS
```

---

## F4 — Remove Dead TLD Code
**Severity:** MEDIUM
**File:** `url_feature_extractor.py`
**Reason:** `TLDLegitimateProb` is computed and assigned twice. The first assignment is dead code — it is immediately overwritten 4 lines later. Maintenance trap.

### CHANGE
Inside `extract_url_features_from_string()`, find the FIRST occurrence of this pattern and delete it (the first block only — keep the second):
```python
# DELETE THIS FIRST BLOCK ONLY:
# 6. TLDLegitimateProb
# SCAN RESULT: TLD >= 0.26 -> PHISHING. TLD <= 0.1 -> SAFE.
tld_prob = get_tld_legitimate_prob(domain)
features["TLDLegitimateProb"] = tld_prob
```

Keep the second block (which also sets `URLCharProb` — the coupling logic). Do not touch the second block.

### VERIFICATION — F4
Run:
```bash
python -c "
import inspect, url_feature_extractor as ufe
src = inspect.getsource(ufe.extract_url_features_from_string)
count = src.count('get_tld_legitimate_prob')
print(f'get_tld_legitimate_prob call count: {count}')
assert count == 1, f'FAIL: expected 1, got {count}'
print('F4 PASS')
"
```
**Expected output:**
```
get_tld_legitimate_prob call count: 1
F4 PASS
```

---

## F11 — IDN Homograph Detection Feature
**Severity:** HIGH
**File:** `url_feature_extractor.py`
**Reason:** Unicode homograph attacks (Cyrillic 'а' for Latin 'a') are invisible to all current obfuscation checks. Need a dedicated feature.

### CHANGE 1 — Add helper function
Add this function to `url_feature_extractor.py` before `extract_url_features_from_string()`:
```python
def check_idn_homograph(domain: str) -> int:
    """
    Returns 1 if domain uses non-ASCII characters or encodes to Punycode (xn--).
    Either condition indicates a potential homograph/IDN spoofing attack.
    """
    try:
        domain.encode('ascii')
    except UnicodeEncodeError:
        return 1  # Non-ASCII characters present in domain

    try:
        encoded = domain.encode('idna').decode('ascii')
        if 'xn--' in encoded:
            return 1
    except Exception:
        pass

    return 0
```

### CHANGE 2 — Call the helper inside `extract_url_features_from_string()`
Add this line inside the function, after the `HasObfuscation` / `NoOfObfuscatedChar` block:
```python
# 13. HasIDNHomograph
features["HasIDNHomograph"] = check_idn_homograph(domain)
```

### CHANGE 3 — Register the feature in `train_url_production.py`
In `COMPUTABLE_URL_FEATURES` list, add:
```python
"HasIDNHomograph",   # ✅ check_idn_homograph() — detects Unicode spoofing
```

### VERIFICATION — F11
Run:
```bash
python -c "
from url_feature_extractor import extract_url_features_dict

# Cyrillic 'a' (\u0430) in paypal
d1 = extract_url_features_dict('https://p\u0430ypal.com')
print('Cyrillic homograph HasIDNHomograph:', d1['HasIDNHomograph'])
assert d1['HasIDNHomograph'] == 1, 'FAIL: did not detect Cyrillic homograph'

# Normal URL
d2 = extract_url_features_dict('https://www.paypal.com')
print('Normal URL HasIDNHomograph:', d2['HasIDNHomograph'])
assert d2['HasIDNHomograph'] == 0, 'FAIL: false positive on normal URL'

print('F11 PASS')
"
```
**Expected output:**
```
Cyrillic homograph HasIDNHomograph: 1
Normal URL HasIDNHomograph: 0
F11 PASS
```

---

## F5 — Extended Subdomain Stripping + Brand Keyword Detection
**Severity:** HIGH
**File:** `url_feature_extractor.py`
**Reason:** Only `www.` is stripped. Common legitimate prefixes (`m.`, `cdn.`, `api.`, `mail.`) get the same subdomain penalty as phishing subdomains. Also, brand impersonation in the SLD (`paypal-login.com`) is completely undetected.

### CHANGE 1 — Replace subdomain counting logic
Find the current `NoOfSubDomain` block:
```python
# FIND AND REPLACE THIS ENTIRE BLOCK:
cleaned_domain = domain
if cleaned_domain.startswith("www."):
    cleaned_domain = cleaned_domain[4:]
domain_parts = cleaned_domain.split('.')
features["NoOfSubDomain"] = max(0, len(domain_parts) - 2)
```

Replace with:
```python
STANDARD_PREFIXES = {
    'www', 'www2', 'm', 'mobile', 'api', 'cdn', 'static', 'assets',
    'mail', 'email', 'smtp', 'webmail', 'support', 'help',
    'blog', 'shop', 'store', 'dev', 'staging', 'beta', 'secure'
}

parts = domain.lower().split('.')
# Strip all leading standard-service prefixes
while len(parts) > 2 and parts[0] in STANDARD_PREFIXES:
    parts = parts[1:]
features["NoOfSubDomain"] = max(0, len(parts) - 2)
```

### CHANGE 2 — Add BrandKeywordInSLD feature
Add immediately after the `NoOfSubDomain` assignment:
```python
# BrandKeywordInSLD — detects brand impersonation in second-level domain
BRAND_KEYWORDS = {
    'paypal', 'amazon', 'google', 'microsoft', 'apple', 'facebook',
    'instagram', 'netflix', 'ebay', 'bank', 'banking', 'secure', 'login',
    'signin', 'verify', 'verification', 'account', 'update', 'confirm',
    'support', 'wallet', 'crypto', 'coinbase', 'binance', 'chase',
    'wellsfargo', 'citibank', 'hsbc', 'halifax', 'santander'
}

sld = parts[-2].lower() if len(parts) >= 2 else ''
features["BrandKeywordInSLD"] = 1 if any(kw in sld for kw in BRAND_KEYWORDS) else 0
```

### CHANGE 3 — Register in `train_url_production.py`
Add to `COMPUTABLE_URL_FEATURES`:
```python
"BrandKeywordInSLD",  # ✅ detects brand names in second-level domain
```

### VERIFICATION — F5
Run:
```bash
python -c "
from url_feature_extractor import extract_url_features_dict

# m. prefix should be stripped → NoOfSubDomain = 0
d1 = extract_url_features_dict('https://m.facebook.com/login')
print('m.facebook.com NoOfSubDomain:', d1['NoOfSubDomain'])
assert d1['NoOfSubDomain'] == 0, 'FAIL: m. prefix not stripped'

# paypal-login in SLD → BrandKeywordInSLD = 1
d2 = extract_url_features_dict('https://paypal-login.verification.tk')
print('paypal-login BrandKeywordInSLD:', d2['BrandKeywordInSLD'])
assert d2['BrandKeywordInSLD'] == 1, 'FAIL: brand keyword not detected'

# Normal google.com → BrandKeywordInSLD = 0
d3 = extract_url_features_dict('https://www.google.com')
print('google.com BrandKeywordInSLD:', d3['BrandKeywordInSLD'])
assert d3['BrandKeywordInSLD'] == 0, 'FAIL: false positive on google.com'

# cdn subdomain should be stripped
d4 = extract_url_features_dict('https://cdn-assets.microsoft.com/files')
print('cdn-assets.microsoft.com NoOfSubDomain:', d4['NoOfSubDomain'])
assert d4['NoOfSubDomain'] == 0, 'FAIL: cdn prefix not stripped'

print('F5 PASS')
"
```
**Expected output:**
```
m.facebook.com NoOfSubDomain: 0
paypal-login BrandKeywordInSLD: 1
google.com BrandKeywordInSLD: 0
cdn-assets.microsoft.com NoOfSubDomain: 0
F5 PASS
```

---

## [RETRAIN — URL MODEL]
**Run this after F1, F4, F11, F5 all pass their verifications.**
```bash
cd /fyp_multimodal_model
python train_url_production.py --config config.json
```
**Expected console output must include:**
- `Accuracy: >= 0.93`
- `ROC-AUC: >= 0.96`
- `FPR: <= 0.05`
- Line: `✅ Saved production model to: models/url_lgbm_production.joblib`

If accuracy drops below 0.90, stop — there is a bug in the feature extraction changes.

---

## F2 — Signed Confidence Metric
**Severity:** CRITICAL
**Files:** `train_fusion_model.py`, `inference_complete.py`, `inference_pipeline.py`
**Reason:** `conf = max(proba)` is directionally blind. A 95%-phishing prediction and a 95%-benign prediction both produce `conf=0.95`. The fusion meta-classifier cannot distinguish them by confidence alone.

### CHANGE — All three `get_*_prediction()` functions
In **each** of these three files (`train_fusion_model.py`, `inference_complete.py`, `inference_pipeline.py`), find every function that ends with:
```python
return proba[1], max(proba)
```

Replace **every occurrence** with:
```python
signed_conf = (proba[1] - 0.5) * 2.0   # +1.0 = certain phishing, -1.0 = certain benign
return proba[1], signed_conf
```

Also apply the same change to the visual model's return:
```python
# FIND:
confidence = max(probs[0].item(), probs[1].item())
return p_phish, confidence

# REPLACE WITH:
signed_conf = (p_phish - 0.5) * 2.0
return p_phish, signed_conf
```

### VERIFICATION — F2
Run:
```bash
python -c "
import joblib, numpy as np
d = joblib.load('models/url_lgbm_production.joblib')
model, scaler, feature_names = d['model'], d['scaler'], d['feature_names']

# Simulate high-phishing prediction
X = np.ones((1, len(feature_names)))
proba = model.predict_proba(scaler.transform(X))[0]
p = proba[1]
signed_conf = (p - 0.5) * 2.0

print(f'p_phish: {p:.4f}')
print(f'signed_conf: {signed_conf:.4f}')
assert -1.0 <= signed_conf <= 1.0, 'FAIL: signed_conf out of range [-1, 1]'
if p > 0.5:
    assert signed_conf > 0, 'FAIL: phishing prediction should give positive conf'
else:
    assert signed_conf < 0, 'FAIL: benign prediction should give negative conf'
print('F2 PASS')
"
```
**Expected output:**
```
p_phish: [any value]
signed_conf: [value in range -1.0 to +1.0, positive if p>0.5]
F2 PASS
```

---

## F3 — NaN Sentinel + Kill-Switch Diagnostic
**Severity:** CRITICAL
**File:** `train_fusion_model.py`, `inference_complete.py`, `inference_pipeline.py`
**Reason:** Missing modality uses `-1.0` sentinel. LightGBM treats `-1.0` as a valid value and may learn that `p_visual=-1.0` → BENIGN, creating a systematic exploit where any phishing page that blocks screenshot capture is classified as safe.

### STEP 1 — Run kill-switch diagnostic BEFORE making changes

Create file `diagnose_killswitch.py`:
```python
import joblib
import numpy as np

fusion = joblib.load('models/fusion_lgbm.joblib')['model']

# Strong phishing URL + strong phishing DOM + NO screenshot
# [p_url, p_dom, p_visual, conf_url, conf_dom, conf_visual, has_url, has_dom, has_visual]
X = np.array([[0.95, 0.90, -1.0, 0.90, 0.80, 0.0, 1.0, 1.0, 0.0]])

pred = fusion.predict(X)[0]
prob = fusion.predict_proba(X)[0][1]

print("=== KILL-SWITCH DIAGNOSTIC ===")
print(f"Input: p_url=0.95, p_dom=0.90, p_visual=MISSING")
print(f"Prediction: {'PHISHING' if pred == 1 else 'BENIGN'}")
print(f"Phishing probability: {prob:.4f}")

if pred == 0 and prob < 0.5:
    print("STATUS: KILL-SWITCH ACTIVE — model predicts BENIGN despite strong phishing signals")
    print("ACTION: F3 fix is critical — proceed immediately")
else:
    print("STATUS: Kill-switch not active — F3 fix is still best practice")
```

Run:
```bash
python diagnose_killswitch.py
```
Record the output. You will compare it after the fix.

### CHANGE 1 — Replace -1.0 sentinel with NaN in all prediction functions
In `train_fusion_model.py`, `inference_complete.py`, `inference_pipeline.py` — in every `get_*_prediction()` function, change the except clause:

```python
# FIND (in every except block of get_url_prediction, get_dom_prediction, get_visual_prediction):
return -1.0, 0.0

# REPLACE WITH:
return float('nan'), float('nan')
```

### CHANGE 2 — Update `has_*` flag logic in `build_fusion_features()`
In `train_fusion_model.py`, inside `build_fusion_features()`, find:
```python
# FIND:
1.0 if p_url >= 0 else 0.0,    # has_url flag
1.0 if p_dom >= 0 else 0.0,    # has_dom flag
1.0 if p_visual >= 0 else 0.0, # has_visual flag
```

Replace with:
```python
import math
0.0 if math.isnan(p_url)    else 1.0,   # has_url flag
0.0 if math.isnan(p_dom)    else 1.0,   # has_dom flag
0.0 if math.isnan(p_visual) else 1.0,   # has_visual flag
```

Add `import math` at the top of the file if not already present.

### CHANGE 3 — Configure LightGBM in `train_fusion_classifier()` to handle NaN natively
In `train_fusion_model.py`, in `train_fusion_classifier()`, update the `LGBMClassifier` constructor:
```python
clf = LGBMClassifier(
    n_estimators=200,
    learning_rate=0.05,
    max_depth=5,
    num_leaves=31,
    subsample=0.9,
    colsample_bytree=0.9,
    random_state=42,
    n_jobs=-1,
    use_missing=True,       # ADD THIS
    zero_as_missing=False   # ADD THIS — NaN = missing, 0 = valid value
)
```

Apply the same two parameters to **both** `LGBMClassifier` instances in `ablation_study()`.

### [RETRAIN — FUSION MODEL]
```bash
python train_fusion_model.py --config config.json
```
Full run is required (not `--sample_size`).

### STEP 2 — Re-run kill-switch diagnostic AFTER retraining
```bash
python diagnose_killswitch.py
```

### VERIFICATION — F3
**Expected output after retraining:**
```
=== KILL-SWITCH DIAGNOSTIC ===
Input: p_url=0.95, p_dom=0.90, p_visual=MISSING
Prediction: PHISHING
Phishing probability: [>= 0.55]
STATUS: Kill-switch not active
```

If it still says BENIGN after retraining, the NaN imputation was not applied correctly. Check that `use_missing=True` is in the LGBMClassifier and that the fusion training data uses `float('nan')` not `-1.0`.

---

## F6 — Fix Ablation Study Train/Test Protocol
**Severity:** HIGH
**File:** `train_fusion_model.py`
**Reason:** The `visual_only` ablation trains on ALL samples (including `p_visual=NaN`) but tests only on visual-present samples. This inflates the visual-only accuracy metric.

### CHANGE — Inside `ablation_study()`, update the `visual_only` block
Find:
```python
if name == "visual_only":
    has_visual_test = X_test[:, 8] > 0
    if has_visual_test.sum() == 0:
        results[name] = {"accuracy": 0.0, "note": "No visual samples in test set"}
        continue
    X_test_sub = X_test_sub[has_visual_test]
    y_test_sub = y_test[has_visual_test]
else:
    y_test_sub = y_test
```

Replace with:
```python
if name == "visual_only":
    # Filter BOTH train AND test to visual-present samples only
    import numpy as np
    has_visual_train = ~np.isnan(X_train[:, 2])  # p_visual is index 2
    has_visual_test  = ~np.isnan(X_test[:, 2])

    if has_visual_train.sum() < 10 or has_visual_test.sum() == 0:
        results[name] = {"accuracy": 0.0, "note": "Insufficient visual samples"}
        continue

    X_train_sub = X_train[has_visual_train][:, indices]
    y_train_sub  = y_train[has_visual_train]
    X_test_sub   = X_test[has_visual_test][:, indices]
    y_test_sub   = y_test[has_visual_test]
else:
    y_train_sub = y_train
    y_test_sub  = y_test
```

Also update the `clf.fit()` call to always use `y_train_sub`:
```python
# FIND:
clf.fit(X_train_sub, y_train)

# REPLACE WITH:
clf.fit(X_train_sub, y_train_sub)
```

### VERIFICATION — F6
Run the fusion training with sample size (fast):
```bash
python train_fusion_model.py --config config.json --sample_size 5000
```

Then run:
```bash
python -c "
import json
with open('models/fusion_ablation.json') as f:
    ab = json.load(f)

print('Ablation results:')
for name, m in ab.items():
    print(f'  {name:20s}: acc={m.get(\"accuracy\", 0):.4f}')

all_acc = ab.get('all_modalities', {}).get('accuracy', 0)
url_acc = ab.get('url_only', {}).get('accuracy', 0)
vis_acc = ab.get('visual_only', {}).get('accuracy', 0)

assert all_acc >= url_acc, 'FAIL: all_modalities should beat url_only'
assert all_acc >= vis_acc, 'FAIL: all_modalities should beat visual_only'
print('F6 PASS')
"
```
**Expected:** `all_modalities` has the highest accuracy in the table.

---

## F9 — CAPTCHA Interstitial Detection
**Severity:** HIGH
**File:** `inference_pipeline.py` (wherever DOM HTML is fetched and processed)
**Reason:** When Selenium hits a Cloudflare CAPTCHA or bot-detection page, the DOM model classifies the interstitial — not the phishing content. CAPTCHA DOMs look benign.

### CHANGE — Add `is_interstitial_page()` and call it before DOM extraction
Add this function to `inference_pipeline.py`:
```python
CAPTCHA_SIGNATURES = [
    'cf-browser-verification',
    'just-a-moment',
    'jschl-answer',
    'hcaptcha.com',
    'recaptcha/api',
    'verifying you are human',
    'please enable javascript',
    'access denied',
    'ray-id',
    'please wait while we verify',
    'ddos-guard',
]

def is_interstitial_page(html: str) -> bool:
    """
    Returns True if the fetched HTML is a bot-detection/CAPTCHA interstitial
    rather than the actual page content. Requires >= 2 signature matches
    to avoid false positives.
    """
    if not html or len(html.strip()) < 200:
        return True  # Suspiciously empty or minimal response
    html_lower = html.lower()
    matches = sum(1 for sig in CAPTCHA_SIGNATURES if sig in html_lower)
    return matches >= 2
```

In the DOM extraction flow, wrap the DOM feature extraction:
```python
# FIND the block that calls DOM feature extraction and WRAP it:
if is_interstitial_page(raw_html):
    p_dom = float('nan')
    conf_dom = float('nan')
    dom_available = False
    print("[Warning] CAPTCHA/interstitial detected — skipping DOM modality")
else:
    # existing DOM extraction code here
    p_dom, conf_dom = get_dom_prediction(doc2vec, dom_model, dom_features)
    dom_available = True
```

### VERIFICATION — F9
Run:
```bash
python -c "
from inference_pipeline import is_interstitial_page

# Should detect Cloudflare interstitial
cf_html = '<html><body><div id=\"cf-browser-verification\"></div><div class=\"just-a-moment\">Please wait</div></body></html>'
result1 = is_interstitial_page(cf_html)
print('Cloudflare interstitial detected:', result1)
assert result1 == True, 'FAIL: did not detect Cloudflare interstitial'

# Should not flag normal login page
normal_html = '<html><body><form><input type=\"password\"/><input type=\"text\"/><button>Login</button></form></body></html>'
result2 = is_interstitial_page(normal_html)
print('Normal page flagged:', result2)
assert result2 == False, 'FAIL: false positive on normal page'

# Should flag empty response
result3 = is_interstitial_page('')
print('Empty response flagged:', result3)
assert result3 == True, 'FAIL: did not flag empty response'

print('F9 PASS')
"
```
**Expected output:**
```
Cloudflare interstitial detected: True
Normal page flagged: False
Empty response flagged: True
F9 PASS
```

---

## F8 — Redirect Chain URL Feature Extraction
**Severity:** HIGH
**Files:** `inference_pipeline.py`, `url_feature_extractor.py`, `train_url_production.py`
**Reason:** URL features are extracted from the entry URL only. A `bit.ly/xyz` redirect looks completely benign — the actual phishing destination URL is never analyzed.

### CHANGE 1 — Capture final URL in `inference_pipeline.py`
In your page-fetching code, after fetching with `requests` or Selenium:
```python
# With requests — add these three lines after the fetch:
response = session.get(initial_url, allow_redirects=True, timeout=timeout)
final_url = response.url
redirect_depth = len(response.history)
cross_domain_redirect = int(
    urlparse(initial_url).netloc.replace('www.', '') !=
    urlparse(final_url).netloc.replace('www.', '')
)
```

If using Selenium, after `driver.get(url)`:
```python
final_url = driver.current_url
redirect_depth = 0 if final_url == initial_url else 1  # Selenium doesn't expose full history
cross_domain_redirect = int(
    urlparse(initial_url).netloc.replace('www.', '') !=
    urlparse(final_url).netloc.replace('www.', '')
)
```

### CHANGE 2 — Add three new features to `url_feature_extractor.py`
At the end of `extract_url_features_from_string()`, add parameters and handling for the redirect features.

Add a new function to compute URL features with redirect context:
```python
def extract_url_features_with_redirect(initial_url, final_url, redirect_depth,
                                        cross_domain_redirect, feature_names):
    """
    Extends base URL feature extraction with redirect chain signals.
    """
    # Get base features from the final URL (more informative than entry URL)
    features_list = extract_url_features_from_string(final_url, feature_names)
    features_dict = dict(zip(feature_names, features_list))

    # Get entry URL score separately
    entry_features = extract_url_features_from_string(initial_url, feature_names)

    # Redirect-specific features
    features_dict['RedirectDepth'] = min(redirect_depth, 10)  # cap at 10
    features_dict['CrossDomainRedirect'] = cross_domain_redirect

    return features_dict
```

### CHANGE 3 — Register new features in `train_url_production.py`
Add to `COMPUTABLE_URL_FEATURES`:
```python
"RedirectDepth",         # ✅ number of HTTP redirects (capped at 10)
"CrossDomainRedirect",   # ✅ 0/1 — did redirect go to a different domain?
```

### VERIFICATION — F8
Run:
```bash
python -c "
from url_feature_extractor import extract_url_features_with_redirect

# Simulate a redirect: bit.ly → phishing site
d = extract_url_features_with_redirect(
    initial_url='https://bit.ly/abc123',
    final_url='http://paypal-login.tk/secure',
    redirect_depth=2,
    cross_domain_redirect=1,
    feature_names=['URLLength','DomainLength','IsDomainIP','URLSimilarityIndex',
                   'CharContinuationRate','TLDLegitimateProb','URLCharProb',
                   'TLDLength','NoOfSubDomain','HasObfuscation','NoOfObfuscatedChar',
                   'ObfuscationRatio','HasIDNHomograph','BrandKeywordInSLD',
                   'RedirectDepth','CrossDomainRedirect']
)
print('RedirectDepth:', d['RedirectDepth'])
print('CrossDomainRedirect:', d['CrossDomainRedirect'])
print('TLDLegitimateProb of final URL:', d['TLDLegitimateProb'])
assert d['RedirectDepth'] == 2, 'FAIL: redirect depth not captured'
assert d['CrossDomainRedirect'] == 1, 'FAIL: cross-domain flag not set'
assert d['TLDLegitimateProb'] == 0.0, 'FAIL: .tk should be blacklisted'
print('F8 PASS')
"
```

---

## F7 — Two-Level SHAP for Gemini
**Severity:** HIGH
**File:** `explain_prediction.py`
**Reason:** Gemini only receives fusion-level SHAP values — it knows `p_url` was the top driver but not WHY `p_url` was 0.99. Without URL-feature-level SHAP, Gemini fabricates root-cause explanations.

### CHANGE 1 — Compute URL-level SHAP inside `explain_prediction.py`
At the point where you already have the URL model and the URL feature vector, add:
```python
import shap

# URL model SHAP
url_explainer = shap.TreeExplainer(url_model)
url_shap_matrix = url_explainer.shap_values(X_url_scaled)
# url_shap_matrix is [n_classes, n_samples, n_features]
# For class 1 (phishing), single sample:
url_shap_dict = dict(zip(url_feature_names, url_shap_matrix[1][0].tolist()))
# Sort by absolute importance
url_shap_top5 = dict(sorted(url_shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:5])

# DOM model SHAP (on the embedding vector)
dom_explainer = shap.TreeExplainer(dom_lgbm_model)
dom_shap_matrix = dom_explainer.shap_values(dom_embedding.reshape(1, -1))
dom_shap_values = dom_shap_matrix[1][0].tolist()
dom_top_dims = sorted(enumerate(dom_shap_values), key=lambda x: abs(x[1]), reverse=True)[:3]
dom_shap_summary = {f"embedding_dim_{i}": v for i, v in dom_top_dims}
```

### CHANGE 2 — Update the Gemini prompt to include both levels
Replace the current Gemini prompt with:
```python
gemini_prompt = f"""
You are explaining a phishing detection decision. 
You MUST only use evidence from the structured data below.
Do NOT invent reasons. Do NOT mention features not listed here.
If a feature is absent from the evidence, do not reference it.

FINAL DECISION: {prediction}
Overall confidence: {confidence:.1%}

MODALITY SCORES:
- URL model score: {p_url:.3f} (1.0 = certain phishing)
- DOM model score: {p_dom:.3f}
- Visual model score: {p_visual:.3f}

FUSION-LEVEL EVIDENCE (which modality drove the final decision):
{json.dumps(fusion_shap_top, indent=2)}

URL-LEVEL EVIDENCE (which URL features drove the URL score of {p_url:.3f}):
{json.dumps(url_shap_top5, indent=2)}

DETECTED DOM SIGNALS (structural features present):
{dom_tokens_list}

Write exactly 3 sentences. Sentence 1: state the prediction and primary driver.
Sentence 2: name the specific URL or DOM feature with the highest SHAP value and explain what it means.
Sentence 3: state the confidence level and any conflicting signals if present.
"""
```

### VERIFICATION — F7
Run a full scan on `http://paypal-login.tk/verify`:
```bash
python -c "
from inference_complete import predict_complete_pipeline
result = predict_complete_pipeline('http://paypal-login.tk/verify')
explanation = result.get('explanation', '')
print('Explanation:', explanation)

# Check that the explanation references real feature names
real_features = ['TLD', 'tld', 'domain', 'URL', 'url', 'phishing', 'confidence']
has_real_reference = any(f.lower() in explanation.lower() for f in real_features)
assert has_real_reference, 'FAIL: Gemini explanation has no grounded feature references'
assert len(explanation) > 50, 'FAIL: explanation too short'
print('F7 PASS')
"
```

---

## F10 — Platt Scaling Calibration
**Severity:** HIGH
**File:** Create new file `calibrate_models.py`
**Reason:** LightGBM produces over-confident probability estimates. The fusion model treats `p_url=0.99` as fully reliable even when the true calibrated probability is 0.80. Calibration fixes this.

### CHANGE — Create `calibrate_models.py`
```python
"""
Platt Scaling / Isotonic Calibration for URL and DOM base models.
Run after training: python calibrate_models.py
Saves calibrated models alongside originals.
"""
import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.model_selection import train_test_split
from utils import load_config, load_dataset

def calibrate_url_model(cfg):
    print("[Calibration] Loading URL model...")
    d = joblib.load('models/url_lgbm_production.joblib')
    model, scaler, feature_names = d['model'], d['scaler'], d['feature_names']

    df = load_dataset(cfg['dataset_csv'])
    y = df['label'].astype(int).values
    X = df[[f for f in feature_names if f in df.columns]].values
    X_scaled = scaler.transform(X)

    # Hold out 20% for calibration (separate from the training split)
    _, X_cal, _, y_cal = train_test_split(X_scaled, y, test_size=0.2, random_state=123, stratify=y)

    calibrated = CalibratedClassifierCV(model, method='isotonic', cv='prefit')
    calibrated.fit(X_cal, y_cal)

    joblib.dump({
        'model': calibrated,
        'scaler': scaler,
        'feature_names': feature_names
    }, 'models/url_lgbm_calibrated.joblib')

    # Calibration curve check
    proba_cal = calibrated.predict_proba(X_cal)[:, 1]
    frac_pos, mean_pred = calibration_curve(y_cal, proba_cal, n_bins=10)
    ece = np.mean(np.abs(frac_pos - mean_pred))
    print(f"[Calibration] URL model ECE: {ece:.4f} (target: < 0.05)")
    return ece

if __name__ == "__main__":
    import json
    cfg = json.load(open('config.json'))
    ece = calibrate_url_model(cfg)
    if ece < 0.05:
        print("[Calibration] ✅ URL model calibration PASSED")
    else:
        print(f"[Calibration] ⚠️  ECE={ece:.4f} is above 0.05 — consider more calibration data")
```

Run:
```bash
python calibrate_models.py
```

### VERIFICATION — F10
```bash
python -c "
import os
assert os.path.exists('models/url_lgbm_calibrated.joblib'), 'FAIL: calibrated model not saved'
import joblib
d = joblib.load('models/url_lgbm_calibrated.joblib')
assert 'model' in d and 'scaler' in d, 'FAIL: calibrated model dict malformed'
print('F10 PASS — calibrated model saved successfully')
"
```

---

## F12 — Update Architecture Specification
**Severity:** CRITICAL (Documentation)
**Files:** `CLAUDE.md`, `README.md` (if it exists in `/fyp_multimodal_model/`)
**Reason:** The specification incorrectly states the Visual modality uses Doc2Vec. It uses ResNet-50 softmax output directly.

### CHANGE
In the ML Service Modalities table in `CLAUDE.md`, find the Visual row:
```
| Visual | ResNet50 CNN (`visual_resnet50.pt`) | Webpage screenshot |
```

Update the description column to:
```
| Visual | ResNet50 CNN — fine-tuned on ImageNet, 2-class softmax output (p_visual). No Doc2Vec. (`visual_resnet50.pt`) | Webpage screenshot |
```

Search the entire codebase for the string `Doc2Vec` — it should appear ONLY in DOM-related descriptions, never in Visual modality descriptions.

### VERIFICATION — F12
```bash
grep -rn "Doc2Vec" . --include="*.md" | grep -i "visual"
```
**Expected output:** No output (empty). If any line appears, find it and remove the Doc2Vec reference from that visual-related line.

---

## FULL TEST SUITE
**Run this only after ALL fixes above have passed their individual verifications.**

### Step 1 — Unit tests
Create `test_all_fixes.py`:
```python
"""Run: python test_all_fixes.py"""
from url_feature_extractor import extract_url_features_dict
import inspect, url_feature_extractor as ufe, math, json

PASS = []
FAIL = []

def check(name, condition, msg=""):
    if condition:
        PASS.append(name)
        print(f"  ✅ {name}")
    else:
        FAIL.append(name)
        print(f"  ❌ {name} — {msg}")

print("\n=== F1: URL Feature Variance ===")
d = extract_url_features_dict('https://www.google.com')
check("URLSimilarityIndex not 100", d['URLSimilarityIndex'] != 100.0)
check("CharContinuationRate not 1", d['CharContinuationRate'] != 1.0)
check("URLSimilarityIndex in range", 30 < d['URLSimilarityIndex'] < 90)
check("CharContinuationRate in range", 0.01 < d['CharContinuationRate'] < 0.5)

print("\n=== F4: Dead Code Removed ===")
src = inspect.getsource(ufe.extract_url_features_from_string)
check("TLD computed once", src.count('get_tld_legitimate_prob') == 1)

print("\n=== F5: Subdomain + Brand Keyword ===")
d2 = extract_url_features_dict('https://m.facebook.com')
check("m. stripped", d2['NoOfSubDomain'] == 0, f"got {d2['NoOfSubDomain']}")
d3 = extract_url_features_dict('https://paypal-login.evil.tk')
check("brand keyword detected", d3['BrandKeywordInSLD'] == 1)
d4 = extract_url_features_dict('https://www.google.com')
check("no false positive brand kw", d4['BrandKeywordInSLD'] == 0)

print("\n=== F11: IDN Homograph ===")
d5 = extract_url_features_dict('https://p\u0430ypal.com')
check("Cyrillic detected", d5['HasIDNHomograph'] == 1)
d6 = extract_url_features_dict('https://www.paypal.com')
check("Normal URL not flagged", d6['HasIDNHomograph'] == 0)

print("\n=== Model Metrics Gates ===")
try:
    with open('models/url_metrics_production.json') as f:
        um = json.load(f)
    check("URL accuracy >= 0.93", um['accuracy'] >= 0.93, f"got {um['accuracy']:.4f}")
    check("URL ROC-AUC >= 0.96", um['ROC_AUC'] >= 0.96, f"got {um['ROC_AUC']:.4f}")
    check("URL FPR <= 0.05", um['FPR'] <= 0.05, f"got {um['FPR']:.4f}")
except FileNotFoundError:
    print("  ⚠️  url_metrics_production.json not found — retrain URL model first")

try:
    with open('models/fusion_metrics.json') as f:
        fm = json.load(f)
    check("Fusion accuracy >= 0.95", fm['accuracy'] >= 0.95, f"got {fm['accuracy']:.4f}")
    check("Fusion ROC-AUC >= 0.97", fm['ROC_AUC'] >= 0.97, f"got {fm['ROC_AUC']:.4f}")
    check("Fusion FNR <= 0.08",     fm['FNR'] <= 0.08,     f"got {fm['FNR']:.4f}")
except FileNotFoundError:
    print("  ⚠️  fusion_metrics.json not found — retrain fusion model first")

try:
    with open('models/fusion_ablation.json') as f:
        ab = json.load(f)
    all_acc = ab.get('all_modalities', {}).get('accuracy', 0)
    max_single = max(
        ab.get('url_only', {}).get('accuracy', 0),
        ab.get('dom_only', {}).get('accuracy', 0),
        ab.get('visual_only', {}).get('accuracy', 0),
    )
    check("all_modalities beats every single modality", all_acc >= max_single)
except FileNotFoundError:
    print("  ⚠️  fusion_ablation.json not found")

print(f"\n{'='*40}")
print(f"RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print(f"FAILED: {FAIL}")
    exit(1)
else:
    print("ALL TESTS PASSED ✅")
```

```bash
python test_all_fixes.py
```

### Step 2 — End-to-end live URL test
```bash
python test_live_urls.py --benign --output results/post_fix_benign.json
```
**Expected:** All 8 benign URLs predicted as BENIGN. Zero phishing predictions on benign URLs = FPR at inference level is acceptable.

### Step 3 — Phishing feed test
```bash
python test_live_urls.py --file data/phising_feed.txt --output results/post_fix_phishing.json
```
**Expected:** >= 80% of phishing feed URLs predicted as PHISHING. Save and compare against pre-fix results if available.

---

## DONE

When `test_all_fixes.py` outputs `ALL TESTS PASSED ✅` and both live URL tests complete without errors, all critical and high severity fixes are implemented and verified.

**Remaining optional work (Tier 3):**
- TLS/SSL certificate features (requires modifying the HTTP fetcher)
- Adversarial robustness training for ResNet-50 (requires GPU retraining)
- Continuous retraining pipeline integration with the MLOps backend

These are documented in the separate audit report `PhishingPipeline_RedTeam_Audit.docx`.
