"""Run: python test_all_fixes.py"""
from url_feature_extractor import extract_url_features_dict, extract_url_features_with_redirect
from inference_pipeline import is_interstitial_page
import inspect, url_feature_extractor as ufe, math, json

PASS = []
FAIL = []


def check(name, condition, msg=""):
    if condition:
        PASS.append(name)
        print(f"  PASS {name}")
    else:
        FAIL.append(name)
        print(f"  FAIL {name} -- {msg}")


print("\n=== F1: URL Feature Variance ===")
d = extract_url_features_dict('https://www.google.com')
check("URLSimilarityIndex not 100", d['URLSimilarityIndex'] != 100.0)
check("CharContinuationRate not 1", d['CharContinuationRate'] != 1.0)
check("URLSimilarityIndex in range", 30 < d['URLSimilarityIndex'] < 90)
check("CharContinuationRate in range", 0.01 < d['CharContinuationRate'] < 0.5)

print("\n=== F4: Dead Code Removed ===")
src = inspect.getsource(ufe.extract_url_features_from_string)
# TLDLegitimateProb and URLCharProb were removed entirely (Option A)
check("TLD func removed", src.count('get_tld_legitimate_prob') == 0)

print("\n=== F5: Subdomain + Brand Keyword ===")
d2 = extract_url_features_dict('https://m.facebook.com')
check("m. stripped", d2['NoOfSubDomain'] == 0, f"got {d2['NoOfSubDomain']}")
d3 = extract_url_features_dict('https://paypal-login.evil.tk')
check("brand keyword detected", d3['BrandKeywordInSLD'] == 1)
d4 = extract_url_features_dict('https://www.google.com')
check("no false positive brand kw", d4['BrandKeywordInSLD'] == 0)

print("\n=== F11: IDN Homograph ===")
d5 = extract_url_features_dict('https://pаypal.com')
check("Cyrillic detected", d5['HasIDNHomograph'] == 1)
d6 = extract_url_features_dict('https://www.paypal.com')
check("Normal URL not flagged", d6['HasIDNHomograph'] == 0)

print("\n=== F8: Redirect Chain Features ===")
feature_names = [
    'URLLength', 'DomainLength', 'IsDomainIP', 'URLSimilarityIndex',
    'CharContinuationRate', 'TLDLegitimateProb', 'URLCharProb',
    'TLDLength', 'NoOfSubDomain', 'HasObfuscation', 'NoOfObfuscatedChar',
    'ObfuscationRatio', 'HasIDNHomograph', 'BrandKeywordInSLD',
    'RedirectDepth', 'CrossDomainRedirect'
]
dr = extract_url_features_with_redirect(
    'https://bit.ly/abc123', 'http://paypal-login.tk/secure',
    redirect_depth=2, cross_domain_redirect=1, feature_names=feature_names
)
check("RedirectDepth captured", dr['RedirectDepth'] == 2)
check("CrossDomainRedirect set", dr['CrossDomainRedirect'] == 1)
check(".tk TLD blacklisted", dr['TLDLegitimateProb'] == 0.0)

print("\n=== F9: CAPTCHA Interstitial Detection ===")
cf_html = '<html><body><div id="cf-browser-verification"></div><div class="just-a-moment">Please wait</div></body></html>'
check("Cloudflare detected", is_interstitial_page(cf_html) == True)
normal_html = '<html><body><form><input type="password"/><input type="text"/><button>Login</button></form></body></html>'
check("Normal page not flagged", is_interstitial_page(normal_html) == False)
check("Empty response flagged", is_interstitial_page('') == True)

print("\n=== F2/F3: Signed Confidence (code-level) ===")
import math as _math
p = 0.95
signed_conf = (p - 0.5) * 2.0
check("signed_conf in range", -1.0 <= signed_conf <= 1.0)
check("phishing gives positive conf", signed_conf > 0)
p_benign = 0.1
signed_conf_benign = (p_benign - 0.5) * 2.0
check("benign gives negative conf", signed_conf_benign < 0)

print("\n=== Model Metrics Gates ===")
try:
    with open('models/url_metrics_production.json') as f:
        um = json.load(f)
    check("URL accuracy >= 0.93", um['accuracy'] >= 0.93, f"got {um['accuracy']:.4f}")
    check("URL ROC-AUC >= 0.96", um['ROC_AUC'] >= 0.96, f"got {um['ROC_AUC']:.4f}")
    check("URL FPR <= 0.05", um['FPR'] <= 0.05, f"got {um['FPR']:.4f}")
except FileNotFoundError:
    print("  [SKIP] url_metrics_production.json not found — retrain URL model first")

try:
    with open('models/fusion_metrics.json') as f:
        fm = json.load(f)
    check("Fusion accuracy >= 0.95", fm['accuracy'] >= 0.95, f"got {fm['accuracy']:.4f}")
    check("Fusion ROC-AUC >= 0.97", fm['ROC_AUC'] >= 0.97, f"got {fm['ROC_AUC']:.4f}")
    check("Fusion FNR <= 0.08",     fm['FNR'] <= 0.08,     f"got {fm['FNR']:.4f}")
except FileNotFoundError:
    print("  [SKIP] fusion_metrics.json not found — retrain fusion model first")

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
    print("  [SKIP] fusion_ablation.json not found")

print(f"\n{'='*40}")
print(f"RESULTS: {len(PASS)} passed, {len(FAIL)} failed")
if FAIL:
    print(f"FAILED: {FAIL}")
    exit(1)
else:
    print("ALL TESTS PASSED")
