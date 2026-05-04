"""
Kill-switch diagnostic for F3.
Run before and after fusion model retrain to verify NaN sentinel fix.
"""
import joblib
import numpy as np

fusion = joblib.load('models/fusion_lgbm.joblib')['model']

# Strong phishing URL + strong phishing DOM + NO screenshot
# [p_url, p_dom, p_visual, conf_url, conf_dom, conf_visual, has_url, has_dom, has_visual]
X = np.array([[0.95, 0.90, float('nan'), 0.90, 0.80, float('nan'), 1.0, 1.0, 0.0]])

pred = fusion.predict(X)[0]
prob = fusion.predict_proba(X)[0][1]

print("=== KILL-SWITCH DIAGNOSTIC ===")
print(f"Input: p_url=0.95, p_dom=0.90, p_visual=MISSING")
print(f"Prediction: {'PHISHING' if pred == 1 else 'BENIGN'}")
print(f"Phishing probability: {prob:.4f}")

if pred == 0 and prob < 0.5:
    print("STATUS: KILL-SWITCH ACTIVE — model predicts BENIGN despite strong phishing signals")
    print("ACTION: Retrain fusion model with NaN-aware LGBMClassifier (use_missing=True)")
else:
    print("STATUS: Kill-switch not active")
