"""
SMS Phishing Detection - Bi-LSTM Model Training Script

Dataset: Kaggle SMS Phishing Dataset
Architecture: Bidirectional LSTM for SMS text classification
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
import re

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

MAX_SMS_LENGTH = 160  # Typical SMS length
VOCAB_SIZE = 5000  # Vocabulary size for SMS
EMBEDDING_DIM = 100
BATCH_SIZE = 32
EPOCHS = 15
VALIDATION_SPLIT = 0.2
TEST_SIZE = 0.15

# Model output paths
MODEL_SAVE_PATH = './models/sms_model'
TFJS_SAVE_PATH = './public/models/sms'

# ═══════════════════════════════════════════════════════════════════
# DATA LOADING & PREPROCESSING
# ═══════════════════════════════════════════════════════════════════

def load_sms_dataset(csv_path):
    """
    Load SMS phishing dataset from CSV
    Expected columns: sms_text, label (0=legitimate, 1=phishing/spam)
    """
    print("📂 Loading SMS dataset...")
    df = pd.read_csv(csv_path)
    
    # Handle different possible column names
    text_col = None
    label_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        if 'sms' in col_lower or 'text' in col_lower or 'message' in col_lower or 'content' in col_lower:
            text_col = col
        if 'label' in col_lower or 'class' in col_lower or 'target' in col_lower or 'spam' in col_lower:
            label_col = col
    
    if not text_col or not label_col:
        raise ValueError(f"Could not find SMS text and label columns. Available columns: {df.columns.tolist()}")
    
    # Clean data
    df = df.dropna(subset=[text_col, label_col])
    
    # Handle different label formats
    if df[label_col].dtype == 'object':
        # Map string labels to binary
        label_mapping = {
            'ham': 0, 'legitimate': 0, 'safe': 0, 'normal': 0,
            'spam': 1, 'phishing': 1, 'phish': 1, 'malicious': 1, 'smishing': 1
        }
        df[label_col] = df[label_col].str.lower().map(label_mapping)
    
    df[label_col] = df[label_col].astype(int)
    
    print(f"✅ Loaded {len(df)} SMS messages")
    print(f"   - Legitimate messages: {(df[label_col] == 0).sum()}")
    print(f"   - Phishing/Spam messages: {(df[label_col] == 1).sum()}")
    
    return df[text_col].values, df[label_col].values

def clean_sms_text(text):
    """
    Clean and normalize SMS text
    """
    # Convert to lowercase
    text = text.lower()
    
    # Remove URLs
    text = re.sub(r'http\S+|www\.\S+', ' url ', text)
    
    # Remove phone numbers (rough pattern)
    text = re.sub(r'\b\d{10,}\b', ' phonenumber ', text)
    
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def preprocess_sms(messages, vocab_size=VOCAB_SIZE, max_length=MAX_SMS_LENGTH):
    """
    Preprocess SMS messages using TextVectorization
    """
    print(f"🔧 Processing SMS messages (vocab: {vocab_size}, max length: {max_length})...")
    
    # Clean messages
    cleaned_messages = [clean_sms_text(msg) for msg in messages]
    
    # Create and adapt TextVectorization layer
    vectorize_layer = keras.layers.TextVectorization(
        max_tokens=vocab_size,
        output_sequence_length=max_length,
        output_mode='int',
        standardize=None  # Already cleaned
    )
    
    vectorize_layer.adapt(cleaned_messages)
    
    # Transform messages
    X = vectorize_layer(cleaned_messages).numpy()
    
    return X, vectorize_layer

# ═══════════════════════════════════════════════════════════════════
# MODEL ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════

def build_bilstm_model():
    """
    Bidirectional LSTM model for SMS phishing detection
    
    Architecture:
    - Word embedding layer
    - 2x Bidirectional LSTM layers
    - Dense layers with dropout
    - Binary classification output
    """
    print("🏗️ Building Bi-LSTM model...")
    
    model = keras.Sequential([
        # Input layer
        layers.Input(shape=(MAX_SMS_LENGTH,)),
        
        # Word embedding
        layers.Embedding(
            input_dim=VOCAB_SIZE,
            output_dim=EMBEDDING_DIM,
            input_length=MAX_SMS_LENGTH,
            mask_zero=True,
            name='word_embedding'
        ),
        
        # Spatial dropout for embedding
        layers.SpatialDropout1D(0.2, name='spatial_dropout'),
        
        # Bidirectional LSTM Block 1
        layers.Bidirectional(
            layers.LSTM(128, return_sequences=True, dropout=0.3, recurrent_dropout=0.2),
            name='bilstm_1'
        ),
        
        # Bidirectional LSTM Block 2
        layers.Bidirectional(
            layers.LSTM(64, dropout=0.3, recurrent_dropout=0.2),
            name='bilstm_2'
        ),
        
        # Dense layers
        layers.Dense(128, activation='relu', name='dense_1'),
        layers.Dropout(0.5, name='dropout_1'),
        layers.Dense(64, activation='relu', name='dense_2'),
        layers.Dropout(0.5, name='dropout_2'),
        
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

def train_sms_model(csv_path):
    """
    Complete training pipeline for SMS phishing detection
    """
    print("\n" + "="*70)
    print("🚀 SMS PHISHING DETECTION - BI-LSTM TRAINING")
    print("="*70 + "\n")
    
    # 1. Load dataset
    messages, labels = load_sms_dataset(csv_path)
    
    # 2. Split dataset first
    print(f"\n📊 Splitting dataset (test size: {TEST_SIZE})...")
    messages_train, messages_test, y_train, y_test = train_test_split(
        messages, labels, test_size=TEST_SIZE, random_state=42, stratify=labels
    )
    
    print(f"   - Training samples: {len(messages_train)}")
    print(f"   - Test samples: {len(messages_test)}")
    
    # 3. Preprocess SMS
    X_train, vectorize_layer = preprocess_sms(messages_train)
    X_test = vectorize_layer(np.array([clean_sms_text(msg) for msg in messages_test])).numpy()
    
    # 4. Build model
    model = build_bilstm_model()
    
    # 5. Class weights (if imbalanced dataset)
    class_weights = None
    class_0_count = (y_train == 0).sum()
    class_1_count = (y_train == 1).sum()
    
    if class_0_count > 0 and class_1_count > 0:
        total = class_0_count + class_1_count
        class_weights = {
            0: total / (2 * class_0_count),
            1: total / (2 * class_1_count)
        }
        print(f"\n⚖️ Using class weights: {class_weights}")
    
    # 6. Callbacks
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
    
    # 7. Train model
    print(f"\n🎯 Training model (epochs: {EPOCHS}, batch size: {BATCH_SIZE})...")
    history = model.fit(
        X_train, y_train,
        validation_split=VALIDATION_SPLIT,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1
    )
    
    # 8. Evaluate on test set
    print("\n📈 Evaluating model on test set...")
    test_loss, test_acc, test_precision, test_recall = model.evaluate(X_test, y_test, verbose=0)
    
    # 9. Generate predictions for detailed metrics
    y_pred_proba = model.predict(X_test, verbose=0)
    y_pred = (y_pred_proba > 0.5).astype(int).flatten()
    
    # 10. Calculate metrics
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
    
    # 11. Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\n📋 Confusion Matrix:")
    print(f"                    Predicted")
    print(f"                Legitimate  Phishing")
    print(f"Actual Legitimate   {cm[0][0]:5d}    {cm[0][1]:5d}")
    print(f"       Phishing     {cm[1][0]:5d}    {cm[1][1]:5d}")
    
    # 12. Classification Report
    print("\n📝 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Phishing']))
    
    # 13. Sample predictions
    print("\n🔍 Sample predictions:")
    sample_indices = np.random.choice(len(messages_test), min(5, len(messages_test)), replace=False)
    for idx in sample_indices:
        msg = messages_test[idx]
        true_label = "Phishing" if y_test[idx] == 1 else "Legitimate"
        pred_label = "Phishing" if y_pred[idx] == 1 else "Legitimate"
        confidence = y_pred_proba[idx][0] if y_pred[idx] == 1 else 1 - y_pred_proba[idx][0]
        
        print(f"\n   Message: {msg[:80]}...")
        print(f"   True: {true_label} | Predicted: {pred_label} (confidence: {confidence:.2%})")
    
    # 14. Save models
    print("\n💾 Saving models...")
    
    # Save native TensorFlow model
    os.makedirs(MODEL_SAVE_PATH, exist_ok=True)
    model.save(MODEL_SAVE_PATH)
    print(f"   ✅ Saved TensorFlow model to: {MODEL_SAVE_PATH}")
    
    # Convert to TensorFlow.js format
    os.makedirs(TFJS_SAVE_PATH, exist_ok=True)
    tfjs.converters.save_keras_model(model, TFJS_SAVE_PATH)
    print(f"   ✅ Saved TensorFlow.js model to: {TFJS_SAVE_PATH}")
    
    # Save vectorizer vocabulary
    vocab = vectorize_layer.get_vocabulary()
    vocab_path = os.path.join(TFJS_SAVE_PATH, 'vocabulary.json')
    with open(vocab_path, 'w') as f:
        json.dump(vocab, f)
    print(f"   ✅ Saved vocabulary to: {vocab_path}")
    
    # 15. Save metadata
    metadata = {
        'model_type': 'sms_bilstm',
        'version': '1.0',
        'max_sms_length': MAX_SMS_LENGTH,
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
            'test_size': TEST_SIZE,
            'class_weights': class_weights
        },
        'dataset_info': {
            'total_samples': len(messages),
            'training_samples': len(messages_train),
            'test_samples': len(messages_test),
            'legitimate_count': int((labels == 0).sum()),
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
        print("Usage: python sms_bilstm_training.py <path_to_sms_dataset.csv>")
        print("\nExpected CSV format:")
        print("  - Column 'sms_text' or 'text' or 'message': SMS content")
        print("  - Column 'label': 0/ham/legitimate or 1/spam/phishing")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    
    if not os.path.exists(csv_path):
        print(f"❌ Error: Dataset file not found: {csv_path}")
        sys.exit(1)
    
    # Train model
    model, history, metadata = train_sms_model(csv_path)
    
    print("\n" + "="*70)
    print("🎉 SUCCESS! SMS phishing detection model is ready for deployment")
    print("="*70)
    print(f"\n📁 Model files location: {TFJS_SAVE_PATH}")
    print(f"   - model.json (model architecture)")
    print(f"   - group1-shard*.bin (model weights)")
    print(f"   - vocabulary.json (word vocabulary)")
    print(f"   - metadata.json (model info)")
    print("\n💡 Next steps:")
    print("   1. Copy model files to your web app's /public/models/sms/ directory")
    print("   2. Update backend to load this model for SMS inference")
    print("   3. Test with sample SMS messages to verify deployment")
