"""
Train Production URL Model (Computable Features Only)
Uses only features that can be calculated from raw URLs without external databases
"""

import argparse
import os
import json
import joblib
import numpy as np
import joblib
import numpy as np
import warnings
from utils import load_config, load_dataset
# Suppress the specific sklearn warning about feature names
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score, matthews_corrcoef
from sklearn.preprocessing import StandardScaler
from lightgbm import LGBMClassifier

# Features that CAN be computed from raw URLs
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

def select_features(df, wanted):
    """Select only features present in dataframe"""
    present = [c for c in wanted if c in df.columns]
    return df[present], present


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.json")
    args = parser.parse_args()

    cfg = load_config(args.config)
    df = load_dataset(cfg["dataset_csv"])

    print("="*70)
    print("TRAINING PRODUCTION URL MODEL (Computable Features Only)")
    print("="*70)
    print(f"\nDataset size: {len(df)}")
    print(f"\nDataset size: {len(df)}")
    print(f"Features used: {len(COMPUTABLE_URL_FEATURES)} (Full Feature Set)")

    # Select computable features only
    y = df["label"].astype(int).values
    X_df, used = select_features(df, COMPUTABLE_URL_FEATURES)
    X = X_df.values

    print(f"\nActually used features: {used}")
    print(f"Feature count: {len(used)}")

    # Scale
    scaler = StandardScaler(with_mean=False)
    X_scaled = scaler.fit_transform(X)

    # Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"\nTraining set: {len(X_train)}")
    print(f"Test set: {len(X_test)}")

    # Train
    print("\nTraining LightGBM...")
    model = LGBMClassifier(
        n_estimators=400,
        max_depth=-1,
        learning_rate=0.05,
        subsample=0.9,
        colsample_bytree=0.9,
        num_leaves=64,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    print("Training complete!")

    # Evaluate
    print("\nEvaluating...")
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn + 1e-9)
    fnr = fn / (fn + tp + 1e-9)
    mcc = matthews_corrcoef(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)

    # Print results
    print("\n" + "="*70)
    print("PRODUCTION MODEL RESULTS")
    print("="*70)
    print(f"Accuracy:           {acc:.4f} ({acc*100:.2f}%)")
    print(f"Precision (Phish):  {report['1']['precision']:.4f}")
    print(f"Recall (Phish):     {report['1']['recall']:.4f}")
    print(f"F1 (Phish):         {report['1']['f1-score']:.4f}")
    print(f"ROC-AUC:            {roc_auc:.4f}")
    print(f"MCC:                {mcc:.4f}")
    print(f"\nFalse Positive Rate: {fpr:.4f} ({fpr*100:.2f}%)")
    print(f"False Negative Rate: {fnr:.4f} ({fnr*100:.2f}%)")
    print("\nConfusion Matrix:")
    print(f"  TN: {tn:6d}  |  FP: {fp:6d}")
    print(f"  FN: {fn:6d}  |  TP: {tp:6d}")

    # Save model
    os.makedirs(cfg["models_dir"], exist_ok=True)
    model_path = os.path.join(cfg["models_dir"], "url_lgbm_production.joblib")
    joblib.dump({
        "model": model,
        "scaler": scaler,
        "feature_names": used
    }, model_path)

    # Save metrics
    metrics = {
        "accuracy": float(acc),
        "report": report,
        "confusion_matrix": cm.tolist(),
        "FPR": float(fpr),
        "FNR": float(fnr),
        "MCC": float(mcc),
        "ROC_AUC": float(roc_auc),
        "features_used": used,
        "num_features": len(used),
        "note": "Production model using ALL 12 features (heuristic strategy enabled)"
    }
    
    metrics_path = os.path.join(cfg["models_dir"], "url_metrics_production.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"\n✅ Saved production model to: {model_path}")
    print(f"✅ Saved metrics to: {metrics_path}")
    
    # Compare with research model
    print("\n" + "="*70)
    print("COMPARISON: Research vs Production Model")
    print("="*70)
    
    try:
        research_metrics = json.load(open(os.path.join(cfg["models_dir"], "url_metrics.json")))
        research_acc = research_metrics["accuracy"]
        
        print(f"Research Model (12 features):   {research_acc:.4f} ({research_acc*100:.2f}%)")
        print(f"Production Model (12 features): {acc:.4f} ({acc*100:.2f}%)")
        print(f"Accuracy Drop:                  {(research_acc - acc):.4f} ({(research_acc - acc)*100:.2f}%)")
        
        if (research_acc - acc) < 0.02:
            print("\n✅ Minimal accuracy loss! Production model is viable.")
        else:
            print(f"\n⚠️  Accuracy dropped by {(research_acc - acc)*100:.2f}%. Consider keeping for demo only.")
    except:
        print("(Research model metrics not found for comparison)")
    
    print("\n" + "="*70)
    print("Training complete!")
    print("="*70)


if __name__ == "__main__":
    main()
