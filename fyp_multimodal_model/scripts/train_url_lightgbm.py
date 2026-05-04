
"""
URL Modality Model (LightGBM)
- Uses lexical/statistical URL features available in the PhiUSIIL dataset.
- Saves: models/url_lgbm.txt and a metrics json.
Run:
  python train_url_lightgbm.py --config config.json
"""
import argparse, os, json, joblib, numpy as np
from utils import load_config, load_dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler
from lightgbm import LGBMClassifier

URL_FEATURES = [
    "URLLength","DomainLength","IsDomainIP","URLSimilarityIndex","CharContinuationRate",
    "TLDLegitimateProb","URLCharProb","TLDLength","NoOfSubDomain","HasObfuscation",
    "NoOfObfuscatedChar","ObfuscationRatio"
]

# Some datasets may not include all features; select those present.
def select_features(df, wanted):
    present = [c for c in wanted if c in df.columns]
    return df[present], present

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.json")
    args = parser.parse_args()

    cfg = load_config(args.config)
    df = load_dataset(cfg["dataset_csv"])

    # label: 1=phishing, 0=benign (assumed)
    y = df["label"].astype(int).values
    X_df, used = select_features(df, URL_FEATURES)
    X = X_df.values

    # scale numeric features for stability (LGBM is tree-based but scaling is harmless)
    scaler = StandardScaler(with_mean=False)  # keep sparse-like behavior safe
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42, stratify=y)

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

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)

    os.makedirs(cfg["models_dir"], exist_ok=True)
    joblib.dump({"model": model, "scaler": scaler, "feature_names": used}, os.path.join(cfg["models_dir"], "url_lgbm.joblib"))

    metrics = {"accuracy": acc, "report": report, "features_used": used}
    with open(os.path.join(cfg["models_dir"], "url_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    print(f"[URL] Accuracy: {acc:.4f}")
    print(f"[URL] Used features: {used}")
    print(f"[URL] Saved model to {os.path.join(cfg['models_dir'], 'url_lgbm.joblib')}")
    print(f"[URL] Metrics saved to {os.path.join(cfg['models_dir'], 'url_metrics.json')}")

if __name__ == "__main__":
    main()
