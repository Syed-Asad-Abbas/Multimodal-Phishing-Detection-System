"""
Fusion Layer Model Training
- Combines outputs from URL, DOM, and Visual modalities
- Uses meta-classifier (LightGBM) with dynamic weighting
- Handles missing modalities gracefully
- Includes ablation study to validate fusion improvement

Run:
  python train_fusion_model.py --config config.json
"""

import argparse
import os
import json
import math
import joblib
import numpy as np
import pandas as pd
from tqdm import tqdm
from utils import load_config, load_dataset, build_dom_tokens
from url_feature_extractor import extract_url_features_from_string
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    roc_auc_score, matthews_corrcoef
)
from lightgbm import LGBMClassifier
from PIL import Image
import torch
from torchvision import transforms, models
import torch.nn as nn
def load_url_model(models_dir):
    """Load trained URL model (Production version)"""
    path = os.path.join(models_dir, "url_lgbm_production.joblib")
    data = joblib.load(path)
    return data["model"], data["scaler"], data["feature_names"]



def load_dom_model(models_dir):
    """Load trained DOM model"""
    path = os.path.join(models_dir, "dom_doc2vec_lgbm.joblib")
    data = joblib.load(path)
    return data["doc2vec"], data["model"]


def load_visual_model(models_dir, device):
    """Load trained Visual model"""
    path = os.path.join(models_dir, "visual_resnet50.pt")
    model = models.resnet50(weights=None)
    model.fc = nn.Linear(model.fc.in_features, 2)
    model.load_state_dict(torch.load(path, map_location=device))
    model = model.to(device)
    model.eval()
    return model


def get_url_prediction(url_model, scaler, feature_names, row):
    """Get URL modality prediction using raw URL string via feature extractor"""
    try:
        url_str = str(row.get('url', row.get('URL', row.get('Url', ''))))
        features = extract_url_features_from_string(url_str, feature_names)
        X = np.array(features).reshape(1, -1)
        X_scaled = scaler.transform(X)
        proba = url_model.predict_proba(X_scaled)[0]  # [p_benign, p_phish]
        signed_conf = (proba[1] - 0.5) * 2.0
        return proba[1], signed_conf
    except Exception as e:
        return float('nan'), float('nan')


def get_dom_prediction(doc2vec_model, dom_model, row):
    """Get DOM modality prediction.
    DOM model trained with non-flipped PhiUSIIL labels: proba[1] = P(benign).
    We invert here so the returned value is consistently P(phishing).
    """
    try:
        tokens = build_dom_tokens(row)
        embedding = doc2vec_model.infer_vector(tokens)
        proba = dom_model.predict_proba([embedding])[0]
        # proba[1] = P(benign in PhiUSIIL) — invert to get P(phishing)
        p_phish = 1.0 - proba[1]
        signed_conf = (p_phish - 0.5) * 2.0
        return p_phish, signed_conf
    except Exception as e:
        return float('nan'), float('nan')


def get_visual_prediction(visual_model, image_path, device):
    """Get Visual modality prediction"""
    try:
        if not os.path.exists(image_path):
            return float('nan'), float('nan')

        transform = transforms.Compose([
            transforms.Resize((256, 256)),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        img = Image.open(image_path).convert("RGB")
        img_tensor = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            out = visual_model(img_tensor)
            probs = torch.softmax(out, dim=1)[0]
            p_phish = probs[1].item()
            signed_conf = (p_phish - 0.5) * 2.0

        return p_phish, signed_conf
    except Exception as e:
        return float('nan'), float('nan')


def build_fusion_features(df, url_model, url_scaler, url_features,
                          doc2vec, dom_model, visual_model, 
                          image_dir, device):
    """
    Build fusion training data from all modalities
    Returns: X (fusion features), y (labels), metadata
    """
    fusion_data = []
    
    for idx, row in tqdm(df.iterrows(), total=len(df), desc="Building fusion features"):
        # URL modality
        p_url, conf_url = get_url_prediction(url_model, url_scaler, url_features, row)
        
        # DOM modality
        p_dom, conf_dom = get_dom_prediction(doc2vec, dom_model, row)
        
        # Visual modality
        filename = str(row["FILENAME"])
        stem = os.path.splitext(filename)[0]
        img_path = None
        for ext in [".png", ".jpg", ".PNG", ".JPG"]:
            for variant in [f"{stem}{ext}", f"{stem}.txt{ext}"]:
                candidate = os.path.join(image_dir, variant)
                if os.path.exists(candidate):
                    img_path = candidate
                    break
            if img_path:
                break
        
        p_visual, conf_visual = get_visual_prediction(visual_model, img_path, device) if img_path else (float('nan'), float('nan'))

        # Build fusion feature vector
        features = [
            p_url,           # URL phishing probability
            p_dom,           # DOM phishing probability
            p_visual,        # Visual phishing probability
            conf_url,        # URL signed confidence
            conf_dom,        # DOM signed confidence
            conf_visual,     # Visual signed confidence
            0.0 if math.isnan(p_url)    else 1.0,  # has_url flag
            0.0 if math.isnan(p_dom)    else 1.0,  # has_dom flag
            0.0 if math.isnan(p_visual) else 1.0,  # has_visual flag
        ]

        fusion_data.append({
            "features": features,
            # Dataset: 0=phishing, 1=benign → flip to standard: 0=benign, 1=phishing
            "label": 1 - int(row["label"]),
            "filename": filename,
            "has_visual": not math.isnan(p_visual)
        })
    
    X = np.array([d["features"] for d in fusion_data])
    y = np.array([d["label"] for d in fusion_data])
    metadata = pd.DataFrame([{
        "filename": d["filename"],
        "label": d["label"],
        "has_visual": d["has_visual"]
    } for d in fusion_data])
    
    return X, y, metadata


def simulate_missing_modalities(X, y, dom_missing_rate=0.25, visual_missing_rate=0.50,
                                 rng_seed=42):
    """
    Augment fusion training data by simulating missing DOM/Visual modalities.

    During training every row has DOM (from CSV) and some have Visual (from images).
    At inference, DOM requires a live page fetch and Visual requires a screenshot —
    both can fail.  Without augmentation the fusion model has no training signal for
    NaN inputs and falls back to predicting PHISHING for everything.

    Feature vector layout:
      [p_url, p_dom, p_visual, conf_url, conf_dom, conf_visual, has_url, has_dom, has_visual]
       idx:  0     1       2        3        4          5         6       7       8
    """
    rng = np.random.RandomState(rng_seed)
    X_aug = X.copy().astype(float)
    n = len(X_aug)

    # Simulate missing DOM for dom_missing_rate fraction
    dom_mask = rng.rand(n) < dom_missing_rate
    X_aug[dom_mask, 1] = np.nan   # p_dom
    X_aug[dom_mask, 4] = np.nan   # conf_dom
    X_aug[dom_mask, 7] = 0.0      # has_dom

    # Simulate missing Visual for visual_missing_rate fraction (independently)
    vis_mask = rng.rand(n) < visual_missing_rate
    X_aug[vis_mask, 2] = np.nan   # p_visual
    X_aug[vis_mask, 5] = np.nan   # conf_visual
    X_aug[vis_mask, 8] = 0.0      # has_visual

    # Stack augmented rows with originals so the model sees both complete
    # and partial vectors at training time
    X_combined = np.vstack([X, X_aug])
    y_combined = np.concatenate([y, y])

    print(f"[Fusion] Augmented with {dom_missing_rate*100:.0f}% missing DOM rows + "
          f"{visual_missing_rate*100:.0f}% missing Visual rows "
          f"({n} -> {len(X_combined)} total training rows)")
    return X_combined, y_combined


def train_fusion_classifier(X_train, y_train, X_test, y_test):
    """Train meta-classifier for fusion"""
    clf = LGBMClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=5,
        num_leaves=31,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=-1,
        use_missing=True,
        zero_as_missing=False
    )
    
    clf.fit(X_train, y_train)
    
    # Evaluate
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1]
    
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    cm = confusion_matrix(y_test, y_pred, labels=[0, 1])
    
    tn, fp, fn, tp = cm.ravel()
    fpr = fp / (fp + tn + 1e-9)
    fnr = fn / (fn + tp + 1e-9)
    mcc = matthews_corrcoef(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)
    
    metrics = {
        "accuracy": float(acc),
        "report": report,
        "confusion_matrix": cm.tolist(),
        "FPR": float(fpr),
        "FNR": float(fnr),
        "MCC": float(mcc),
        "ROC_AUC": float(roc_auc)
    }
    
    return clf, metrics


def ablation_study(X, y, metadata):
    """
    Run ablation study comparing different modality combinations
    Returns dict with results for each combination
    """
    print("\n[Fusion] Running ablation study...")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    results = {}
    
    # Define feature indices
    # [p_url, p_dom, p_visual, conf_url, conf_dom, conf_visual, has_url, has_dom, has_visual]
    combinations = {
        "url_only": [0, 3, 6],           # p_url, conf_url, has_url
        "dom_only": [1, 4, 7],           # p_dom, conf_dom, has_dom
        "visual_only": [2, 5, 8],        # p_visual, conf_visual, has_visual
        "url_dom": [0, 1, 3, 4, 6, 7],
        "url_visual": [0, 2, 3, 5, 6, 8],
        "dom_visual": [1, 2, 4, 5, 7, 8],
        "all_modalities": list(range(9))
    }
    
    for name, indices in combinations.items():
        print(f"  Testing: {name}...")
        
        X_train_sub = X_train[:, indices]
        X_test_sub = X_test[:, indices]
        
        # For visual-only, filter BOTH train AND test to visual-present samples
        if name == "visual_only":
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

        clf = LGBMClassifier(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=5,
            num_leaves=31,
            random_state=42,
            n_jobs=-1,
            use_missing=True,
            zero_as_missing=False
        )
        clf.fit(X_train_sub, y_train_sub)
        
        y_pred = clf.predict(X_test_sub)
        acc = accuracy_score(y_test_sub, y_pred)
        report = classification_report(y_test_sub, y_pred, output_dict=True)
        
        results[name] = {
            "accuracy": float(acc),
            "precision_phish": float(report["1"]["precision"]),
            "recall_phish": float(report["1"]["recall"]),
            "f1_phish": float(report["1"]["f1-score"])
        }
    
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--sample_size", type=int, default=None, 
                       help="Use subset for faster testing (e.g., 10000)")
    args = parser.parse_args()
    
    print("[Fusion] Loading configuration...")
    cfg = load_config(args.config)
    models_dir = cfg["models_dir"]
    image_dir = cfg["image_dir"]
    
    # Device
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[Fusion] Using device: {device}")
    
    # Load dataset
    print("[Fusion] Loading dataset...")
    df = load_dataset(cfg["dataset_csv"])
    
    if args.sample_size:
        df = df.sample(n=min(args.sample_size, len(df)), random_state=42)
        print(f"[Fusion] Using sample size: {len(df)}")
    
    # Load all three trained models
    print("[Fusion] Loading URL model...")
    url_model, url_scaler, url_features = load_url_model(models_dir)
    
    print("[Fusion] Loading DOM model...")
    doc2vec, dom_model = load_dom_model(models_dir)
    
    print("[Fusion] Loading Visual model...")
    visual_model = load_visual_model(models_dir, device)
    
    # Build fusion training data
    print("[Fusion] Building fusion features from all modalities...")
    X, y, metadata = build_fusion_features(
        df, url_model, url_scaler, url_features,
        doc2vec, dom_model, visual_model,
        image_dir, device
    )
    
    print(f"[Fusion] Built fusion dataset: {X.shape[0]} samples, {X.shape[1]} features")
    print(f"[Fusion] Samples with visual data: {metadata['has_visual'].sum()} / {len(metadata)}")

    # Augment with simulated missing modalities before splitting.
    # This teaches the model how to predict when DOM/Visual are unavailable at inference.
    X_aug, y_aug = simulate_missing_modalities(X, y, dom_missing_rate=0.25, visual_missing_rate=0.50)

    # Split data (use augmented set for train/test; ablation still uses original X/y)
    X_train, X_test, y_train, y_test = train_test_split(
        X_aug, y_aug, test_size=0.2, random_state=42, stratify=y_aug
    )
    
    # Train fusion classifier
    print("[Fusion] Training fusion meta-classifier...")
    fusion_clf, fusion_metrics = train_fusion_classifier(X_train, y_train, X_test, y_test)
    
    print(f"\n[Fusion] Fusion Model Performance:")
    print(f"  Accuracy: {fusion_metrics['accuracy']:.4f}")
    print(f"  Precision (phish): {fusion_metrics['report']['1']['precision']:.4f}")
    print(f"  Recall (phish): {fusion_metrics['report']['1']['recall']:.4f}")
    print(f"  F1 (phish): {fusion_metrics['report']['1']['f1-score']:.4f}")
    print(f"  ROC-AUC: {fusion_metrics['ROC_AUC']:.4f}")
    print(f"  FPR: {fusion_metrics['FPR']:.4f}")
    print(f"  FNR: {fusion_metrics['FNR']:.4f}")
    
    # Ablation study
    ablation_results = ablation_study(X, y, metadata)
    
    print("\n[Fusion] Ablation Study Results:")
    for name, metrics in ablation_results.items():
        print(f"  {name:20s}: Acc={metrics.get('accuracy', 0):.4f}")
    
    # Save fusion model
    os.makedirs(models_dir, exist_ok=True)
    fusion_path = os.path.join(models_dir, "fusion_lgbm.joblib")
    joblib.dump({"model": fusion_clf}, fusion_path)
    
    # Save metrics
    metrics_path = os.path.join(models_dir, "fusion_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(fusion_metrics, f, indent=2)
    
    # Save ablation results
    ablation_path = os.path.join(models_dir, "fusion_ablation.json")
    with open(ablation_path, "w") as f:
        json.dump(ablation_results, f, indent=2)
    
    print(f"\n[Fusion] Saved fusion model to {fusion_path}")
    print(f"[Fusion] Saved metrics to {metrics_path}")
    print(f"[Fusion] Saved ablation results to {ablation_path}")
    print("[Fusion] Training complete!")


if __name__ == "__main__":
    main()
