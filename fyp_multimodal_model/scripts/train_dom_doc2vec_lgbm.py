"""
DOM Modality Model (Doc2Vec embeddings + LightGBM)
- Creates a synthetic "DOM token string" from available DOM-related columns
  (e.g., HasForm, HasPasswordField, NoOfImage, NoOfJS, etc.).
- Trains Doc2Vec to get dense embeddings, then LightGBM on those vectors.
Run:
  python train_dom_doc2vec_lgbm.py --config config.json
"""
import argparse, os, json, joblib, re, numpy as np, pandas as pd
from utils import load_config, load_dataset
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from gensim.models.doc2vec import Doc2Vec, TaggedDocument
from lightgbm import LGBMClassifier
from tqdm import tqdm

# Heuristics to pick DOM-ish columns
BOOLEAN_PREFIXES = ("Has",)
COUNT_PREFIXES   = ("NoOf",)
KEYWORDS         = {"Bank", "Pay", "Crypto"}  # brand cues


def build_dom_tokens(row):
    tokens = []
    for col, val in row.items():
        # boolean-style DOM flags
        if col.startswith(BOOLEAN_PREFIXES) and col not in ("HasObfuscation",):
            try:
                if int(val) == 1:
                    tokens.append(col.lower())
            except Exception:
                pass

        # count-style DOM stats
        if col.startswith(COUNT_PREFIXES):
            try:
                cnt = int(val)
                reps = min(cnt, 10)  # cap repetitions to avoid huge docs
                base = re.sub(r"^NoOf", "count_", col).lower()
                tokens.extend([base] * reps)
            except Exception:
                pass

        # simple keyword cues (Bank / Pay / Crypto flags etc.)
        if col in KEYWORDS:
            try:
                if int(val) == 1:
                    tokens.append(f"kw_{col.lower()}")
            except Exception:
                pass

    # Fallback: TLD / aux string features
    for aux in ("TLD",):
        if aux in row and isinstance(row[aux], str):
            tokens.append(f"tld_{row[aux].lower()}")

    return tokens if tokens else ["empty"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.json")
    parser.add_argument("--vector_size", type=int, default=64)
    parser.add_argument("--epochs", type=int, default=30)
    args = parser.parse_args()

    # -------- Step 0: Load config + data --------
    print("[DOM] Step 0/5 — Loading config and dataset...")
    cfg = load_config(args.config)
    df = load_dataset(cfg["dataset_csv"]).copy()
    print(f"[DOM] Loaded dataset with {len(df)} rows and {len(df.columns)} columns.")

    # -------- Step 1: Build DOM tokens --------
    print("[DOM] Step 1/5 — Building DOM tokens for each row...")
    documents = []
    labels = df["label"].astype(int).values.tolist()
    rows = df.to_dict(orient="records")

    for i, row in enumerate(tqdm(rows, desc="Building DOM tokens", unit="row")):
        tokens = build_dom_tokens(row)
        documents.append(TaggedDocument(words=tokens, tags=[str(i)]))

    # Small preview
    print("[DOM] Example tokenized rows:")
    for idx in range(min(3, len(documents))):
        print(f"       Row {idx}: {documents[idx].words[:20]}")

    # -------- Step 2: Train Doc2Vec (same logic as original) --------
    print("[DOM] Step 2/5 — Training Doc2Vec model (this may take a few minutes)...")
    model_d2v = Doc2Vec(
        vector_size=args.vector_size,
        window=5,
        min_count=1,
        workers=4,
        epochs=args.epochs,  # <== same as original script
        dm=1,
        seed=42,
    )
    model_d2v.build_vocab(documents)
    model_d2v.train(
        documents,
        total_examples=model_d2v.corpus_count,
        epochs=args.epochs,  # <== same as original script
    )
    print("[DOM] Doc2Vec training complete.")
    print(f"[DOM] Vocabulary size: {len(model_d2v.wv)}")

    # -------- Step 3: Infer embeddings (same pattern as original) --------
    print("[DOM] Step 3/5 — Inferring embeddings for all documents...")
    embeddings = np.vstack(
        [model_d2v.infer_vector(doc.words) for doc in documents]
    )

    # -------- Step 4: Train LightGBM --------
    print("[DOM] Step 4/5 — Training LightGBM classifier...")
    X_train, X_test, y_train, y_test = train_test_split(
        embeddings,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    clf = LGBMClassifier(
        n_estimators=300,
        learning_rate=0.05,
        num_leaves=48,
        subsample=0.9,
        colsample_bytree=0.9,
        random_state=42,
        n_jobs=-1,
    )

    clf.fit(X_train, y_train)
    print("[DOM] LightGBM training complete.")
    print("[DOM] Evaluating model on hold-out set...")

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)
    print(f"[DOM] Accuracy on test set: {acc:.4f}")

    # -------- Step 5: Save models + metrics --------
    print("[DOM] Step 5/5 — Saving model and metrics...")
    os.makedirs(cfg["models_dir"], exist_ok=True)
    model_path   = os.path.join(cfg["models_dir"], "dom_doc2vec_lgbm.joblib")
    metrics_path = os.path.join(cfg["models_dir"], "dom_metrics.json")

    joblib.dump({"doc2vec": model_d2v, "model": clf}, model_path)
    with open(metrics_path, "w") as f:
        json.dump({"accuracy": acc, "report": report}, f, indent=2)

    print(f"[DOM] Saved model to   {model_path}")
    print(f"[DOM] Saved metrics to {metrics_path}")
    print("[DOM] Pipeline completed ✔")


if __name__ == "__main__":
    main()
