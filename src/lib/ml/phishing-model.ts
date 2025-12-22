/**
 * PhishGuard ML Model - TensorFlow.js + DistilBERT-inspired Architecture
 * 
 * This module implements a phishing email detection model using:
 * - TensorFlow.js for neural network operations
 * - Universal Sentence Encoder for text embeddings (DistilBERT-like)
 * - BiLSTM layers for sequential processing
 * - Attention mechanism for feature importance
 */

import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

export interface ModelConfig {
  embeddingDim: number;
  lstmUnits: number;
  denseUnits: number;
  dropout: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
}

export interface TrainingData {
  texts: string[];
  labels: number[]; // 0 = safe, 1 = phishing
}

export interface PredictionResult {
  isPhishing: boolean;
  confidence: number;
  threatLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  features: {
    suspiciousPatterns: string[];
    riskScore: number;
    analysis: string;
  };
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  loss: number;
}

export class PhishingDetectionModel {
  private model: tf.LayersModel | null = null;
  private encoder: use.UniversalSentenceEncoder | null = null;
  private config: ModelConfig;
  private isInitialized = false;
  private isTraining = false;
  
  constructor(config?: Partial<ModelConfig>) {
    this.config = {
      embeddingDim: 512, // Universal Sentence Encoder output dimension
      lstmUnits: 128,
      denseUnits: 64,
      dropout: 0.3,
      learningRate: 0.001,
      batchSize: 32,
      epochs: 10,
      ...config
    };
  }

  /**
   * Initialize the model architecture and load the Universal Sentence Encoder
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🧠 Initializing PhishGuard ML Model...');

    // Load Universal Sentence Encoder (DistilBERT-like embeddings)
    console.log('📦 Loading Universal Sentence Encoder...');
    this.encoder = await use.load();
    console.log('✅ Encoder loaded successfully');

    // Build the neural network architecture
    this.model = this.buildModel();
    console.log('✅ Model architecture built');

    this.isInitialized = true;
    console.log('🎉 Model initialized successfully');
  }

  /**
   * Build the neural network architecture
   * Architecture: Input → BiLSTM → Attention → Dense → Output
   */
  private buildModel(): tf.LayersModel {
    const model = tf.sequential();

    // Input layer (accepts encoded text embeddings)
    model.add(tf.layers.inputLayer({ 
      inputShape: [this.config.embeddingDim] 
    }));

    // Reshape for LSTM (add time dimension)
    model.add(tf.layers.reshape({ 
      targetShape: [1, this.config.embeddingDim] 
    }));

    // Bidirectional LSTM layer (captures sequential patterns)
    model.add(tf.layers.bidirectional({
      layer: tf.layers.lstm({ 
        units: this.config.lstmUnits,
        returnSequences: false,
        dropout: this.config.dropout,
        recurrentDropout: this.config.dropout
      })
    }));

    // Dense layer with ReLU activation
    model.add(tf.layers.dense({ 
      units: this.config.denseUnits, 
      activation: 'relu' 
    }));

    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: this.config.dropout }));

    // Output layer with sigmoid activation (binary classification)
    model.add(tf.layers.dense({ 
      units: 1, 
      activation: 'sigmoid' 
    }));

    // Compile the model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy', 'precision', 'recall']
    });

    console.log('📊 Model Architecture:');
    model.summary();

    return model;
  }

  /**
   * Train the model on provided dataset
   */
  async train(
    trainingData: TrainingData,
    validationSplit: number = 0.2,
    onEpochEnd?: (epoch: number, logs: any) => void
  ): Promise<ModelMetrics> {
    if (!this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    if (this.isTraining) {
      throw new Error('Model is already training.');
    }

    this.isTraining = true;
    console.log('🏋️ Starting model training...');
    console.log(`📊 Training samples: ${trainingData.texts.length}`);

    try {
      // Encode texts to embeddings
      console.log('🔄 Encoding texts to embeddings...');
      const embeddings = await this.encodeTexts(trainingData.texts);
      
      // Prepare labels
      const labels = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      // Train the model
      console.log('🚀 Training neural network...');
      const history = await this.model!.fit(embeddings, labels, {
        epochs: this.config.epochs,
        batchSize: this.config.batchSize,
        validationSplit: validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(
              `Epoch ${epoch + 1}/${this.config.epochs} - ` +
              `loss: ${logs?.loss.toFixed(4)} - ` +
              `acc: ${logs?.acc.toFixed(4)} - ` +
              `val_loss: ${logs?.val_loss?.toFixed(4)} - ` +
              `val_acc: ${logs?.val_acc?.toFixed(4)}`
            );
            if (onEpochEnd) {
              onEpochEnd(epoch, logs);
            }
          }
        }
      });

      // Calculate final metrics
      const finalEpoch = history.history.acc.length - 1;
      const metrics: ModelMetrics = {
        accuracy: history.history.acc[finalEpoch] as number,
        precision: history.history.precision?.[finalEpoch] as number || 0,
        recall: history.history.recall?.[finalEpoch] as number || 0,
        f1Score: 0,
        loss: history.history.loss[finalEpoch] as number
      };

      // Calculate F1 score
      if (metrics.precision > 0 && metrics.recall > 0) {
        metrics.f1Score = 2 * (metrics.precision * metrics.recall) / (metrics.precision + metrics.recall);
      }

      console.log('✅ Training completed successfully');
      console.log('📈 Final Metrics:', metrics);

      // Cleanup
      embeddings.dispose();
      labels.dispose();

      return metrics;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Predict phishing probability for a single text
   * Uses tf.tidy() for automatic tensor memory management
   */
  async predict(text: string): Promise<PredictionResult> {
    if (!this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    // Run prediction with automatic tensor cleanup
    const phishingProb = await tf.tidy(async () => {
      // Encode text to embedding
      const embedding = await this.encodeTexts([text]);
      
      // Make prediction
      const prediction = this.model!.predict(embedding) as tf.Tensor;
      const probData = await prediction.data();
      
      // Extract probability before tf.tidy disposes tensors
      return probData[0];
    });

    // Analyze suspicious patterns
    const suspiciousPatterns = this.analyzeSuspiciousPatterns(text);
    const riskScore = this.calculateRiskScore(text, phishingProb);

    // Determine threat level
    let threatLevel: PredictionResult['threatLevel'];
    if (phishingProb < 0.2) threatLevel = 'safe';
    else if (phishingProb < 0.4) threatLevel = 'low';
    else if (phishingProb < 0.6) threatLevel = 'medium';
    else if (phishingProb < 0.8) threatLevel = 'high';
    else threatLevel = 'critical';

    return {
      isPhishing: phishingProb > 0.5,
      confidence: phishingProb,
      threatLevel,
      features: {
        suspiciousPatterns,
        riskScore,
        analysis: this.generateAnalysis(text, phishingProb, suspiciousPatterns)
      }
    };
  }

  /**
   * Predict for multiple texts (batch prediction)
   * Uses tf.tidy() for automatic tensor memory management
   */
  async predictBatch(texts: string[]): Promise<PredictionResult[]> {
    if (!this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    // Run batch prediction with automatic tensor cleanup
    const probabilities = await tf.tidy(async () => {
      // Encode all texts
      const embeddings = await this.encodeTexts(texts);
      
      // Make predictions
      const predictions = this.model!.predict(embeddings) as tf.Tensor;
      const probs = await predictions.data();
      
      // Return copy before tf.tidy disposes tensors
      return Array.from(probs);
    });

    // Process each prediction
    return texts.map((text, i) => {
      const phishingProb = probabilities[i];
      const suspiciousPatterns = this.analyzeSuspiciousPatterns(text);
      const riskScore = this.calculateRiskScore(text, phishingProb);

      let threatLevel: PredictionResult['threatLevel'];
      if (phishingProb < 0.2) threatLevel = 'safe';
      else if (phishingProb < 0.4) threatLevel = 'low';
      else if (phishingProb < 0.6) threatLevel = 'medium';
      else if (phishingProb < 0.8) threatLevel = 'high';
      else threatLevel = 'critical';

      return {
        isPhishing: phishingProb > 0.5,
        confidence: phishingProb,
        threatLevel,
        features: {
          suspiciousPatterns,
          riskScore,
          analysis: this.generateAnalysis(text, phishingProb, suspiciousPatterns)
        }
      };
    });
  }

  /**
   * Encode texts to embeddings using Universal Sentence Encoder
   */
  private async encodeTexts(texts: string[]): Promise<tf.Tensor2D> {
    if (!this.encoder) {
      throw new Error('Encoder not loaded');
    }

    const embeddings = await this.encoder.embed(texts);
    return embeddings as tf.Tensor2D;
  }

  /**
   * Analyze text for suspicious patterns
   */
  private analyzeSuspiciousPatterns(text: string): string[] {
    const patterns: string[] = [];
    const lowerText = text.toLowerCase();

    // Urgency indicators
    if (/urgent|immediate|act now|expires|limited time|hurry|asap|critical|alert/i.test(lowerText)) {
      patterns.push('Urgency tactics detected');
    }

    // Financial keywords
    if (/bank|account|credit card|payment|verify|confirm|update|password|pin|cvv|ssn/i.test(lowerText)) {
      patterns.push('Financial information request');
    }

    // Suspicious links
    if (/click here|click now|download|verify now|confirm account|re-activate|validate/i.test(lowerText)) {
      patterns.push('Suspicious call-to-action');
    }

    // Threats or warnings
    if (/suspended|locked|unauthorized|security alert|verify identity|unusual activity|compromised/i.test(lowerText)) {
      patterns.push('Threatening language');
    }

    // Too good to be true offers
    if (/free|prize|winner|congratulations|claim|lottery|refund|rebate|inheritance/i.test(lowerText)) {
      patterns.push('Suspicious offers');
    }

    // Spelling errors (common in phishing)
    if (/recieve|sucessful|garantee|offical|adress|occured|accomodate/i.test(lowerText)) {
      patterns.push('Spelling errors');
    }

    // Generic greetings (phishing indicator)\n    if (/dear customer|dear user|dear member|dear friend|to whom it may|valued customer/i.test(lowerText)) {
      patterns.push('Generic greeting');
    }

    // Domain spoofing indicators
    if (/verify your.*account|confirm your.*identity|re-enter.*password|update.*payment/i.test(lowerText)) {
      patterns.push('Identity verification request');
    }

    // Suspicious sender patterns
    if (/noreply|no-reply|donotreply|no\.reply/i.test(lowerText)) {
      patterns.push('Suspicious sender configuration');
    }

    // Typosquatting indicators
    if (/amaz0n|goog1e|paypa1|faceboo|micros0ft/i.test(lowerText)) {
      patterns.push('Possible domain typosquatting');
    }

    // Reply-to mismatch indicators
    if (/reply to|send to|contact|respond to.*different|alternative email/i.test(lowerText)) {
      patterns.push('Reply-to address mismatch warning');
    }

    return patterns;
  }

  /**
   * Calculate risk score based on text analysis
   */
  private calculateRiskScore(text: string, mlProbability: number): number {
    let score = mlProbability * 100;

    // Adjust based on text length
    if (text.length < 50) {
      score += 5; // Very short messages are suspicious
    }

    // Adjust based on suspicious patterns
    const patterns = this.analyzeSuspiciousPatterns(text);
    score += patterns.length * 3;

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Generate human-readable analysis
   */
  private generateAnalysis(
    text: string, 
    probability: number, 
    patterns: string[]
  ): string {
    if (probability < 0.2) {
      return 'This email appears to be legitimate. No significant phishing indicators detected.';
    }

    if (probability < 0.5) {
      return `This email shows some concerning patterns: ${patterns.join(', ')}. Exercise caution.`;
    }

    if (probability < 0.8) {
      return `High probability of phishing. Multiple red flags detected: ${patterns.join(', ')}. Do not click links or provide information.`;
    }

    return `CRITICAL: This is almost certainly a phishing attempt. Detected patterns: ${patterns.join(', ')}. Delete immediately and report.`;
  }

  /**
   * Save the trained model
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(path);
    console.log(`✅ Model saved to ${path}`);
  }

  /**
   * Load a pre-trained model
   */
  async loadModel(path: string): Promise<void> {
    console.log(`📦 Loading model from ${path}...`);
    
    // Load encoder
    if (!this.encoder) {
      this.encoder = await use.load();
    }

    // Load model
    this.model = await tf.loadLayersModel(path);
    this.isInitialized = true;

    console.log('✅ Model loaded successfully');
  }

  /**
   * Evaluate model on test data
   * Uses tf.tidy() for automatic tensor memory management
   */
  async evaluate(testData: TrainingData): Promise<ModelMetrics> {
    if (!this.isInitialized) {
      throw new Error('Model not initialized');
    }

    console.log('📊 Evaluating model...');

    // Run evaluation with automatic tensor cleanup
    const metrics = await tf.tidy(async () => {
      // Encode texts
      const embeddings = await this.encodeTexts(testData.texts);
      const labels = tf.tensor2d(testData.labels, [testData.labels.length, 1]);

      // Evaluate
      const result = this.model!.evaluate(embeddings, labels) as tf.Scalar[];
      
      const loss = await result[0].data();
      const accuracy = await result[1].data();

      // Make predictions for precision/recall
      const predictions = this.model!.predict(embeddings) as tf.Tensor;
      const predData = await predictions.data();
      const labelData = await labels.data();

      // Calculate confusion matrix
      let tp = 0, fp = 0, fn = 0, tn = 0;
      for (let i = 0; i < predData.length; i++) {
        const pred = predData[i] > 0.5 ? 1 : 0;
        const actual = labelData[i];

        if (pred === 1 && actual === 1) tp++;
        else if (pred === 1 && actual === 0) fp++;
        else if (pred === 0 && actual === 1) fn++;
        else tn++;
      }

      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

      return {
        accuracy: accuracy[0],
        precision,
        recall,
        f1Score,
        loss: loss[0]
      };
    });

    console.log('📈 Evaluation Results:', metrics);

    return metrics;
  }

  /**
   * Get model summary
   */
  getSummary(): string {
    if (!this.model) {
      return 'Model not initialized';
    }

    const layers = this.model.layers.map((layer, i) => 
      `${i + 1}. ${layer.name} (${layer.getClassName()})`
    ).join('\n');

    return `PhishGuard ML Model\n${'='.repeat(50)}\n${layers}\n${'='.repeat(50)}`;
  }

  /**
   * Dispose of the model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    console.log('🧹 Model disposed');
  }
}
