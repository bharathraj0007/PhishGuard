"""
Email Phishing Detection - DistilBERT Fine-tuning Script

Dataset: Kaggle Email Phishing Dataset
Architecture: DistilBERT (transformer-based) for text classification
Output: TensorFlow.js model for deployment
"""

import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from transformers import DistilBertTokenizer, TFDistilBertForSequenceClassification
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
import tensorflowjs as tfjs
import os
import json

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

MAX_EMAIL_LENGTH = 512  # BERT max sequence length
BATCH_SIZE = 16
EPOCHS = 5  # Fine-tuning typically requires fewer epochs
VALIDATION_SPLIT = 0.2
TEST_SIZE = 0.15
LEARNING_RATE = 2e-5

# Model paths
MODEL_SAVE_PATH = './models/email_model'
TFJS_SAVE_PATH = './public/models/email'
MODEL_NAME = 'distilbert-base-uncased'

# ═══════════════════════════════════════════════════════════════════
# DATA LOADING & PREPROCESSING
# ═══════════════════════════════════════════════════════════════════

def load_email_dataset(csv_path):
    """
    Load email phishing dataset from CSV
    Expected columns: email_text, label (0=legitimate, 1=phishing)
    """
    print("📂 Loading email dataset...")
    df = pd.read_csv(csv_path)
    
    # Handle different possible column names
    text_col = None
    label_col = None
    
    for col in df.columns:
        col_lower = col.lower()
        if 'email' in col_lower or 'text' in col_lower or 'content' in col_lower or 'message' in col_lower:
            text_col = col
        if 'label' in col_lower or 'class' in col_lower or 'target' in col_lower:
            label_col = col
    
    if not text_col or not label_col:
        raise ValueError(f"Could not find email text and label columns. Available columns: {df.columns.tolist()}")
    
    # Clean data
    df = df.dropna(subset=[text_col, label_col])
    df[label_col] = df[label_col].astype(int)
    
    print(f"✅ Loaded {len(df)} emails")
    print(f"   - Legitimate emails: {(df[label_col] == 0).sum()}")
    print(f"   - Phishing emails: {(df[label_col] == 1).sum()}")
    
    return df[text_col].values, df[label_col].values

def preprocess_emails(emails, tokenizer, max_length=MAX_EMAIL_LENGTH):
    """
    Tokenize and encode emails using DistilBERT tokenizer
    """
    print(f"🔧 Tokenizing emails (max length: {max_length})...")
    
    encodings = tokenizer(
        emails.tolist(),
        truncation=True,
        padding='max_length',
        max_length=max_length,
        return_tensors='tf'
    )
    
    return encodings

# ═══════════════════════════════════════════════════════════════════
# MODEL ARCHITECTURE
# ═══════════════════════════════════════════════════════════════════

def build_distilbert_model():
    """
    Load pre-trained DistilBERT and add classification head
    """
    print(f"🏗️ Loading DistilBERT model ({MODEL_NAME})...")
    
    # Load pre-trained DistilBERT
    model = TFDistilBertForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=2  # Binary classification
    )
    
    # Compile model
    optimizer = keras.optimizers.Adam(learning_rate=LEARNING_RATE)
    loss = keras.losses.SparseCategoricalCrossentropy(from_logits=True)
    
    model.compile(
        optimizer=optimizer,
        loss=loss,
        metrics=['accuracy']
    )
    
    print("✅ Model loaded and compiled")
    return model

# ═══════════════════════════════════════════════════════════════════
# SIMPLIFIED MODEL FOR TFJS (ALTERNATIVE)
# ═══════════════════════════════════════════════════════════════════

def build_simplified_text_model():
    """
    Simplified LSTM-based model that can be converted to TensorFlow.js
    (DistilBERT is too large for browser deployment)
    
    This is a practical alternative that maintains good accuracy
    while being deployable to web browsers.
    """
    print("🏗️ Building simplified LSTM text classification model...")
    
    # Vocabulary size (top 10k words)
    vocab_size = 10000
    embedding_dim = 128
    
    model = keras.Sequential([
        # Input layer
        layers.Input(shape=(MAX_EMAIL_LENGTH,)),
        
        # Embedding layer
        layers.Embedding(
            input_dim=vocab_size,
            output_dim=embedding_dim,
            input_length=MAX_EMAIL_LENGTH,
            mask_zero=True,
            name='word_embedding'
        ),
        
        # Bidirectional LSTM
        layers.Bidirectional(
            layers.LSTM(128, return_sequences=True, dropout=0.3, recurrent_dropout=0.2),
            name='bilstm_1'
        ),
        layers.Bidirectional(
            layers.LSTM(64, dropout=0.3, recurrent_dropout=0.2),
            name='bilstm_2'
        ),
        
        # Dense layers
        layers.Dense(64, activation='relu', name='dense_1'),
        layers.Dropout(0.5, name='dropout_1'),
        layers.Dense(32, activation='relu', name='dense_2'),
        layers.Dropout(0.5, name='dropout_2'),
        
        # Output layer
        layers.Dense(1, activation='sigmoid', name='output')
    ])
    
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy', keras.metrics.Precision(), keras.metrics.Recall()]
    )
    
    print("✅ Model architecture:")
    model.summary()
    
    return model, vocab_size

def preprocess_emails_for_lstm(emails, vocab_size=10000, max_length=MAX_EMAIL_LENGTH):
    """
    Preprocess emails for LSTM model using Keras TextVectorization
    """
    print(f"🔧 Processing emails for LSTM (vocab: {vocab_size}, max length: {max_length})...")
    
    # Create and adapt TextVectorization layer
    vectorize_layer = keras.layers.TextVectorization(
        max_tokens=vocab_size,
        output_sequence_length=max_length,
        output_mode='int'
    )
    
    vectorize_layer.adapt(emails)
    
    # Transform emails
    X = vectorize_layer(emails).numpy()
    
    return X, vectorize_layer

# ═══════════════════════════════════════════════════════════════════
# TRAINING PIPELINE
# ═══════════════════════════════════════════════════════════════════

def train_email_model(csv_path, use_simplified=True):
    """
    Complete training pipeline for email phishing detection
    
    Args:
        csv_path: Path to CSV dataset
        use_simplified: If True, use LSTM model (TensorFlow.js compatible)
                       If False, use DistilBERT (better accuracy, larger model)
    """
    print("\n" + "="*70)
    print("🚀 EMAIL PHISHING DETECTION - TRANSFORMER TRAINING")
    print("="*70 + "\n")
    
    # 1. Load dataset
    emails, labels = load_email_dataset(csv_path)
    
    # 2. Split dataset first
    print(f"\n📊 Splitting dataset (test size: {TEST_SIZE})...")
    emails_train, emails_test, y_train, y_test = train_test_split(
        emails, labels, test_size=TEST_SIZE, random_state=42, stratify=labels
    )
    
    print(f"   - Training samples: {len(emails_train)}")
    print(f"   - Test samples: {len(emails_test)}")
    
    # 3. Preprocess based on model type
    if use_simplified:
        print("\n📝 Using simplified LSTM model (TensorFlow.js compatible)")
        vocab_size = 10000
        X_train, vectorize_layer = preprocess_emails_for_lstm(emails_train, vocab_size)
        X_test = vectorize_layer(emails_test).numpy()
        model, _ = build_simplified_text_model()
    else:
        print("\n📝 Using DistilBERT model (high accuracy, larger size)")
        tokenizer = DistilBertTokenizer.from_pretrained(MODEL_NAME)
        train_encodings = preprocess_emails(emails_train, tokenizer)
        test_encodings = preprocess_emails(emails_test, tokenizer)
        X_train = dict(train_encodings)
        X_test = dict(test_encodings)
        model = build_distilbert_model()
    
    # 4. Callbacks
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=3,
            restore_best_weights=True,
            verbose=1
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=2,
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
    
    # 5. Train model
    print(f"\n🎯 Training model (epochs: {EPOCHS}, batch size: {BATCH_SIZE})...")
    history = model.fit(
        X_train, y_train,
        validation_split=VALIDATION_SPLIT,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=callbacks,
        verbose=1
    )
    
    # 6. Evaluate on test set
    print("\n📈 Evaluating model on test set...")
    if use_simplified:
        test_loss, test_acc, test_precision, test_recall = model.evaluate(X_test, y_test, verbose=0)
    else:
        test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
        test_precision = test_recall = 0  # Calculate manually below
    
    # 7. Generate predictions for detailed metrics
    y_pred_proba = model.predict(X_test, verbose=0)
    
    if use_simplified:
        y_pred = (y_pred_proba > 0.5).astype(int).flatten()
    else:
        # For DistilBERT, get logits and convert to predictions
        logits = y_pred_proba.logits
        y_pred = np.argmax(logits, axis=1)
    
    # 8. Calculate metrics
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
    
    # 9. Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    print("\n📋 Confusion Matrix:")
    print(f"                    Predicted")
    print(f"                Legitimate  Phishing")
    print(f"Actual Legitimate   {cm[0][0]:5d}    {cm[0][1]:5d}")
    print(f"       Phishing     {cm[1][0]:5d}    {cm[1][1]:5d}")
    
    # 10. Classification Report
    print("\n📝 Classification Report:")
    print(classification_report(y_test, y_pred, target_names=['Legitimate', 'Phishing']))
    
    # 11. Save models (only simplified model can be converted to TFJS)
    if use_simplified:
        print("\n💾 Saving models...")
        
        # Save native TensorFlow model
        os.makedirs(MODEL_SAVE_PATH, exist_ok=True)
        model.save(MODEL_SAVE_PATH)
        print(f"   ✅ Saved TensorFlow model to: {MODEL_SAVE_PATH}")
        
        # Convert to TensorFlow.js format
        os.makedirs(TFJS_SAVE_PATH, exist_ok=True)
        tfjs.converters.save_keras_model(model, TFJS_SAVE_PATH)
        print(f"   ✅ Saved TensorFlow.js model to: {TFJS_SAVE_PATH}")
        
        # Save vectorizer configuration
        vocab = vectorize_layer.get_vocabulary()
        vocab_path = os.path.join(TFJS_SAVE_PATH, 'vocabulary.json')
        with open(vocab_path, 'w') as f:
            json.dump(vocab, f)
        print(f"   ✅ Saved vocabulary to: {vocab_path}")
    else:
        print("\n⚠️ Note: DistilBERT model is too large for TensorFlow.js")
        print("   Saving only TensorFlow model for server-side inference")
        os.makedirs(MODEL_SAVE_PATH, exist_ok=True)
        model.save_pretrained(MODEL_SAVE_PATH)
        print(f"   ✅ Saved TensorFlow model to: {MODEL_SAVE_PATH}")
    
    # 12. Save metadata
    metadata = {
        'model_type': 'email_lstm' if use_simplified else 'email_distilbert',
        'version': '1.0',
        'max_length': MAX_EMAIL_LENGTH,
        'vocab_size': vocab_size if use_simplified else 30522,
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
            'total_samples': len(emails),
            'training_samples': len(emails_train),
            'test_samples': len(emails_test),
            'legitimate_count': int((labels == 0).sum()),
            'phishing_count': int((labels == 1).sum())
        }
    }
    
    if use_simplified:
        metadata_path = os.path.join(TFJS_SAVE_PATH, 'metadata.json')
    else:
        metadata_path = os.path.join(MODEL_SAVE_PATH, 'metadata.json')
    
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
        print("Usage: python email_bert_training.py <path_to_email_dataset.csv> [--full-bert]")
        print("\nExpected CSV format:")
        print("  - Column 'email_text' or 'text' or 'content': Email content")
        print("  - Column 'label': 0 (legitimate) or 1 (phishing)")
        print("\nOptions:")
        print("  --full-bert: Use full DistilBERT (better accuracy, larger model)")
        print("  (default): Use simplified LSTM (TensorFlow.js compatible)")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    use_simplified = '--full-bert' not in sys.argv
    
    if not os.path.exists(csv_path):
        print(f"❌ Error: Dataset file not found: {csv_path}")
        sys.exit(1)
    
    # Train model
    model, history, metadata = train_email_model(csv_path, use_simplified=use_simplified)
    
    print("\n" + "="*70)
    print("🎉 SUCCESS! Email phishing detection model is ready for deployment")
    print("="*70)
    if use_simplified:
        print(f"\n📁 Model files location: {TFJS_SAVE_PATH}")
        print(f"   - model.json (model architecture)")
        print(f"   - group1-shard*.bin (model weights)")
        print(f"   - vocabulary.json (word vocabulary)")
        print(f"   - metadata.json (model info)")
    else:
        print(f"\n📁 Model files location: {MODEL_SAVE_PATH}")
        print(f"   - config.json, tf_model.h5 (model files)")
        print(f"   - metadata.json (model info)")
    print("\n💡 Next steps:")
    print("   1. Copy model files to your web app's /public/models/email/ directory")
    print("   2. Update backend to load this model for email inference")
    print("   3. Test with sample emails to verify deployment")
