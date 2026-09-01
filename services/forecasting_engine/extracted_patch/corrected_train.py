"""DNS Shield X-Forecast — GRU Temporal Attack Sequence Forecaster (CORRECTED)
Fixes applied vs. the original two scripts:
  Fix A: genuine chronological split, no random permutation anywhere.
  Fix B (Option 1): split WITHIN each CTU-13 scenario first, then union train/val/test
          across scenarios, so train and test both see both underlying capture sessions
          instead of the model being tested on an entirely different capture than it
          trained on.
"""
import os
import sys
import time
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import numpy as np
import pandas as pd
from sklearn.metrics import classification_report, precision_recall_fscore_support, confusion_matrix

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
from services.forecasting_engine.temporal_feature_extractor import extract_flow_features

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
            return 1
        elif "cc" in lbl or "c&c" in lbl or "irc" in lbl or dport in ['6667', '80', '443']:
            return 4
        elif "attack" in lbl or "ddos" in lbl or "icmp" in proto:
            return 6
        elif dport in ['445', '139', '389', '88']:
            return 5
        elif dport in ['22', '21', '25', '8080']:
            return 3
        else:
            return 2
    return 0


def chronological_split_per_scenario(df, ratios=(0.70, 0.15, 0.15)):
    """Fix B Option 1: split inside each scenario, then union across scenarios."""
    parts = {"train": [], "val": [], "test": []}
    for scenario_id, group in df.groupby("Scenario"):
        group = group.sort_values("StartTime").reset_index(drop=True)
        n = len(group)
        t_end = int(n * ratios[0])
        v_end = int(n * (ratios[0] + ratios[1]))
        parts["train"].append(group.iloc[:t_end])
        parts["val"].append(group.iloc[t_end:v_end])
        parts["test"].append(group.iloc[v_end:])
    train = pd.concat(parts["train"]).sort_values("StartTime").reset_index(drop=True)
    val = pd.concat(parts["val"]).sort_values("StartTime").reset_index(drop=True)
    test = pd.concat(parts["test"]).sort_values("StartTime").reset_index(drop=True)
    return train, val, test


class TemporalSequenceDataset(Dataset):
    def __init__(self, features, labels, seq_len=10):
        self.X_seq, self.y_seq = [], []
        for i in range(len(features) - seq_len):
            self.X_seq.append(features[i:i + seq_len])
            self.y_seq.append(labels[i + seq_len])
        self.X_seq = torch.tensor(np.array(self.X_seq), dtype=torch.float32)
        self.y_seq = torch.tensor(np.array(self.y_seq), dtype=torch.long)

    def __len__(self):
        return len(self.y_seq)

    def __getitem__(self, idx):
        return self.X_seq[idx], self.y_seq[idx]


class TemporalAttackGRU(nn.Module):
    def __init__(self, input_dim=16, hidden_dim=64, num_layers=2, num_classes=7):
        super().__init__()
        self.gru = nn.GRU(input_dim, hidden_dim, num_layers=num_layers, batch_first=True,
                           dropout=0.15 if num_layers > 1 else 0.0)
        self.ln = nn.LayerNorm(hidden_dim)
        self.head = nn.Sequential(nn.Linear(hidden_dim, 32), nn.ReLU(), nn.Dropout(0.15), nn.Linear(32, num_classes))

    def forward(self, x):
        out, _ = self.gru(x)
        return self.head(self.ln(out[:, -1, :]))


def main():
    print("=" * 78)
    print("CORRECTED TRAINING RUN — genuine chronological, per-scenario split")
    print("=" * 78)

    df = pd.read_csv("data/ctu13_multistage_flows.csv", low_memory=False)
    df['StartTime'] = pd.to_datetime(df['StartTime'])

    train_df, val_df, test_df = chronological_split_per_scenario(df)
    print(f"[+] Per-scenario chronological split: Train={len(train_df)}, Val={len(val_df)}, Test={len(test_df)}")
    print(f"    Train scenarios: {dict(train_df['Scenario'].value_counts())}")
    print(f"    Test scenarios:  {dict(test_df['Scenario'].value_counts())}")

    def featurize(d):
        feats = np.vstack([extract_flow_features(row) for _, row in d.iterrows()])
        labels = np.array([label_flow(row) for _, row in d.iterrows()], dtype=np.int64)
        return feats, labels

    X_train, y_train = featurize(train_df)
    X_val, y_val = featurize(val_df)
    X_test, y_test = featurize(test_df)

    print(f"    Train class counts: {dict(zip(*np.unique(y_train, return_counts=True)))}")
    print(f"    Val class counts:   {dict(zip(*np.unique(y_val, return_counts=True)))}")
    print(f"    Test class counts:  {dict(zip(*np.unique(y_test, return_counts=True)))}")

    seq_len = 10
    train_ds = TemporalSequenceDataset(X_train, y_train, seq_len)
    val_ds = TemporalSequenceDataset(X_val, y_val, seq_len)
    test_ds = TemporalSequenceDataset(X_test, y_test, seq_len)
    train_loader = DataLoader(train_ds, batch_size=256, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=256, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=256, shuffle=False)

    class_counts = np.bincount(y_train, minlength=7)
    class_weights = 1.0 / (class_counts + 10.0)
    class_weights = class_weights / class_weights.sum() * 7.0
    weights_t = torch.tensor(class_weights, dtype=torch.float32)

    device = torch.device("cpu")
    model = TemporalAttackGRU().to(device)
    criterion = nn.CrossEntropyLoss(weight=weights_t.to(device))
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.003, weight_decay=1e-4)

    print(f"\n[*] Training (Epochs=10, Batch=256, SeqLen=10)...")
    print(f"{'Epoch':<8} | {'Train Loss':<12} | {'Val Loss':<12} | {'Val Acc':<10}")
    best_val_loss = float("inf")
    model_path = "temporal_gru_corrected.pt"

    for epoch in range(1, 11):
        model.train()
        total_train_loss = 0.0
        for X_b, y_b in train_loader:
            optimizer.zero_grad()
            logits = model(X_b)
            loss = criterion(logits, y_b)
            loss.backward()
            optimizer.step()
            total_train_loss += loss.item() * len(y_b)
        avg_train_loss = total_train_loss / len(train_ds)

        model.eval()
        total_val_loss, correct_val = 0.0, 0
        with torch.no_grad():
            for X_b, y_b in val_loader:
                logits = model(X_b)
                loss = criterion(logits, y_b)
                total_val_loss += loss.item() * len(y_b)
                correct_val += (torch.argmax(logits, dim=1) == y_b).sum().item()
        avg_val_loss = total_val_loss / len(val_ds)
        val_acc = correct_val / len(val_ds)
        print(f"{epoch:<8} | {avg_train_loss:<12.4f} | {avg_val_loss:<12.4f} | {val_acc*100:<9.2f}%")
        if avg_val_loss < best_val_loss:
            best_val_loss = avg_val_loss
            torch.save(model.state_dict(), model_path)

    print(f"\n[+] Loading best checkpoint for held-out evaluation")
    model.load_state_dict(torch.load(model_path))
    model.eval()
    all_preds, all_targets = [], []
    with torch.no_grad():
        for X_b, y_b in test_loader:
            logits = model(X_b)
            all_preds.extend(torch.argmax(logits, dim=1).numpy())
            all_targets.extend(y_b.numpy())
    all_preds, all_targets = np.array(all_preds), np.array(all_targets)

    print("\n" + "=" * 78)
    print("HELD-OUT TEST SET EVALUATION (genuine future data, per-scenario chronological)")
    print("=" * 78)
    unique_present = np.unique(np.concatenate([all_targets, all_preds]))
    names = [f"Stage {i}: {STAGE_NAMES[i]}" for i in unique_present]
    print(classification_report(all_targets, all_preds, labels=unique_present, target_names=names, digits=4, zero_division=0))

    p, r, f1, _ = precision_recall_fscore_support(all_targets, all_preds, average='weighted', zero_division=0)
    print(f"Weighted Precision: {p*100:.2f}%  Recall: {r*100:.2f}%  F1: {f1*100:.2f}%")

    cm = confusion_matrix(all_targets, all_preds, labels=list(range(7)))
    benign_total = cm[0, :].sum()
    benign_fp = cm[0, 1:].sum()
    fpr = (benign_fp / max(1, benign_total)) if benign_total > 0 else 0.0
    print(f"Benign FPR: {fpr*100:.4f}% ({benign_fp}/{benign_total})")
    print("=" * 78)


if __name__ == "__main__":
    main()
