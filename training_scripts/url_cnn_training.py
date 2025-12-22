"""
URL Phishing Detection - Character-level CNN Model Training Script

Dataset: Kaggle URL Phishing Dataset
Architecture: Character-level CNN for URL classification
Output: TensorFlow.js model for deployment
"""

import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
import tensorflowjs as tfjs
import os
import json

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

MAX_URL_LENGTH = 200
VOCAB_SIZE = 128  # ASCII characters
EMBEDDING_DIM = 64
BATCH_SIZE = 64
EPOCHS = 20
VALIDATION_SPLIT = 0.2
TEST_SIZE = 0.15

# Model output paths
MODEL_SAVE_PATH = './models/url_model'
TFJS_SAVE_PATH = './public/models/url'

# ═══════════════════════════════════════════════════════════════════
# DATA LOADING & PREPROCESSING
# ═══════════════════════════════════════════════════════════════════

def load_url_dataset(csv_path):
    """
    Load URL phishing dataset from CSV
    Expected columns: url, label (0=safe, 1=phishing)
    """
    print("📂 Loading URL dataset...")
    df = pd.read_csv(csv_path)
    
    # Ensure required columns exist
    if 'url' not in df.columns or 'label' not in df.columns:
        raise ValueError("Dataset must have 'url' and 'label' columns")
    
    # Clean data
    df = df.dropna(subset=['url', 'label'])
    df['label'] = df['label'].astype(int)
    
    print(f"✅ Loaded {len(df)} URLs")
    print(f"   - Safe URLs: {(df['label'] == 0).sum()}")
    print(f"   - Phishing URLs: {(df['label'] == 1).sum()}")
    
    return df['url'].values, df['label'].values

def preprocess_urls(urls, max_length=MAX_URL_LENGTH):
    """
    Convert URLs to character-level integer sequences
    Each character is mapped to its ASCII value (0-127)
    """
    print(f"🔧 Preprocessing URLs (max length: {max_length})...")
    
    sequences = []
    for url in urls:
        # Convert each character to ASCII value
        seq = [min(ord(char), VOCAB_SIZE - 1) for char in url[:max_length]]
        # Pad sequence to max_length
        if len(seq) < max_length:
            seq += [0] * (max_length - len(seq))
        sequences.append(seq)
    
    return np.array(sequences, dtype=np.int32)

# ═══════════════════════════════════════════════════════════════════
# MODEL ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════

def build_character_cnn_model():
    """
    Character-level CNN for URL phishing detection
    
    Architecture:
    - Embedding layer (character embeddings)
    - 3x Conv1D layers with increasing filters
    - Global max pooling
    - Dense layers with dropout
    - Binary classification output
    """
    print("🏗️ Building Character-CNN model...")
    
    model = keras.Sequential([
        # Input layer
        layers.Input(shape=(MAX_URL_LENGTH,)),
        
        # Character embedding
        layers.Embedding(
            input_dim=VOCAB_SIZE,
            output_dim=EMBEDDING_DIM,
            input_length=MAX_URL_LENGTH,
            name='char_embedding'
        ),
        
        # Conv1D Block 1
        layers.Conv1D(128, 7, activation='relu', padding='same', name='conv1d_1'),
        layers.MaxPooling1D(2, name='maxpool_1'),
        layers.Dropout(0.3, name='dropout_1'),
        
        # Conv1D Block 2
        layers.Conv1D(256, 5, activation='relu', padding='same', name='conv1d_2'),
        layers.MaxPooling1D(2, name='maxpool_2'),
        layers.Dropout(0.3, name='dropout_2'),
        
        # Conv1D Block 3
        layers.Conv1D(512, 3, activation='relu', padding='same', name='conv1d_3'),
        layers.GlobalMaxPooling1D(name='global_maxpool'),
        layers.Dropout(0.4, name='dropout_3'),
        
        # Dense layers
        layers.Dense(256, activation='relu', name='dense_1'),
        layers.Dropout(0.5, name='dropout_4'),
        layers.Dense(128, activation='relu', name='dense_2'),
        layers.Dropout(0.5, name='dropout_5'),
        
        # Output layer (binary classification)
        layers.Dense(1, activation='sigmoid', name='output')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
    )
    
    print("✅ Model architecture:")
    model.summary()
    
    return model

# ═══════════════════════════════════════════════════════════════════
# TRAINING PIPELINE
# ═══════════════════════════════════════════════════════════════════

def train_url_model(csv_path):
    """
    Complete training pipeline for URL phishing detection
    """
    print("\n" + "="*70)
    print("🚀 URL PHISHING DETECTION - CHARACTER CNN TRAINING")
    print("="*70 + "\n")
    
    # 1. Load dataset
    urls, labels = load_url_dataset(csv_path)
    
    # 2. Preprocess URLs
    X = preprocess_urls(urls)
    y = labels
    
    # 3. Split dataset
    print(f"\n📊 Splitting dataset (test size: {TEST_SIZE})...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=42, stratify=y
    )
    
    print(f"   - Training samples: {len(X_train)}")
    print(f"   - Test samples: {len(X_test)}")
    
    # 4. Build model
    model = build_character_cnn_model()
    
    # 5. Callbacks
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=5,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=3,
            min_lr=1e-7,
            verbose=1
        ),
        keras.callbacks.ModelCheckpoint(
            MODEL_SAVE_PATH + '_best.h5',
            monitor='val_accuracy',
            save_best_only=True,
            verbose=1
        )
    ]
    
    # 6. Train model
    print(f"\n🎯 Training model (epochs: {EPOCHS}, batch size: {BATCH_SIZE})...")
    history = model.fit(
        X_train, y_train,
        validation_split=VALIDATION_SPLIT,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1
    )
    
    # 7. Evaluate on test set
    print("\n📈 Evaluating model on test set...")
    test_loss, test_acc, test_precision, test_recall = model.evaluate(X_test, y_test, verbose=0)
    
    # 8. Generate predictions for detailed metrics
    y_pred_proba = model.predict(X_test, verbose=0)
    y_pred = (y_pred_proba > 0.5).astype(int).flatten()
    
    # 9. Calculate metrics
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, y_pred, average='binary')
    
    print("\n" + "="*70)
    print("📊 FINAL EVALUATION METRICS")
    print("="*70)
    print(f"Accuracy:  {test_acc:.4f} ({test_acc*100:.2f}%)")
    print(f"Precision: {precision:.4f} ({precision*100:.2f}%)")
    print(f"Recall:    {recall:.4f} ({recall*100:.2f}%)")
    print(f"F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
    print(f"Loss:      {test_loss:.4f}")
    print("="*70)
    
    # 10. Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\n📋 Confusion Matrix:")
    print(f"                  Predicted")
    print(f"                Safe  Phishing")
    print(f"Actual Safe     {cm[0][0]:5d}  {cm[0][1]:5d}")
    print(f"       Phishing {cm[1][0]:5d}  {cm[1][1]:5d}")
    
    # 11. Classification Report
    print("\n📝 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Safe', 'Phishing']))
    
    # 12. Save models
    print("\n💾 Saving models...")
    
    # Save native TensorFlow model
    os.makedirs(MODEL_SAVE_PATH, exist_ok=True)
    model.save(MODEL_SAVE_PATH)
    print(f"   ✅ Saved TensorFlow model to: {MODEL_SAVE_PATH}")
    
    # Convert to TensorFlow.js format
    os.makedirs(TFJS_SAVE_PATH, exist_ok=True)
    tfjs.converters.save_keras_model(model, TFJS_SAVE_PATH)
    print(f"   ✅ Saved TensorFlow.js model to: {TFJS_SAVE_PATH}")
    
    # 13. Save metadata
    metadata = {
        'model_type': 'url_character_cnn',
        'version': '1.0',
        'max_url_length': MAX_URL_LENGTH,
        'vocab_size': VOCAB_SIZE,
        'embedding_dim': EMBEDDING_DIM,
        'metrics': {
            'accuracy': float(test_acc),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'loss': float(test_loss)
        },
        'training_params': {
            'epochs': EPOCHS,
            'batch_size': BATCH_SIZE,
            'validation_split': VALIDATION_SPLIT,
            'test_size': TEST_SIZE
        },
        'dataset_info': {
            'total_samples': len(urls),
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'safe_count': int((labels == 0).sum()),
            'phishing_count': int((labels == 1).sum())
        }
    }
    
    metadata_path = os.path.join(TFJS_SAVE_PATH, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"   ✅ Saved metadata to: {metadata_path}")
    
    print("\n✨ Training complete!")
    return model, history, metadata

# ═══════════════════════════════════════════════════════════════════
# MAIN EXECUTION
# ═══════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python url_cnn_training.py <path_to_url_dataset.csv>")
        print("\nExpected CSV format:")
        print("  - Column 'url': URL string")
        print("  - Column 'label': 0 (safe) or 1 (phishing)")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    
    if not os.path.exists(csv_path):
        print(f"❌ Error: Dataset file not found: {csv_path}")
        sys.exit(1)
    
    # Train model
    model, history, metadata = train_url_model(csv_path)
    
    print("\n" + "="*70)
    print("🎉 SUCCESS! URL phishing detection model is ready for deployment")
    print("="*70)
    print(f"\n📁 Model files location: {TFJS_SAVE_PATH}")
    print(f"   - model.json (model architecture)")
    print(f"   - group1-shard*.bin (model weights)")
    print(f"   - metadata.json (model info)")
    print("\n💡 Next steps:")
    print("   1. Copy model files to your web app's /public/models/url/ directory")
    print("   2. Update backend to load this model for URL inference")
    print("   3. Test with sample URLs to verify deployment")
