"""DNS Shield X-Forecast — GRU Temporal Attack Sequence Forecaster
Trains a Gated Recurrent Unit (GRU) neural network on chronological multi-stage network flow sequences.
"""
import os
import sys
import time
import json
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, precision_recall_fscore_support, confusion_matrix

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from services.forecasting_engine.temporal_feature_extractor import extract_flow_features, FEATURE_NAMES

# ─── 1. Label Mapping ───────────────────────────────────────────────────────────
STAGE_MAP = {
    "STAGE_0_BENIGN": 0,
    "STAGE_1_RECONNAISSANCE": 1,
    "STAGE_2_INITIAL_ACCESS": 2,
    "STAGE_3_DISCOVERY": 3,
    "STAGE_4_C2_PERSISTENCE": 4,
    "STAGE_5_LATERAL_MOVEMENT": 5,
    "STAGE_6_EXFILTRATION": 6,
}
STAGE_NAMES = list(STAGE_MAP.keys())

def label_flow(row):
    lbl = str(row.get('Label', '')).lower()
    proto = str(row.get('Proto', '')).lower()
    dport = str(row.get('Dport', ''))
    tot_pkts = float(row.get('TotPkts', 1))
    dur = float(row.get('Dur', 0))
    
    if "botnet" in lbl or "147.32.84.165" in str(row.get('SrcAddr', '')):
        if "portscan" in lbl or "scan" in lbl or (proto == "tcp" and tot_pkts <= 2 and dur < 0.05):
            return 1  # STAGE_1_RECONNAISSANCE
        elif "cc" in lbl or "c&c" in lbl or "irc" in lbl or dport in ['6667', '80', '443']:
            return 4  # STAGE_4_C2_PERSISTENCE
        elif "attack" in lbl or "ddos" in lbl or "icmp" in proto:
            return 6  # STAGE_6_EXFILTRATION / IMPACT
        elif dport in ['445', '139', '389', '88']:
            return 5  # STAGE_5_LATERAL_MOVEMENT
        elif dport in ['22', '21', '25', '8080']:
            return 3  # STAGE_3_DISCOVERY
        else:
            return 2  # STAGE_2_INITIAL_ACCESS
    return 0  # STAGE_0_BENIGN

# ─── 2. PyTorch Dataset ────────────────────────────────────────────────────────
class TemporalSequenceDataset(Dataset):
    def __init__(self, features: np.ndarray, labels: np.ndarray, seq_len: int = 10):
        self.seq_len = seq_len
        self.X_seq = []
        self.y_seq = []
        
        for i in range(len(features) - seq_len):
            self.X_seq.append(features[i : i + seq_len])
            self.y_seq.append(labels[i + seq_len])
            
        self.X_seq = torch.tensor(np.array(self.X_seq), dtype=torch.float32)
        self.y_seq = torch.tensor(np.array(self.y_seq), dtype=torch.long)

    def __len__(self):
        return len(self.y_seq)

    def __getitem__(self, idx):
        return self.X_seq[idx], self.y_seq[idx]

# ─── 3. GRU Neural Network Architecture ────────────────────────────────────────
class TemporalAttackGRU(nn.Module):
    """
    GRU Sequence Forecaster for Multi-Stage MITRE Attack Progression.
    Architecture:
      Input (batch, seq_len=10, input_dim=16)
      -> GRU(input_size=16, hidden_size=64, num_layers=2, dropout=0.15, batch_first=True)
      -> LayerNorm(64)
      -> Linear(64, 32) -> ReLU -> Dropout(0.15)
      -> Linear(32, 7)
    """
    def __init__(self, input_dim: int = 16, hidden_dim: int = 64, num_layers: int = 2, num_classes: int = 7):
        super().__init__()
        self.gru = nn.GRU(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=0.15 if num_layers > 1 else 0.0
        )
        self.ln = nn.LayerNorm(hidden_dim)
        self.head = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(32, num_classes)
        )

    def forward(self, x):
        out, _ = self.gru(x)
        last_hidden = self.ln(out[:, -1, :])
        return self.head(last_hidden)

# ─── 4. Main Training Pipeline ─────────────────────────────────────────────────
def main():
    print("="*75)
    print("STEP 4: TEMPORAL ATTACK FORECASTING MODEL (GRU) TRAINING & EVALUATION")
    print("="*75)

    data_path = "data/ctu13_multistage_flows.csv"
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found.")
        sys.exit(1)

    print(f"[*] Loading dataset: {data_path}")
    df = pd.read_csv(data_path, low_memory=False)
    # Ensure chronological order
    df['StartTime'] = pd.to_datetime(df['StartTime'])
    df = df.sort_values(by='StartTime').reset_index(drop=True)
    print(f"[+] Total chronological flows loaded: {len(df)}")

    # Extract features & labels
    print("[*] Extracting 16-dim temporal feature vectors...")
    t0 = time.time()
    feature_list = []
    label_list = []
    for _, row in df.iterrows():
        feature_list.append(extract_flow_features(row))
        label_list.append(label_flow(row))
    
    X_all = np.vstack(feature_list)
    y_all = np.array(label_list, dtype=np.int64)
    print(f"[+] Feature extraction completed in {time.time()-t0:.2f}s. Shape: {X_all.shape}")

    # Chronological Train (70%), Val (15%), Test (15%) Split (STRICT NO-LEAKAGE)
    n = len(X_all)
    train_end = int(n * 0.70)
    val_end = int(n * 0.85)

    X_train, y_train = X_all[:train_end], y_all[:train_end]
    X_val, y_val = X_all[train_end:val_end], y_all[train_end:val_end]
    X_test, y_test = X_all[val_end:], y_all[val_end:]

    print(f"[+] Strict Chronological Split: Train={len(X_train)} (0-{train_end}), Val={len(X_val)} ({train_end}-{val_end}), Test={len(X_test)} ({val_end}-{n})")

    # Class distribution check
    unique, counts = np.unique(y_train, return_counts=True)
    print(f"    Train Class Counts: {dict(zip(unique, counts))}")
    unique_t, counts_t = np.unique(y_test, return_counts=True)
    print(f"    Test Class Counts:  {dict(zip(unique_t, counts_t))}")

    # Create Datasets & DataLoaders
    seq_len = 10
    train_ds = TemporalSequenceDataset(X_train, y_train, seq_len=seq_len)
    val_ds = TemporalSequenceDataset(X_val, y_val, seq_len=seq_len)
    test_ds = TemporalSequenceDataset(X_test, y_test, seq_len=seq_len)

    train_loader = DataLoader(train_ds, batch_size=256, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=256, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=256, shuffle=False)

    # Class Weights for loss balancing
    class_counts = np.bincount(y_train, minlength=7)
    class_weights = 1.0 / (class_counts + 10.0)
    class_weights = class_weights / class_weights.sum() * 7.0
    weights_t = torch.tensor(class_weights, dtype=torch.float32)

    # Instantiate GRU Model
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = TemporalAttackGRU(input_dim=16, hidden_dim=64, num_layers=2, num_classes=7).to(device)
    criterion = nn.CrossEntropyLoss(weight=weights_t.to(device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.003, weight_decay=1e-4)

    print(f"\n[*] Training GRU Temporal Model on {device} (Epochs=10, Batch=256, SeqLen=10)...")
    print(f"{'Epoch':<8} | {'Train Loss':<12} | {'Val Loss':<12} | {'Val Acc':<10} | {'Time':<8}")
    print("-" * 60)

    best_val_loss = float("inf")
    model_save_dir = os.path.join("services", "forecasting_engine", "models")
    os.makedirs(model_save_dir, exist_ok=True)
    model_path = os.path.join(model_save_dir, "temporal_gru_forecaster.pt")

    for epoch in range(1, 11):
        ep_t0 = time.time()
        model.train()
        total_train_loss = 0.0
        for X_b, y_b in train_loader:
            X_b, y_b = X_b.to(device), y_b.to(device)
            optimizer.zero_grad()
            logits = model(X_b)
            loss = criterion(logits, y_b)
            loss.backward()
            optimizer.step()
            total_train_loss += loss.item() * len(y_b)

        avg_train_loss = total_train_loss / len(train_ds)

        # Validation
        model.eval()
        total_val_loss = 0.0
        correct_val = 0
        with torch.no_grad():
            for X_b, y_b in val_loader:
                X_b, y_b = X_b.to(device), y_b.to(device)
                logits = model(X_b)
                loss = criterion(logits, y_b)
                total_val_loss += loss.item() * len(y_b)
                preds = torch.argmax(logits, dim=1)
                correct_val += (preds == y_b).sum().item()

        avg_val_loss = total_val_loss / len(val_ds)
        val_acc = correct_val / len(val_ds)
        ep_time = time.time() - ep_t0

        print(f"{epoch:<8} | {avg_train_loss:<12.4f} | {avg_val_loss:<12.4f} | {val_acc*100:<9.2f}% | {ep_time:<7.2f}s")

        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), model_path)

    print(f"\n[+] Saved best trained GRU weights to {model_path}")

    # ─── 5. Evaluation on Held-Out Test Set ─────────────────────────────────────
    print("\n" + "="*75)
    print("HELD-OUT CHRONOLOGICAL TEST SET EVALUATION (Unseen Future Sequences)")
    print("="*75)
    model.load_state_dict(torch.load(model_path))
    model.eval()

    all_preds = []
    all_targets = []
    with torch.no_grad():
        for X_b, y_b in test_loader:
            X_b = X_b.to(device)
            logits = model(X_b)
            preds = torch.argmax(logits, dim=1).cpu().numpy()
            all_preds.extend(preds)
            all_targets.extend(y_b.numpy())

    all_preds = np.array(all_preds)
    all_targets = np.array(all_targets)

    # Compute genuine classification report
    target_names = [f"Stage {i}: {STAGE_NAMES[i]}" for i in range(7)]
    unique_present = np.unique(np.concatenate([all_targets, all_preds]))
    filtered_names = [target_names[i] for i in unique_present]

    report = classification_report(all_targets, all_preds, labels=unique_present, target_names=filtered_names, digits=4)
    print(report)

    # Macro & Weighted metrics
    p, r, f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='weighted')
    print(f"Weighted Precision: {p*100:.2f}%")
    print(f"Weighted Recall:    {r*100:.2f}%")
    print(f"Weighted F1-Score:  {f1*100:.2f}%")

    # Compute False Positive Rate (FPR) on Benign class (class 0)
    # FPR = FP / (FP + TN)
    cm = confusion_matrix(all_targets, all_preds, labels=list(range(7)))
    fp_benign = cm[1:, 0].sum()  # Attacks predicted as Benign is FN for attack, but for benign FPR: Benign predicted as Attack
    benign_total = cm[0, :].sum()
    benign_false_positives = cm[0, 1:].sum()  # Actual benign predicted as attack
    fpr = (benign_false_positives / max(1, benign_total)) if benign_total > 0 else 0.0
    print(f"Benign False Positive Rate (FPR): {fpr*100:.4f}% ({benign_false_positives} false alarms out of {benign_total} benign test flows)")
    print("="*75)

if __name__ == "__main__":
    main()
