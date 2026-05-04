from url_feature_extractor import extract_url_features_dict

urls = [
    'http://allegro.pl-oferta73419590.icu',
    'https://zanilo.cfd/indexco.jp',
    'https://maintain.antiquels.cn/mizuho',
    'http://78382google.com',
    'https://abszfgrtr65.blogspot.com',
    'https://app.biamilhasofertas.live/inicio',
]

for u in urls:
    d = extract_url_features_dict(u)
    tld  = d.get("TLDLegitimateProb", "MISSING")
    char = d.get("URLCharProb", "MISSING")
    sub  = d.get("NoOfSubDomain", "MISSING")
    bkw  = d.get("BrandKeywordInSLD", "NOT FOUND")
    idn  = d.get("HasIDNHomograph", "NOT FOUND")

    print("\n" + u)
    print("  TLDLegitimateProb :", tld)
    print("  URLCharProb       :", char)
    print("  NoOfSubDomain     :", sub)
    print("  BrandKeywordInSLD :", bkw)
    print("  HasIDNHomograph   :", idn)

    # Diagnosis
    if tld == 0.26:
        print("  >>> PROBLEM: TLD is GREYLISTED (0.26) — not in blacklist. Should be 0.0 for phishing TLD.")
    elif tld == 0.0:
        print("  >>> OK: TLD correctly blacklisted.")
    elif tld == 0.52:
        print("  >>> WARNING: TLD is whitelisted (0.52) — model will heavily lean BENIGN.")
