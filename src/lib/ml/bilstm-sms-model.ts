import * as tf from '@tensorflow/tfjs'

/**
 * Lightweight Bi-LSTM Model for Phishing SMS Detection
 * 
 * Optimized for browser execution:
 * - Tokenization: Word-based with small vocabulary
 * - Embedding Layer: Small embedding size (32D)
 * - Bidirectional LSTM: Single layer with 64 units
 * - Dense Layer: Simple classification head
 * - Sigmoid Output: Binary classification (phishing/legitimate)
 * 
 * Architecture: Tokenize -> Embed(32) -> BiLSTM(64) -> Dense(32) -> Dense(1)
 */

export interface SMSTrainingConfig {
  vocabSize: number;
  embeddingDim: number;
  lstmUnits: number;
  maxLength: number;
  batchSize: number;
  epochs: number;
  learningRate: number;
}

export interface SMSPrediction {
  isPhishing: boolean;
  confidence: number;
  probability: number;
  features: {
    suspiciousTokens: string[];
    riskScore: number;
  };
}

export class BiLSTMSMSModel {
  private model: tf.LayersModel | null = null
  private tokenizer: Map<string, number> = new Map()
  private vocabularySize: number = 5000 // Word-based vocabulary
  private embeddingDim: number = 32 // Small embedding for browser
  private lstmUnits: number = 64 // Smaller LSTM units
  private maxSequenceLength: number = 100 // Max tokens in SMS
  private dropout: number = 0.3
  private isInitialized: boolean = false

  /**
   * Tokenize SMS text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)
  }

  /**
   * Build tokenizer vocabulary from training texts
   */
  buildVocabulary(texts: string[]): void {
    const wordFreq = new Map<string, number>()

    // Count word frequencies
    for (const text of texts) {
      const tokens = this.tokenize(text)
      for (const token of tokens) {
        wordFreq.set(token, (wordFreq.get(token) || 0) + 1)
      }
    }

    // Sort by frequency and take top N words
    const sortedWords = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.vocabularySize - 2) // Reserve 0 for padding, 1 for unknown
      .map(([word]) => word)

    // Build tokenizer (0 = padding, 1 = unknown)
    this.tokenizer.clear()
    sortedWords.forEach((word, idx) => {
      this.tokenizer.set(word, idx + 2)
    })

    console.log(`✅ Built vocabulary with ${this.tokenizer.size} tokens`)
  }

  /**
   * Convert text to sequence of token IDs
   */
  private textToSequence(text: string): number[] {
    const tokens = this.tokenize(text)
    return tokens.map(token => this.tokenizer.get(token) || 1) // 1 = unknown token
  }

  /**
   * Pad sequences to fixed length
   */
  private padSequences(sequences: number[][], maxLen: number): number[][] {
    return sequences.map(seq => {
      if (seq.length >= maxLen) {
        return seq.slice(0, maxLen)
      }
      return [...seq, ...Array(maxLen - seq.length).fill(0)]
    })
  }

  /**
   * Build the lightweight Bi-LSTM model architecture
   */
  async build(config?: Partial<SMSTrainingConfig>): Promise<tf.LayersModel> {
    if (this.model) return this.model

    if (config) {
      this.vocabularySize = config.vocabSize || this.vocabularySize
      this.embeddingDim = config.embeddingDim || this.embeddingDim
      this.lstmUnits = config.lstmUnits || this.lstmUnits
      this.maxSequenceLength = config.maxLength || this.maxSequenceLength
    }

    const input = tf.input({ shape: [this.maxSequenceLength], dtype: 'int32' })

    // Embedding Layer: Convert token indices to dense vectors (small 32D)
    const embedding = tf.layers.embedding({
      inputDim: this.vocabularySize,
      outputDim: this.embeddingDim,
      inputLength: this.maxSequenceLength,
      maskZero: true,
      embeddingsInitializer: 'glorotUniform'
    }).apply(input) as tf.SymbolicTensor

    // Single Bidirectional LSTM Layer (lighter than 2 layers)
    const biLSTM = tf.layers.bidirectional({
      layer: tf.layers.lstm({
        units: this.lstmUnits,
        returnSequences: false,
        dropout: this.dropout,
        recurrentDropout: this.dropout,
        kernelInitializer: 'glorotUniform'
      })
    }).apply(embedding) as tf.SymbolicTensor

    // Dropout for regularization
    const dropoutLayer = tf.layers.dropout({ rate: this.dropout }).apply(biLSTM) as tf.SymbolicTensor

    // Dense layer with ReLU activation
    const dense1 = tf.layers.dense({
      units: 32,
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
    }).apply(dropoutLayer) as tf.SymbolicTensor

    // Output layer with sigmoid activation for binary classification
    const output = tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }).apply(dense1) as tf.SymbolicTensor

    this.model = tf.model({ inputs: input, outputs: output })

    // Compile the model
    this.model.compile({
      optimizer: tf.train.adam(config?.learningRate || 0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    console.log('📊 SMS Bi-LSTM Model Architecture:')
    this.model.summary()

    this.isInitialized = true
    return this.model
  }

  /**
   * Train the model on SMS dataset
   */
  async train(
    smsTexts: string[],
    labels: number[],
    config?: Partial<SMSTrainingConfig>,
    validationSplit: number = 0.2,
    onEpochEnd?: (epoch: number, logs: any) => void
  ): Promise<{accuracy: number, loss: number}> {
    console.log('🏋️ Training SMS Bi-LSTM Model...')
    console.log(`📊 Training samples: ${smsTexts.length}`)

    // Build vocabulary from training data
    this.buildVocabulary(smsTexts)

    // Build model
    await this.build(config)

    // Convert texts to sequences
    const sequences = smsTexts.map(text => this.textToSequence(text))
    const paddedSequences = this.padSequences(sequences, this.maxSequenceLength)

    // Convert to tensors
    const xs = tf.tensor2d(paddedSequences, [paddedSequences.length, this.maxSequenceLength], 'int32')
    const ys = tf.tensor2d(labels, [labels.length, 1])

    try {
      // Train the model
      const history = await this.model!.fit(xs, ys, {
        epochs: config?.epochs || 15,
        batchSize: config?.batchSize || 16,
        validationSplit: validationSplit,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            console.log(
              `Epoch ${epoch + 1} - ` +
              `loss: ${logs?.loss.toFixed(4)} - ` +
              `acc: ${logs?.acc.toFixed(4)} - ` +
              `val_loss: ${logs?.val_loss?.toFixed(4)} - ` +
              `val_acc: ${logs?.val_acc?.toFixed(4)}`
            )
            if (onEpochEnd) {
              onEpochEnd(epoch, logs)
            }
          }
        }
      })

      const finalEpoch = history.history.acc.length - 1
      const metrics = {
        accuracy: history.history.acc[finalEpoch] as number,
        loss: history.history.loss[finalEpoch] as number
      }

      console.log('✅ Training completed')
      console.log('📈 Final Metrics:', metrics)

      return metrics
    } finally {
      xs.dispose()
      ys.dispose()
    }
  }

  /**
   * Get the compiled model
   */
  getModel(): tf.LayersModel {
    if (!this.model) {
      throw new Error('Model not built. Call build() first.')
    }
    return this.model
  }

  /**
   * Predict phishing probability for a single SMS
   */
  async predictSMS(smsText: string): Promise<SMSPrediction> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.')
    }

    // Convert to sequence
    const sequence = this.textToSequence(smsText)
    const padded = this.padSequences([sequence], this.maxSequenceLength)[0]
    const tensor = tf.tensor2d([padded], [1, this.maxSequenceLength], 'int32')

    try {
      const prediction = this.model.predict(tensor) as tf.Tensor
      const probability = await prediction.data()
      const phishingProb = probability[0]

      prediction.dispose()

      // Analyze suspicious tokens
      const suspiciousTokens = this.findSuspiciousTokens(smsText)
      const riskScore = this.calculateRiskScore(smsText, phishingProb)

      return {
        isPhishing: phishingProb > 0.5,
        confidence: Math.abs(phishingProb - 0.5) * 2,
        probability: phishingProb,
        features: {
          suspiciousTokens,
          riskScore
        }
      }
    } finally {
      tensor.dispose()
    }
  }

  /**
   * Batch predict for multiple SMS messages
   */
  async predictBatch(smsMessages: string[]): Promise<SMSPrediction[]> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Model not trained. Call train() first.')
    }

    const sequences = smsMessages.map(text => this.textToSequence(text))
    const padded = this.padSequences(sequences, this.maxSequenceLength)
    const tensor = tf.tensor2d(padded, [smsMessages.length, this.maxSequenceLength], 'int32')

    try {
      const predictions = this.model.predict(tensor) as tf.Tensor
      const probabilities = await predictions.data()

      predictions.dispose()

      return smsMessages.map((text, idx) => {
        const probability = probabilities[idx]
        const suspiciousTokens = this.findSuspiciousTokens(text)
        const riskScore = this.calculateRiskScore(text, probability)

        return {
          isPhishing: probability > 0.5,
          confidence: Math.abs(probability - 0.5) * 2,
          probability: probability,
          features: {
            suspiciousTokens,
            riskScore
          }
        }
      })
    } finally {
      tensor.dispose()
    }
  }

  /**
   * Find suspicious tokens in SMS
   */
  private findSuspiciousTokens(text: string): string[] {
    const suspiciousKeywords = [
      'urgent', 'winner', 'prize', 'click', 'free', 'congratulations',
      'claim', 'verify', 'account', 'suspended', 'link', 'password',
      'bank', 'credit', 'card', 'limited', 'expire', 'act', 'now'
    ]

    const tokens = this.tokenize(text)
    const found: string[] = []

    for (const token of tokens) {
      for (const keyword of suspiciousKeywords) {
        if (token.includes(keyword) || keyword.includes(token)) {
          found.push(token)
        }
      }
    }

    return [...new Set(found)]
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(text: string, mlProbability: number): number {
    let score = mlProbability * 100

    // Adjust based on text length
    if (text.length < 20) {
      score += 5
    }

    // Adjust based on suspicious tokens
    const suspiciousTokens = this.findSuspiciousTokens(text)
    score += suspiciousTokens.length * 4

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Get model summary
   */
  getSummary(): void {
    if (!this.model) {
      throw new Error('Model not built. Call build() first.')
    }
    this.model.summary()
  }

  /**
   * Dispose of model resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose()
      this.model = null
    }
  }

  /**
   * Get model configuration
   */
  getConfig(): SMSTrainingConfig {
    return {
      vocabSize: this.vocabularySize,
      embeddingDim: this.embeddingDim,
      lstmUnits: this.lstmUnits,
      maxLength: this.maxSequenceLength,
      batchSize: 16,
      epochs: 15,
      learningRate: 0.001
    }
  }

  /**
   * Check if model is trained and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.tokenizer.size
  }
}

export default BiLSTMSMSModel

// Singleton instance
let smsModel: BiLSTMSMSModel | null = null

/**
 * Get or create SMS model instance
 */
export function getSMSModel(): BiLSTMSMSModel {
  if (!smsModel) {
    smsModel = new BiLSTMSMSModel()
  }
  return smsModel
}
