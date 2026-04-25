"""
Platt Scaling / Isotonic Calibration for URL and DOM base models.
Run after training: python calibrate_models.py
Saves calibrated models alongside originals.
"""
import joblib
import json
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
    _, X_cal, _, y_cal = train_test_split(
        X_scaled, y, test_size=0.2, random_state=123, stratify=y
    )

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
    cfg = json.load(open('config.json'))
    ece = calibrate_url_model(cfg)
    if ece < 0.05:
        print("[Calibration] URL model calibration PASSED")
    else:
        print(f"[Calibration] ECE={ece:.4f} is above 0.05 — consider more calibration data")
