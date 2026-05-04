"""
Retrain URL model using features computed FROM THE RAW URL at inference time.
This eliminates covariate shift between training and inference distributions.
Run: python retrain_url_from_extractor.py --config config.json
"""
import argparse
import os
import json
import joblib
import numpy as np
import pandas as pd
import warnings
warnings.filterwarnings("ignore")
from tqdm import tqdm
from utils import load_config, load_dataset
from url_feature_extractor import extract_url_features_from_string
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, classification_report,
                             confusion_matrix, roc_auc_score, matthews_corrcoef)
from sklearn.preprocessing import StandardScaler
from lightgbm import LGBMClassifier

# URLSimilarityIndex and CharContinuationRate are excluded:
# Both are dominated by whether the URL has a "www." prefix.
# PhiUSIIL benign URLs almost universally have www. (3-char run, low unique-char ratio)
# while phishing and legitimate non-www subdomain URLs do not.
# The model learned these as proxies for "has www." — a dataset artifact, not a
# real phishing signal — causing false positives on accounts.google.com, lms.nust.edu.pk, etc.
# PathDepth REMOVED: PhiUSIIL training URLs are bare domains (no paths),
# so PathDepth=0 for all training rows.  The model learns PathDepth>0 = phishing
# which causes massive false positives on legitimate login URLs like
# facebook.com/login, cms.bahria.edu.pk/Logins/Student/Login.aspx, etc.
INFERENCE_FEATURES = [
    "URLLength", "DomainLength", "IsDomainIP",
    "TLDLength", "NoOfSubDomain",
    "HasObfuscation", "NoOfObfuscatedChar", "ObfuscationRatio",
    "DomainDigitRatio", "DomainHyphenCount", "MaxDigitRunLength",
    "URLEntropy", "IsSLDNumeric",
    "HasIDNHomograph", "BrandKeywordInSLD",
]

def build_training_features(df, feature_names):
    """
    Recompute ALL features from raw URL string for every training sample.
    This guarantees training and inference see identical feature distributions.
    """
    # Find the URL column
    url_col = None
    for candidate in ["URL", "url", "Url", "URLURL", "domain", "Domain"]:
        if candidate in df.columns:
            url_col = candidate
            break

    if url_col is None:
        print("Available columns:", list(df.columns[:20]))
        raise ValueError("Cannot find URL column in dataset. Check column names above.")

    print(f"[Retrain] Using URL column: '{url_col}'")
    print(f"[Retrain] Recomputing {len(feature_names)} features from raw URLs...")
    print(f"[Retrain] This ensures training = inference feature distribution.")

    rows = []
    errors = 0

    for i, row in tqdm(df.iterrows(), total=len(df), desc="Extracting features"):
        url = str(row[url_col])
        try:
            feat_values = extract_url_features_from_string(url, feature_names)
            rows.append(feat_values)
        except Exception as e:
            rows.append([0.0] * len(feature_names))
            errors += 1

    if errors > 0:
        print(f"[Retrain] Warning: {errors} URLs failed feature extraction (filled with zeros)")

    return np.array(rows)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.json")
    args = parser.parse_args()

    cfg = load_config(args.config)
    print("[Retrain] Loading dataset...")
    df = load_dataset(cfg["dataset_csv"])
    print(f"[Retrain] Dataset size: {len(df)}")

    # Build features from raw URLs
    X = build_training_features(df, INFERENCE_FEATURES)
    # Dataset convention: label=0=phishing, label=1=benign
    # Flip to standard: label=0=benign, label=1=phishing
    # so that predict_proba(X)[0][1] correctly gives P(phishing)
    y = (1 - df["label"].astype(int)).values

    print(f"\n[Retrain] Feature matrix shape: {X.shape}")
    print(f"[Retrain] Sample feature values (row 0):")
    for name, val in zip(INFERENCE_FEATURES, X[0]):
        print(f"   {name}: {val}")

    # Scale and split
    scaler = StandardScaler(with_mean=False)
    X_scaled = scaler.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\n[Retrain] Training set: {len(X_train)}, Test set: {len(X_test)}")

    # Train
    print("[Retrain] Training LightGBM on inference-time features...")
    model = LGBMClassifier(
        n_estimators=400, max_depth=-1, learning_rate=0.05,
        subsample=0.9, colsample_bytree=0.9, num_leaves=64,
        random_state=42, n_jobs=-1
    )
    model.fit(X_train, y_train,
              feature_name=INFERENCE_FEATURES,
              callbacks=[])

    # Evaluate
    y_pred  = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    acc     = accuracy_score(y_test, y_pred)
    report  = classification_report(y_test, y_pred, output_dict=True)
    cm      = confusion_matrix(y_test, y_pred, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()
    fpr     = fp / (fp + tn + 1e-9)
    fnr     = fn / (fn + tp + 1e-9)
    mcc     = matthews_corrcoef(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)

    print("\n" + "=" * 60)
    print("RETRAINED MODEL RESULTS (Inference-Consistent Features)")
    print("=" * 60)
    print(f"Accuracy:            {acc:.4f} ({acc*100:.2f}%)")
    print(f"Precision (Phish):   {report['1']['precision']:.4f}")
    print(f"Recall (Phish):      {report['1']['recall']:.4f}")
    print(f"F1 (Phish):          {report['1']['f1-score']:.4f}")
    print(f"ROC-AUC:             {roc_auc:.4f}")
    print(f"MCC:                 {mcc:.4f}")
    print(f"False Positive Rate: {fpr:.4f} ({fpr*100:.2f}%)")
    print(f"False Negative Rate: {fnr:.4f} ({fnr*100:.2f}%)")
    print(f"\nConfusion Matrix:")
    print(f"  TN: {tn:6d}  |  FP: {fp:6d}")
    print(f"  FN: {fn:6d}  |  TP: {tp:6d}")

    # Quick sanity check on phishing TLDs
    print("\n[Retrain] Sanity check on phishing TLD URLs:")
    test_phishing = [
        ("http://allegro.pl-oferta73419590.icu", "phishing .icu"),
        ("https://zanilo.cfd/indexco.jp",        "phishing .cfd"),
        ("https://maintain.antiquels.cn/mizuho", "phishing .cn"),
        ("https://www.google.com",               "benign .com"),
        ("https://www.github.com",               "benign .com"),
    ]
    for url, label in test_phishing:
        feats = extract_url_features_from_string(url, INFERENCE_FEATURES)
        X_t   = scaler.transform(np.array(feats).reshape(1, -1))
        p     = model.predict_proba(X_t)[0][1]
        flag  = "[PASS]" if (p > 0.5 and "phishing" in label) or (p < 0.5 and "benign" in label) else "[FAIL]"
        print(f"  {flag} {label}: p_phish={p:.4f}")

    # Save
    os.makedirs(cfg["models_dir"], exist_ok=True)
    model_path = os.path.join(cfg["models_dir"], "url_lgbm_production.joblib")
    joblib.dump({
        "model": model,
        "scaler": scaler,
        "feature_names": INFERENCE_FEATURES
    }, model_path)

    metrics = {
        "accuracy": float(acc), "report": report,
        "confusion_matrix": cm.tolist(),
        "FPR": float(fpr), "FNR": float(fnr),
        "MCC": float(mcc), "ROC_AUC": float(roc_auc),
        "features_used": INFERENCE_FEATURES,
        "note": "Trained on inference-time feature values — covariate shift eliminated"
    }
    metrics_path = os.path.join(cfg["models_dir"], "url_metrics_production.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n[OK] Saved retrained model to: {model_path}")
    print(f"[OK] Saved metrics to: {metrics_path}")
    print("[Retrain] Done. Run diagnose_inference.py to verify p_url values.")


if __name__ == "__main__":
    main()