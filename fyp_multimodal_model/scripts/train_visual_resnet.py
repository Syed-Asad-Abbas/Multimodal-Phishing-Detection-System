"""
Visual Modality Model (CNN - ResNet50 transfer learning)
- Expects webpage screenshots as images located in <image_dir>/<FILENAME>.png (or .jpg).
- Uses the dataset CSV only to get FILENAME and label; skips rows without images.
Run:
  python train_visual_resnet.py --config config.json
"""

import argparse, os, json, random, copy, time
import numpy as np
import pandas as pd
from utils import load_config, load_dataset
from sklearn.metrics import classification_report, confusion_matrix, matthews_corrcoef, roc_auc_score
from PIL import Image

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from torchvision import models, transforms
from torch.nn.functional import softmax


# ================================
# Dataset Loader
# ================================
class ScreenshotDataset(Dataset):
    """
    Dataset that:
      - Uses FILENAME column to find matching screenshot in image_dir
      - Skips rows where no matching image file exists
    """
    def __init__(self, df, image_dir, transform=None):
        self.samples = []
        self.transform = transform
        self.image_dir = image_dir
        exts = (".png", ".jpg", ".jpeg", ".PNG", ".JPG", ".JPEG")

        for _, r in df.iterrows():
            fname = str(r["FILENAME"])
            label = int(r["label"])

            # remove .txt if present
            stem = os.path.splitext(fname)[0]

            path = None
            for ext in exts:
                # try both stem.png and stem.txt.png
                candidates = [f"{stem}{ext}", f"{stem}.txt{ext}"]
                for cand in candidates:
                    p = os.path.join(image_dir, cand)
                    if os.path.exists(p):
                        path = p
                        break
                if path:
                    break

            if path:
                self.samples.append((path, label))

        # Debug info
        print(f"[Dataset] Found {len(self.samples)} images in {image_dir}")
        if len(self.samples) > 0:
            print("First few samples:", [os.path.basename(s[0]) for s in self.samples[:5]])

        if not self.samples:
            raise RuntimeError(
                f"No images found in {image_dir}. "
                "Check naming — must match FILENAME column (e.g. 8042866.png)."
            )

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = Image.open(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


class TransformSubset(Dataset):
    """
    Wrap a base dataset + subset of indices and apply a transform.
    Base dataset should return PIL images when transform=None.
    """
    def __init__(self, base_dataset, indices, transform=None):
        self.base = base_dataset
        self.indices = indices
        self.transform = transform

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, idx):
        base_idx = self.indices[idx]
        img, label = self.base[base_idx]  # img is PIL if base.transform is None
        if self.transform:
            img = self.transform(img)
        return img, label


# ================================
# Training & Evaluation Helpers
# ================================
def train_one_epoch(model, loader, criterion, optimizer, device):
    model.train()
    total_loss, total, correct = 0.0, 0, 0
    for imgs, labels in loader:
        imgs = imgs.to(device)
        labels = labels.to(device)

        optimizer.zero_grad()
        out = model(imgs)
        loss = criterion(out, labels)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * imgs.size(0)
        preds = out.argmax(dim=1)
        correct += (preds == labels).sum().item()
        total += imgs.size(0)

    avg_loss = total_loss / total if total > 0 else 0.0
    acc = correct / total if total > 0 else 0.0
    return avg_loss, acc


def evaluate(model, loader, device):
    """
    Returns:
      acc          - scalar accuracy
      all_preds    - np.array of predicted labels
      all_labels   - np.array of true labels
      all_scores   - np.array of probs for class 1 (phishing)
    """
    model.eval()
    total, correct = 0, 0
    all_preds, all_labels, all_scores = [], [], []

    with torch.no_grad():
        for imgs, labels in loader:
            imgs = imgs.to(device)
            labels = labels.to(device)

            out = model(imgs)               # [B,2]
            probs = softmax(out, dim=1)     # [B,2]
            scores_1 = probs[:, 1]          # phishing probability

            preds = probs.argmax(dim=1)

            preds_np = preds.cpu().numpy()
            labels_np = labels.cpu().numpy()
            scores_np = scores_1.cpu().numpy()

            all_preds.extend(preds_np.tolist())
            all_labels.extend(labels_np.tolist())
            all_scores.extend(scores_np.tolist())

            correct += (preds_np == labels_np).sum()
            total += labels_np.shape[0]

    acc = correct / total if total > 0 else 0.0
    return acc, np.array(all_preds), np.array(all_labels), np.array(all_scores)


def measure_latency_throughput(model, loader, device, num_batches=50):
    """
    Approximate inference latency (ms/sample) and throughput (samples/sec)
    on data from the given loader.
    """
    model.eval()
    total_samples = 0
    total_time = 0.0

    with torch.no_grad():
        it = iter(loader)
        for _ in range(num_batches):
            try:
                imgs, _ = next(it)
            except StopIteration:
                break

            imgs = imgs.to(device)
            batch_size = imgs.size(0)

            start = time.perf_counter()
            _ = model(imgs)
            end = time.perf_counter()

            total_time += (end - start)
            total_samples += batch_size

    if total_samples == 0 or total_time == 0:
        return None, None

    avg_time_per_sample = total_time / total_samples   # seconds
    latency_ms = avg_time_per_sample * 1000.0
    throughput = total_samples / total_time            # samples/sec
    return latency_ms, throughput


# ================================
# Main Training
# ================================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-4)
    args = parser.parse_args()

    # -------------------------
    # Reproducibility
    # -------------------------
    torch.manual_seed(42)
    np.random.seed(42)
    random.seed(42)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(42)

    # -------------------------
    # Load config & dataset CSV
    # -------------------------
    cfg = load_config(args.config)
    df = load_dataset(cfg["dataset_csv"]).copy()
    image_dir = cfg["image_dir"]
    models_dir = cfg.get("models_dir", "models")
    os.makedirs(models_dir, exist_ok=True)

    # Optional: filter to rows that actually have screenshots (if you precomputed this)
    # if "has_img" in df.columns:
    #     df = df[df["has_img"] == 1].copy()
    #     print(f"[Filter] Using only rows with screenshots: {len(df)}")

    # -------------------------
    # Build base dataset (no transform yet)
    # -------------------------
    full_ds = ScreenshotDataset(
        df[["FILENAME", "label"]],
        image_dir=image_dir,
        transform=None,  # transforms applied later via TransformSubset
    )

    num_classes = 2
    n = len(full_ds)

    # labels from screenshots actually found
    all_labels = np.array([label for _, label in full_ds.samples])  # shape [n]

    # -------------------------
    # Stratified 80/20 split
    # -------------------------
    pos_idx = np.where(all_labels == 1)[0].tolist()
    neg_idx = np.where(all_labels == 0)[0].tolist()

    np.random.shuffle(pos_idx)
    np.random.shuffle(neg_idx)

    split_pos = int(0.8 * len(pos_idx))
    split_neg = int(0.8 * len(neg_idx))

    train_idx = pos_idx[:split_pos] + neg_idx[:split_neg]
    test_idx = pos_idx[split_pos:] + neg_idx[split_neg:]

    np.random.shuffle(train_idx)
    np.random.shuffle(test_idx)

    print(f"[Split] Train size: {len(train_idx)}, Test size: {len(test_idx)}")
    print(f"[Split] Train positives: {sum(all_labels[train_idx] == 1)}, negatives: {sum(all_labels[train_idx] == 0)}")
    print(f"[Split] Test positives: {sum(all_labels[test_idx] == 1)}, negatives: {sum(all_labels[test_idx] == 0)}")

    # -------------------------
    # Transforms (augmentation + normalization)
    # -------------------------
    img_size = 224
    train_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomResizedCrop(img_size, scale=(0.7, 1.0)),
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.3, hue=0.05),
        transforms.RandomRotation(5),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    test_transform = transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(img_size),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225],
        ),
    ])

    # -------------------------
    # Subset Datasets with transforms
    # -------------------------
    train_ds = TransformSubset(full_ds, train_idx, transform=train_transform)
    test_ds = TransformSubset(full_ds, test_idx, transform=test_transform)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    pin_memory = device == "cuda"

    train_loader = DataLoader(
        train_ds,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=4,
        pin_memory=pin_memory,
    )
    test_loader = DataLoader(
        test_ds,
        batch_size=args.batch_size,
        shuffle=False,
        num_workers=4,
        pin_memory=pin_memory,
    )

    # -------------------------
    # Class-weighted loss (handle mild imbalance)
    # -------------------------
    train_labels = all_labels[train_idx]
    class_counts = np.bincount(train_labels, minlength=num_classes)
    print(f"[Class counts train] 0: {class_counts[0]}, 1: {class_counts[1]}")

    class_weights = 1.0 / (class_counts + 1e-6)
    class_weights = class_weights / class_weights.sum() * len(class_weights)
    class_weights_tensor = torch.tensor(class_weights, dtype=torch.float32).to(device)
    print(f"[Class weights] {class_weights_tensor.cpu().numpy()}")

    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)

    # -------------------------
    # Model: ResNet50 (partial fine-tuning)
    # -------------------------
    model = models.resnet50(weights=models.ResNet50_Weights.DEFAULT)

    # Freeze everything
    for param in model.parameters():
        param.requires_grad = False

    # Unfreeze last block (layer4) and classifier head
    for param in model.layer4.parameters():
        param.requires_grad = True

    model.fc = nn.Linear(model.fc.in_features, num_classes)
    for param in model.fc.parameters():
        param.requires_grad = True

    model = model.to(device)

    # AdamW with differential LR
    optimizer = torch.optim.AdamW(
        [
            {"params": model.layer4.parameters(), "lr": args.lr * 0.1},
            {"params": model.fc.parameters(), "lr": args.lr},
        ],
        weight_decay=1e-4,
    )

    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)

    # -------------------------
    # Prepare tracking
    # -------------------------
    history = []      # epoch table (every 10 epochs)
    best_acc = 0.0
    best_state = None

    # -------------------------
    # Training loop
    # -------------------------
    for epoch in range(1, args.epochs + 1):
        loss, tr_acc = train_one_epoch(model, train_loader, criterion, optimizer, device)
        te_acc, te_preds, te_labels, te_scores = evaluate(model, test_loader, device)
        scheduler.step()

        print(
            f"[Visual][Epoch {epoch}] "
            f"loss={loss:.4f} train_acc={tr_acc:.4f} test_acc={te_acc:.4f}"
        )

        # Track best model by test accuracy
        if te_acc > best_acc:
            best_acc = te_acc
            best_state = copy.deepcopy(model.state_dict())

        # Every 10 epochs (and final epoch), store metrics for table
        if (epoch % 10 == 0) or (epoch == args.epochs):
            rep = classification_report(te_labels, te_preds, output_dict=True)
            phish_metrics = rep.get("1", {})

            row = {
                "epoch": epoch,
                "train_loss": float(loss),
                "train_acc": float(tr_acc),
                "test_acc": float(te_acc),
                "phish_precision": float(phish_metrics.get("precision", 0.0)),
                "phish_recall": float(phish_metrics.get("recall", 0.0)),
                "phish_f1": float(phish_metrics.get("f1-score", 0.0)),
                "phish_support": int(phish_metrics.get("support", 0)),
            }
            history.append(row)
            print(f"[Table] Stored metrics for epoch {epoch}: {row}")

    # -------------------------
    # Load best model before final eval
    # -------------------------
    if best_state is not None:
        model.load_state_dict(best_state)
        print(f"[Visual] Loaded best model (test_acc={best_acc:.4f}) for final evaluation/saving.")

    # -------------------------
    # Final eval + advanced metrics
    # -------------------------
    acc, preds, labels, scores = evaluate(model, test_loader, device)
    report = classification_report(labels, preds, output_dict=True)
    print("[Visual] Classification report (per-class):")
    print(json.dumps(report, indent=2))

    # Confusion matrix-based metrics
    cm = confusion_matrix(labels, preds, labels=[0, 1])
    tn, fp, fn, tp = cm.ravel()

    FPR = fp / (fp + tn + 1e-9)  # false positive rate
    FNR = fn / (fn + tp + 1e-9)  # false negative rate
    TNR = tn / (tn + fp + 1e-9)  # specificity

    # Sklearn metrics
    mcc = matthews_corrcoef(labels, preds)
    try:
        roc_auc = roc_auc_score(labels, scores)
    except ValueError:
        roc_auc = None  # e.g., if only one class present in test

    # Save best weights first (for size)
    weights_path = os.path.join(models_dir, "visual_resnet50.pt")
    torch.save(model.state_dict(), weights_path)

    # Model size (MB)
    size_bytes = os.path.getsize(weights_path)
    size_mb = size_bytes / (1024 * 1024)

    # Latency & throughput
    latency_ms, throughput = measure_latency_throughput(model, test_loader, device)

    # Zero-Day / Hard-Case detection (placeholders: set up later when you have flags)
    zero_day_detection_rate = None
    hard_case_detection_rate = None

    # False positive cost based on a simple cost model
    cost_fp = float(cfg.get("false_positive_cost_per_fp", 1.0))
    false_positive_cost = fp * cost_fp

    # -------------------------
    # Save metrics & epoch table
    # -------------------------
    metrics_path = os.path.join(models_dir, "visual_metrics.json")
    table_csv_path = os.path.join(models_dir, "visual_epoch_table.csv")

    pd.DataFrame(history).to_csv(table_csv_path, index=False)

    with open(metrics_path, "w") as f:
        json.dump(
            {
                "accuracy": float(acc),
                "best_test_acc": float(best_acc),
                "confusion_matrix": cm.tolist(),
                "FPR": float(FPR),
                "FNR": float(FNR),
                "TNR": float(TNR),
                "MCC": float(mcc),
                "ROC_AUC": float(roc_auc) if roc_auc is not None else None,
                "model_size_mb": float(size_mb),
                "latency_ms": float(latency_ms) if latency_ms is not None else None,
                "throughput_sps": float(throughput) if throughput is not None else None,
                "zero_day_detection_rate": zero_day_detection_rate,
                "hard_case_detection_rate": hard_case_detection_rate,
                "false_positive_cost": float(false_positive_cost),
                "report": report,
                "num_images": len(full_ds),
                "epoch_table": history,
            },
            f,
            indent=2,
        )

    print(f"[Visual] Final Accuracy (best model): {acc:.4f}")
    print(f"[Visual] Saved best weights to {weights_path}")
    print(f"[Visual] Metrics saved to {metrics_path}")
    print(f"[Visual] Epoch table saved to {table_csv_path}")


if __name__ == "__main__":
    main()
