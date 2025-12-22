/**
 * TF-IDF + Dense Neural Network for Email Phishing Detection
 * 
 * Lightweight browser-compatible model using:
 * - TF-IDF (Term Frequency-Inverse Document Frequency) for feature extraction
 * - Dense Neural Network for classification
 * - No external embeddings or large pretrained models
 * 
 * Architecture: TF-IDF Features -> Dense(128) -> Dropout -> Dense(64) -> Dense(1)
 */

import * as tf from '@tensorflow/tfjs';

export interface TFIDFConfig {
  maxFeatures: number;
  minDf: number;
  maxDf: number;
  learningRate: number;
  batchSize: number;
  epochs: number;
}

export interface EmailPrediction {
  isPhishing: boolean;
  confidence: number;
  probability: number;
  features: {
    suspiciousWords: string[];
    riskScore: number;
  };
}

export interface TrainingMetrics {
  accuracy: number;
  loss: number;
  valAccuracy?: number;
  valLoss?: number;
}

/**
 * TF-IDF Vectorizer for text feature extraction
 */
class TFIDFVectorizer {
  private vocabulary: Map<string, number> = new Map();
  private idfScores: Map<string, number> = new Map();
  private documentCount: number = 0;
  private maxFeatures: number;
  private minDf: number;
  private maxDf: number;

  constructor(maxFeatures: number = 1000, minDf: number = 1, maxDf: number = 0.95) {
    this.maxFeatures = maxFeatures;
    this.minDf = minDf;
    this.maxDf = maxDf;
  }

  /**
   * Tokenize and clean text
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Fit the vectorizer on training documents
   */
  fit(documents: string[]): void {
    this.documentCount = documents.length;
    const documentFrequency = new Map<string, number>();

    // Count document frequency for each term
    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      const uniqueTokens = new Set(tokens);
      
      for (const token of uniqueTokens) {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      }
    }

    // Filter by min/max document frequency
    const minDfCount = typeof this.minDf === 'number' && this.minDf < 1 
      ? Math.floor(this.minDf * this.documentCount)
      : this.minDf;
    
    const maxDfCount = typeof this.maxDf === 'number' && this.maxDf < 1
      ? Math.floor(this.maxDf * this.documentCount)
      : this.maxDf;

    const filteredTerms = Array.from(documentFrequency.entries())
      .filter(([_, freq]) => freq >= minDfCount && freq <= maxDfCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.maxFeatures)
      .map(([term]) => term);

    // Build vocabulary
    filteredTerms.forEach((term, idx) => {
      this.vocabulary.set(term, idx);
    });

    // Calculate IDF scores
    for (const [term, df] of documentFrequency) {
      if (this.vocabulary.has(term)) {
        const idf = Math.log((this.documentCount + 1) / (df + 1)) + 1;
        this.idfScores.set(term, idf);
      }
    }

    console.log(`✅ TF-IDF fitted with ${this.vocabulary.size} features`);
  }

  /**
   * Transform documents to TF-IDF feature vectors
   */
  transform(documents: string[]): number[][] {
    const vectors: number[][] = [];

    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      const termFrequency = new Map<string, number>();

      // Calculate term frequency
      for (const token of tokens) {
        if (this.vocabulary.has(token)) {
          termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
        }
      }

      // Build TF-IDF vector
      const vector = new Array(this.vocabulary.size).fill(0);
      for (const [term, tf] of termFrequency) {
        const idx = this.vocabulary.get(term);
        const idf = this.idfScores.get(term) || 0;
        if (idx !== undefined) {
          vector[idx] = tf * idf;
        }
      }

      // Normalize vector (L2 normalization)
      const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let i = 0; i < vector.length; i++) {
          vector[i] /= norm;
        }
      }

      vectors.push(vector);
    }

    return vectors;
  }

  /**
   * Fit and transform in one step
   */
  fitTransform(documents: string[]): number[][] {
    this.fit(documents);
    return this.transform(documents);
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  /**
   * Get vocabulary terms
   */
  getVocabulary(): string[] {
    return Array.from(this.vocabulary.keys());
  }

  /**
   * Get important terms from a document
   */
  getTopTerms(document: string, topN: number = 10): Array<{term: string, score: number}> {
    const tokens = this.tokenize(document);
    const termFrequency = new Map<string, number>();

    for (const token of tokens) {
      if (this.vocabulary.has(token)) {
        termFrequency.set(token, (termFrequency.get(token) || 0) + 1);
      }
    }

    const termScores = Array.from(termFrequency.entries())
      .map(([term, tf]) => ({
        term,
        score: tf * (this.idfScores.get(term) || 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);

    return termScores;
  }
}

/**
 * Dense Neural Network model for email phishing detection
 */
export class TFIDFEmailModel {
  private model: tf.LayersModel | null = null;
  private vectorizer: TFIDFVectorizer;
  private config: TFIDFConfig;
  private isInitialized: boolean = false;
  private suspiciousPatterns: Set<string> = new Set([
    'urgent', 'verify', 'account', 'suspended', 'click', 'confirm', 'update',
    'password', 'security', 'bank', 'paypal', 'alert', 'action', 'required',
    'limited', 'expire', 'unusual', 'activity', 'locked', 'unauthorized',
    'prize', 'winner', 'congratulations', 'claim', 'free', 'gift'
  ]);

  constructor(config?: Partial<TFIDFConfig>) {
    this.config = {
      maxFeatures: 1000,
      minDf: 2,
      maxDf: 0.9,
      learningRate: 0.001,
      batchSize: 16,
      epochs: 20,
      ...config
    };

    this.vectorizer = new TFIDFVectorizer(
      this.config.maxFeatures,
      this.config.minDf,
      this.config.maxDf
    );
  }

  /**
   * Build the Dense Neural Network model
   */
  private buildModel(inputDim: number): tf.LayersModel {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.inputLayer({ inputShape: [inputDim] }));

    // First dense layer with ReLU activation
    model.add(tf.layers.dense({
      units: 128,
      activation: 'relu',
      kernelInitializer: 'heNormal',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));

    // Batch normalization for stable training
    model.add(tf.layers.batchNormalization());

    // Dropout for regularization
    model.add(tf.layers.dropout({ rate: 0.3 }));

    // Second dense layer
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      kernelInitializer: 'heNormal',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
    }));

    // Batch normalization
    model.add(tf.layers.batchNormalization());

    // Dropout
    model.add(tf.layers.dropout({ rate: 0.2 }));

    // Output layer with sigmoid activation for binary classification
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });

    console.log('📊 Email Model Architecture:');
    model.summary();

    return model;
  }

  /**
   * Train the model on email dataset
   */
  async train(
    emails: string[],
    labels: number[],
    validationSplit: number = 0.2,
    onEpochEnd?: (epoch: number, logs: any) => void
  ): Promise<TrainingMetrics> {
    console.log('🏋️ Training TF-IDF Email Model...');
    console.log(`📊 Training samples: ${emails.length}`);

    // Fit TF-IDF vectorizer and transform emails
    const features = this.vectorizer.fitTransform(emails);
    const inputDim = this.vectorizer.getVocabularySize();

    // Build model
    this.model = this.buildModel(inputDim);

    // Convert to tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels, [labels.length, 1]);

    try {
      // Train the model
      const history = await this.model.fit(xs, ys, {
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

      const finalEpoch = history.history.acc.length - 1;
      const metrics: TrainingMetrics = {
        accuracy: history.history.acc[finalEpoch] as number,
        loss: history.history.loss[finalEpoch] as number,
        valAccuracy: history.history.val_acc?.[finalEpoch] as number,
        valLoss: history.history.val_loss?.[finalEpoch] as number
      };

      this.isInitialized = true;
      console.log('✅ Training completed');
      console.log('📈 Final Metrics:', metrics);

      return metrics;
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  /**
   * Predict phishing probability for a single email
   * Uses tf.tidy() for automatic tensor memory management
   */
  async predict(email: string): Promise<EmailPrediction> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    // Run prediction with automatic tensor cleanup
    const probability = await tf.tidy(async () => {
      // Transform email to TF-IDF features
      const features = this.vectorizer.transform([email]);
      const input = tf.tensor2d(features);

      // Make prediction
      const prediction = this.model!.predict(input) as tf.Tensor;
      const probData = await prediction.data();
      
      // Extract probability before tf.tidy disposes tensors
      return probData[0];
    });

    // Analyze suspicious words
    const suspiciousWords = this.analyzeSuspiciousWords(email);
    const riskScore = this.calculateRiskScore(email, probability);

    return {
      isPhishing: probability > 0.5,
      confidence: Math.abs(probability - 0.5) * 2,
      probability: probability,
      features: {
        suspiciousWords,
        riskScore
      }
    };
  }

  /**
   * Batch prediction for multiple emails
   * Uses tf.tidy() for automatic tensor memory management
   */
  async predictBatch(emails: string[]): Promise<EmailPrediction[]> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    // Run batch prediction with automatic tensor cleanup
    const probabilities = await tf.tidy(async () => {
      const features = this.vectorizer.transform(emails);
      const input = tf.tensor2d(features);

      const predictions = this.model!.predict(input) as tf.Tensor;
      const probs = await predictions.data();

      // Return copy before tf.tidy disposes tensors
      return Array.from(probs);
    });

    return emails.map((email, idx) => {
      const probability = probabilities[idx];
      const suspiciousWords = this.analyzeSuspiciousWords(email);
      const riskScore = this.calculateRiskScore(email, probability);

      return {
        isPhishing: probability > 0.5,
        confidence: Math.abs(probability - 0.5) * 2,
        probability: probability,
        features: {
          suspiciousWords,
          riskScore
        }
      };
    });
  }

  /**
   * Analyze suspicious words in email
   */
  private analyzeSuspiciousWords(email: string): string[] {
    const words = email.toLowerCase().split(/\s+/);
    const found: string[] = [];

    for (const word of words) {
      for (const pattern of this.suspiciousPatterns) {
        if (word.includes(pattern)) {
          found.push(pattern);
        }
      }
    }

    return [...new Set(found)];
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(email: string, mlProbability: number): number {
    let score = mlProbability * 100;

    // Adjust based on length
    if (email.length < 50) {
      score += 5;
    }

    // Adjust based on suspicious words
    const suspiciousWords = this.analyzeSuspiciousWords(email);
    score += suspiciousWords.length * 3;

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Evaluate model on test set
   */
  async evaluate(testEmails: string[], testLabels: number[]): Promise<TrainingMetrics> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.');
    }

    const features = this.vectorizer.transform(testEmails);
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(testLabels, [testLabels.length, 1]);

    try {
      const result = this.model.evaluate(xs, ys) as tf.Scalar[];
      const loss = await result[0].data();
      const accuracy = await result[1].data();

      result.forEach(r => r.dispose());

      return {
        accuracy: accuracy[0],
        loss: loss[0]
      };
    } finally {
      xs.dispose();
      ys.dispose();
    }
  }

  /**
   * Get top important terms from email
   */
  getImportantTerms(email: string, topN: number = 10): Array<{term: string, score: number}> {
    return this.vectorizer.getTopTerms(email, topN);
  }

  /**
   * Get model configuration
   */
  getConfig(): TFIDFConfig {
    return { ...this.config };
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.vectorizer.getVocabularySize();
  }

  /**
   * Check if model is trained
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }

  /**
   * Dispose model and free memory
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    console.log('🧹 Email model disposed');
  }
}

// Singleton instance
let emailModel: TFIDFEmailModel | null = null;

/**
 * Get or create email model instance
 */
export function getEmailModel(): TFIDFEmailModel {
  if (!emailModel) {
    emailModel = new TFIDFEmailModel();
  }
  return emailModel;
}
