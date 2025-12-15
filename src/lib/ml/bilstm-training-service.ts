import * as tf from '@tensorflow/tfjs'
import BiLSTMSMSModel from './bilstm-sms-model'
import { SMSDataProcessor, type SMSRecord, type DatasetStatistics } from './sms-data-processor'

/**
 * Training metrics for Bi-LSTM model
 */
export interface TrainingMetrics {
  epoch: number
  loss: number
  accuracy: number
  precision?: number
  recall?: number
  valLoss?: number
  valAccuracy?: number
  valPrecision?: number
  valRecall?: number
}

/**
 * Training configuration
 */
export interface TrainingConfig {
  epochs: number
  batchSize: number
  validationSplit: number
  learningRate?: number
  earlyStopping?: boolean
  earlyStoppingPatience?: number
}

/**
 * Training progress callback
 */
export type TrainingProgressCallback = (metrics: TrainingMetrics) => void

/**
 * Bi-LSTM Training Service
 * Handles model training with SMS dataset
 */
export class BiLSTMTrainingService {
  private model: BiLSTMSMSModel
  private trainingHistory: TrainingMetrics[] = []
  private isTraining: boolean = false

  constructor(model?: BiLSTMSMSModel) {
    this.model = model || new BiLSTMSMSModel()
  }

  /**
   * Train the Bi-LSTM model with SMS data
   */
  async train(
    smsRecords: SMSRecord[],
    config: Partial<TrainingConfig> = {},
    onProgress?: TrainingProgressCallback
  ): Promise<{ metrics: TrainingMetrics[]; summary: any }> {
    // Set default config
    const finalConfig: TrainingConfig = {
      epochs: config.epochs || 10,
      batchSize: config.batchSize || 32,
      validationSplit: config.validationSplit || 0.2,
      learningRate: config.learningRate || 0.001,
      earlyStopping: config.earlyStopping !== false,
      earlyStoppingPatience: config.earlyStoppingPatience || 3
    }

    if (this.isTraining) {
      throw new Error('Training already in progress')
    }

    this.isTraining = true
    this.trainingHistory = []

    try {
      // Build model if not already built
      const modelInstance = this.model.getModel()

      // Prepare data
      const { inputs, labels } = this.prepareData(smsRecords)

      // Create validation split if specified
      const splitIndex = Math.floor(smsRecords.length * (1 - finalConfig.validationSplit))
      const trainInputs = inputs.slice(0, splitIndex)
      const trainLabels = labels.slice(0, splitIndex)
      const valInputs = inputs.slice(splitIndex)
      const valLabels = labels.slice(splitIndex)

      // Convert to tensors
      const trainTensor = tf.tensor2d(trainInputs, [trainInputs.length, 256], 'int32')
      const trainLabelTensor = tf.tensor2d(trainLabels, [trainLabels.length, 1], 'float32')
      const valTensor = tf.tensor2d(valInputs, [valInputs.length, 256], 'int32')
      const valLabelTensor = tf.tensor2d(valLabels, [valLabels.length, 1], 'float32')

      try {
        // Train model
        const history = await modelInstance.fit(trainTensor, trainLabelTensor, {
          epochs: finalConfig.epochs,
          batchSize: finalConfig.batchSize,
          validationData: [valTensor, valLabelTensor],
          verbose: 1,
          callbacks: {
            onEpochEnd: async (epoch, logs) => {
              if (logs && onProgress) {
                const metrics: TrainingMetrics = {
                  epoch: epoch + 1,
                  loss: logs.loss as number,
                  accuracy: logs.acc as number,
                  valLoss: logs.val_loss as number,
                  valAccuracy: logs.val_acc as number
                }

                this.trainingHistory.push(metrics)
                onProgress(metrics)
              }
            }
          }
        })

        // Calculate final evaluation metrics
        const valPredictions = modelInstance.predict(valTensor) as tf.Tensor
        const predictions = await valPredictions.data()
        const trueLabels = await valLabelTensor.data()

        const { precision, recall, f1 } = this.calculateMetrics(predictions, trueLabels)

        // Cleanup tensors
        trainTensor.dispose()
        trainLabelTensor.dispose()
        valTensor.dispose()
        valLabelTensor.dispose()
        valPredictions.dispose()

        // Return training summary
        const summary = {
          epoch: finalConfig.epochs,
          finalLoss: this.trainingHistory[this.trainingHistory.length - 1]?.loss || 0,
          finalAccuracy: this.trainingHistory[this.trainingHistory.length - 1]?.accuracy || 0,
          finalValLoss: this.trainingHistory[this.trainingHistory.length - 1]?.valLoss || 0,
          finalValAccuracy: this.trainingHistory[this.trainingHistory.length - 1]?.valAccuracy || 0,
          precision,
          recall,
          f1Score: f1,
          totalRecords: smsRecords.length,
          trainRecords: trainInputs.length,
          valRecords: valInputs.length
        }

        return { metrics: this.trainingHistory, summary }
      } finally {
        trainTensor.dispose()
        trainLabelTensor.dispose()
        valTensor.dispose()
        valLabelTensor.dispose()
      }
    } finally {
      this.isTraining = false
    }
  }

  /**
   * Evaluate model on test data
   */
  async evaluate(smsRecords: SMSRecord[]): Promise<{
    accuracy: number
    precision: number
    recall: number
    f1Score: number
    loss: number
  }> {
    const modelInstance = this.model.getModel()
    const { inputs, labels } = this.prepareData(smsRecords)

    const testTensor = tf.tensor2d(inputs, [inputs.length, 256], 'int32')
    const labelTensor = tf.tensor2d(labels, [labels.length, 1], 'float32')

    try {
      // Get model evaluation
      const evaluation = modelInstance.evaluate(testTensor, labelTensor) as tf.Tensor[]
      const [loss, accuracy] = evaluation

      const lossValue = await loss.data()
      const accuracyValue = await accuracy.data()

      // Get predictions for detailed metrics
      const predictions = modelInstance.predict(testTensor) as tf.Tensor
      const predictionData = await predictions.data()
      const labelData = await labelTensor.data()

      const { precision, recall, f1 } = this.calculateMetrics(predictionData, labelData)

      // Cleanup
      loss.dispose()
      accuracy.dispose()
      predictions.dispose()
      testTensor.dispose()
      labelTensor.dispose()

      return {
        accuracy: accuracyValue[0],
        precision,
        recall,
        f1Score: f1,
        loss: lossValue[0]
      }
    } finally {
      testTensor.dispose()
      labelTensor.dispose()
    }
  }

  /**
   * Calculate precision, recall, and F1 score
   */
  private calculateMetrics(predictions: Float32Array | Uint8Array, labels: Float32Array | Uint8Array) {
    let truePositives = 0
    let falsePositives = 0
    let falseNegatives = 0
    let trueNegatives = 0

    for (let i = 0; i < predictions.length; i++) {
      const pred = predictions[i] > 0.5 ? 1 : 0
      const label = labels[i]

      if (pred === 1 && label === 1) truePositives++
      else if (pred === 1 && label === 0) falsePositives++
      else if (pred === 0 && label === 1) falseNegatives++
      else if (pred === 0 && label === 0) trueNegatives++
    }

    const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0

    const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0

    const f1 = precision + recall > 0 ? 2 * ((precision * recall) / (precision + recall)) : 0

    return { precision, recall, f1 }
  }

  /**
   * Prepare data for training
   */
  private prepareData(
    smsRecords: SMSRecord[]
  ): {
    inputs: number[][]
    labels: number[][]
  } {
    const inputs: number[][] = []
    const labels: number[][] = []

    for (const record of smsRecords) {
      // Encode text to character indices
      const encoded = this.encodeText(record.text)
      // Pad to fixed length
      const padded = this.padSequence(encoded, 256)
      inputs.push(padded)
      // Label: 1 for phishing, 0 for legitimate
      labels.push([record.isPhishing ? 1 : 0])
    }

    return { inputs, labels }
  }

  /**
   * Encode SMS text to character indices
   */
  private encodeText(text: string): number[] {
    const normalized = text.toLowerCase().substring(0, 256)
    return Array.from(normalized).map((char) => {
      const code = char.charCodeAt(0)
      return Math.min(code, 255)
    })
  }

  /**
   * Pad or truncate sequences to fixed length
   */
  private padSequence(sequence: number[], length: number): number[] {
    if (sequence.length >= length) {
      return sequence.slice(0, length)
    }
    return [...sequence, ...Array(length - sequence.length).fill(0)]
  }

  /**
   * Get training history
   */
  getHistory(): TrainingMetrics[] {
    return this.trainingHistory
  }

  /**
   * Check if training is in progress
   */
  isTrainingInProgress(): boolean {
    return this.isTraining
  }

  /**
   * Get model instance
   */
  getModel(): BiLSTMSMSModel {
    return this.model
  }

  /**
   * Reset training history
   */
  resetHistory(): void {
    this.trainingHistory = []
  }
}

export default BiLSTMTrainingService
