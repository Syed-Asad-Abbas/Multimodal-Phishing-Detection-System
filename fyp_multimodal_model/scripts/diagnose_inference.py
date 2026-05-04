"""
Diagnose what the inference pipeline actually feeds to the fusion model.
Run: python diagnose_inference.py
"""
import joblib
import numpy as np
from url_feature_extractor import extract_url_features_dict

# Load the URL model
d = joblib.load('models/url_lgbm_production.joblib')
url_model = d['model']
url_scaler = d['scaler']
url_features = d['feature_names']

test_urls = [
    'http://allegro.pl-oferta73419590.icu',
    'https://zanilo.cfd/indexco.jp',
    'https://maintain.antiquels.cn/mizuho',
    'http://allegrolokalnie.oferta212472.sbs',
]

print("=" * 60)
print("URL MODEL INFERENCE DIAGNOSIS")
print("=" * 60)

for url in test_urls:
    print(f"\nURL: {url}")

    # Step 1: Extract features
    feat_dict = extract_url_features_dict(url)
    
    # Step 2: Build feature vector in model's expected order
    try:
        feat_vector = [feat_dict.get(fn, 0) for fn in url_features]
        X = np.array(feat_vector).reshape(1, -1)
        X_scaled = url_scaler.transform(X)
        proba = url_model.predict_proba(X_scaled)[0]
        p_url = proba[1]
        print(f"  Features used by model: {url_features}")
        print(f"  TLDLegitimateProb in vector: {feat_dict.get('TLDLegitimateProb', 'MISSING')}")
        print(f"  URLCharProb in vector:       {feat_dict.get('URLCharProb', 'MISSING')}")
        print(f"  p_url (phishing prob):       {p_url:.4f}")
        if p_url > 0.5:
            print(f"  >>> URL model says: PHISHING ({p_url:.1%})")
        else:
            print(f"  >>> URL model says: BENIGN ({1-p_url:.1%}) ← PROBLEM HERE")
    except Exception as e:
        print(f"  ERROR: {e}")

print("\n" + "=" * 60)
print("FUSION MODEL INPUT DIAGNOSIS")
print("=" * 60)

# Load fusion model
fusion = joblib.load('models/fusion_lgbm.joblib')['model']

# Simulate what happens with p_url for .icu domain
feat_dict = extract_url_features_dict('http://allegro.pl-oferta73419590.icu')
feat_vector = [feat_dict.get(fn, 0) for fn in url_features]
X = np.array(feat_vector).reshape(1, -1)
X_scaled = url_scaler.transform(X)
proba = url_model.predict_proba(X_scaled)[0]
p_url = proba[1]
signed_conf = (p_url - 0.5) * 2.0

print(f"\nFor http://allegro.pl-oferta73419590.icu:")
print(f"  p_url = {p_url:.4f}")
print(f"  signed_conf = {signed_conf:.4f}")

# Test fusion with only URL modality (DOM and Visual missing)
X_fusion = np.array([[p_url, np.nan, np.nan,
                       signed_conf, np.nan, np.nan,
                       1.0, 0.0, 0.0]])

try:
    pred = fusion.predict(X_fusion)[0]
    prob = fusion.predict_proba(X_fusion)[0][1]
    print(f"  Fusion prediction: {'PHISHING' if pred==1 else 'BENIGN'}")
    print(f"  Fusion phishing prob: {prob:.4f}")
except Exception as e:
    # Try with -1.0 sentinel instead of NaN
    print(f"  NaN failed ({e}), trying -1.0 sentinel...")
    X_fusion_old = np.array([[p_url, -1.0, -1.0,
                               signed_conf, 0.0, 0.0,
                               1.0, 0.0, 0.0]])
    pred = fusion.predict(X_fusion_old)[0]
    prob = fusion.predict_proba(X_fusion_old)[0][1]
    print(f"  Fusion prediction (-1.0 sentinel): {'PHISHING' if pred==1 else 'BENIGN'}")
    print(f"  Fusion phishing prob: {prob:.4f}")
    