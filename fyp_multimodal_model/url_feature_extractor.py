"""
URL Feature Extraction for PhiUSIIL-format inference.
All features are 100% computable from raw URL strings — no external databases.
"""

import re
import math
import itertools
from urllib.parse import urlparse
from collections import Counter

try:
    import tldextract
    _TLDEXTRACT_AVAILABLE = True
except ImportError:
    _TLDEXTRACT_AVAILABLE = False


def _parse_domain_parts(domain: str):
    """
    Returns (subdomain, sld, tld) using tldextract when available.
    Falls back to naive split only as a last resort.
    tldextract handles multi-part public suffixes (edu.pk, ac.uk, co.in, etc.)
    so that bahria.edu.pk is correctly parsed as subdomain='', sld='bahria', tld='edu.pk'.
    """
    if _TLDEXTRACT_AVAILABLE:
        ext = tldextract.extract(domain)
        return ext.subdomain, ext.domain, ext.suffix
    # Fallback: treat last label as TLD, second-to-last as SLD, rest as subdomain
    parts = domain.lower().split('.')
    if len(parts) >= 2:
        return '.'.join(parts[:-2]), parts[-2], parts[-1]
    return '', domain, ''


def check_idn_homograph(domain: str) -> int:
    """
    Returns 1 if domain uses non-ASCII characters or encodes to Punycode (xn--).
    Either condition indicates a potential homograph/IDN spoofing attack.
    """
    try:
        domain.encode('ascii')
    except UnicodeEncodeError:
        return 1

    try:
        encoded = domain.encode('idna').decode('ascii')
        if 'xn--' in encoded:
            return 1
    except Exception:
        pass

    return 0


def _normalize_url(url_string: str) -> str:
    """
    Normalize bare domains by prepending www. when no subdomain is present.
    PhiUSIIL benign training URLs almost universally have www., so bare-domain
    inference inputs (e.g. https://bahria.edu.pk) fall outside the learned
    benign feature distribution.  Adding www. moves length-sensitive features
    (URLLength, DomainLength, URLSimilarityIndex) back into the training range.
    Phishing URLs that also lack subdomains are normalised too, but their
    remaining discriminating signals (short/free TLD, digit runs, hyphens,
    brand-keyword SLD) still reliably flag them.
    """
    try:
        parsed = urlparse(url_string)
        domain = parsed.netloc
        if not domain:
            return url_string
        subdomain_str, _, _ = _parse_domain_parts(domain)
        if not subdomain_str:
            new_domain = 'www.' + domain
            return url_string.replace('://' + domain, '://' + new_domain, 1)
    except Exception:
        pass
    return url_string


def extract_url_features_from_string(url_string, feature_names):
    """
    Extract URL features matching the PhiUSIIL dataset format.
    """
    try:
        url_string = _normalize_url(url_string)
        parsed = urlparse(url_string)
        domain = parsed.netloc
        full_url = url_string

        features = {}

        # 1. URLLength
        features["URLLength"] = len(full_url)

        # 2. DomainLength
        features["DomainLength"] = len(domain)

        # 3. IsDomainIP
        ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
        features["IsDomainIP"] = 1 if re.match(ip_pattern, domain) else 0

        # 4. URLSimilarityIndex
        if len(full_url) > 0:
            features["URLSimilarityIndex"] = (len(set(full_url)) / len(full_url)) * 100.0
        else:
            features["URLSimilarityIndex"] = 0.0

        # 5. CharContinuationRate
        if len(full_url) > 0:
            groups = [len(list(g)) for _, g in itertools.groupby(full_url)]
            max_run = max(groups) if groups else 0
            features["CharContinuationRate"] = max_run / len(full_url)
        else:
            features["CharContinuationRate"] = 0.0

        # 6. TLDLength — use the full public suffix so edu.pk → len=6, not len=2
        subdomain_str, sld_str, tld_str = _parse_domain_parts(domain)
        features["TLDLength"] = len(tld_str) if tld_str else 0

        # 7. NoOfSubDomain + BrandKeywordInSLD
        # subdomain_str/sld_str/tld_str already set by TLDLength block above.
        # Legitimate subdomain labels that should NOT count toward NoOfSubDomain.
        # Kept consistent with what the model was trained on — do not expand
        # without also retraining (training-inference mismatch if changed).
        STANDARD_PREFIXES = {
            'www', 'www2', 'm', 'mobile', 'api', 'cdn', 'static', 'assets',
            'mail', 'email', 'smtp', 'webmail', 'support', 'help',
            'blog', 'shop', 'store', 'dev', 'staging', 'beta', 'secure',
            # Auth / account portals — added in retrain v2
            'login', 'signin', 'auth', 'accounts', 'account', 'sso', 'id',
            'appleid', 'portal', 'console', 'dashboard', 'dash',
            # LMS / academic portals
            'lms', 'lms2', 'vulms', 'elms', 'cms', 'erp', 'sis',
            # Cloud & tech subdomains
            'studio', 'analytics', 'ads', 'search', 'drive', 'maps',
            'play', 'cloud', 'apps', 'app', 'docs', 'meet', 'chat',
            'business', 'adsmanager',
            # Short govt subdomains (e.fbr.gov.pk, id.nadra.gov.pk)
            'e', 'my', 'go', 'web',
        }
        sub_labels = [l for l in subdomain_str.split('.') if l] if subdomain_str else []
        while sub_labels and any(
            sub_labels[0] == p or sub_labels[0].startswith(p + '-')
            for p in STANDARD_PREFIXES
        ):
            sub_labels = sub_labels[1:]
        features["NoOfSubDomain"] = len(sub_labels)

        # Company names: checked in BOTH SLD and subdomains.
        # For subdomains, only flag when the SLD is NOT the company itself
        # (accounts.google.com → subdomain "accounts", SLD "google" = real Google → no flag;
        #  paypal-login.secure.tk → subdomain "paypal-login", SLD "secure" ≠ paypal → flag).
        # Generic phish-words (login, verify, account, …): SLD-only check.
        # 'bank'/'banking' intentionally excluded — every legitimate bank uses them.
        COMPANY_NAMES = {
            'paypal', 'amazon', 'google', 'microsoft', 'apple', 'facebook',
            'instagram', 'netflix', 'ebay', 'coinbase', 'binance', 'chase',
            'wellsfargo', 'citibank', 'hsbc', 'halifax', 'santander'
        }
        PHISH_WORDS = {
            'secure', 'login', 'signin', 'verify', 'verification',
            'account', 'update', 'confirm', 'wallet', 'crypto'
        }
        sld_check = sld_str.lower() if sld_str else ''

        brand_in_sld = any(
            kw in sld_check and sld_check != kw
            for kw in (COMPANY_NAMES | PHISH_WORDS)
        )
        # Flag a company name in a subdomain only when the SLD is not that company
        brand_in_subdomain = any(
            kw in sub_label and sub_label != kw and sld_check != kw
            for sub_label in sub_labels
            for kw in COMPANY_NAMES
        )
        features["BrandKeywordInSLD"] = 1 if (brand_in_sld or brand_in_subdomain) else 0

        # Flat label list for features that need it
        parts = [l for l in (subdomain_str + '.' + sld_str + '.' + tld_str).split('.') if l]

        # 8. HasObfuscation
        obfuscation_chars = ['@', '%20', '%', '\\', '///', '..']
        features["HasObfuscation"] = 1 if any(char in full_url for char in obfuscation_chars) else 0

        # 9. NoOfObfuscatedChar
        obfuscation_count = sum(full_url.count(char) for char in ['@', '%', '\\'])
        features["NoOfObfuscatedChar"] = obfuscation_count

        # 10. ObfuscationRatio
        if len(full_url) > 0:
            features["ObfuscationRatio"] = obfuscation_count / len(full_url)
        else:
            features["ObfuscationRatio"] = 0.0

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

        # ---- URLEntropy -------------------------------------------------
        # Shannon entropy -- phishing URLs have higher randomness
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
        sld_stripped = sld_str.replace('-', '').replace('_', '')
        features["IsSLDNumeric"] = (
            1 if sld_stripped.isdigit() and len(sld_stripped) > 0 else 0
        )

        # ── NEW FEATURE 6: PathDepth ──────────────────────────────────
        # Number of path segments in the URL
        # Phishing URLs often have deep paths to simulate legitimate structure
        path_parts = [p for p in parsed.path.split('/') if p]
        features["PathDepth"] = len(path_parts)

        # 11. HasIDNHomograph
        features["HasIDNHomograph"] = check_idn_homograph(domain)

        # Return ordered list
        return [features.get(fn, 0) for fn in feature_names]

    except Exception as e:
        print(f"[Feature Extraction Error] {e}")
        return [0.0] * len(feature_names)


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


def extract_url_features_with_redirect(initial_url, final_url, redirect_depth,
                                        cross_domain_redirect, feature_names):
    """
    Extends base URL feature extraction with redirect chain signals.
    Extracts features from the final (destination) URL, then appends redirect metadata.
    """
    features_list = extract_url_features_from_string(final_url, feature_names)
    features_dict = dict(zip(feature_names, features_list))
    features_dict['RedirectDepth'] = min(redirect_depth, 10)
    features_dict['CrossDomainRedirect'] = cross_domain_redirect
    return features_dict


if __name__ == "__main__":
    import json
    urls = ["https://www.google.com", "https://aviationfocus.aero", "http://x7z-login.tk"]
    results = {}
    for u in urls:
        print(f"Processing: {u}")
        features = extract_url_features_dict(u)
        results[u] = features
        print(features)
    
    output_file = "url_features_local.json"
    with open(output_file, "w") as f:
        json.dump(results, f, indent=4)
    
    print(f"\nResults saved locally to {output_file}")
