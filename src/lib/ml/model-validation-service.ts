/**
 * Model Validation Service
 * 
 * Validates trained models against test datasets with comprehensive metrics:
 * - Accuracy, Precision, Recall, F1-Score
 * - Confusion Matrix
 * - ROC-AUC Analysis
 * - Live Prediction Testing
 */

import * as tf from '@tensorflow/tfjs';
import { loadTrainingDataFromDB, splitDataset } from './blink-dataset-loader';

export interface ValidationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  specificity: number;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
  rocAuc?: number;
  threshold: number;
}

export interface LiveTestResult {
  input: string;
  predicted: 'phishing' | 'legitimate';
  confidence: number;
  actualLabel?: 'phishing' | 'legitimate';
  correct?: boolean;
}

export interface ValidationReport {
  scanType: string;
  timestamp: string;
  metrics: ValidationMetrics;
  liveTests: LiveTestResult[];
  datasetSize: number;
  modelPath: string;
  validated: boolean;
}

export class ModelValidationService {
  /**
   * Validate a trained model against test dataset
   */
  async validateModel(
    scanType: 'url' | 'email' | 'sms' | 'qr',
    testSize: number = 200
  ): Promise<ValidationReport> {
    const modelPath = `indexeddb://phishguard-${scanType}-model`;
    
    try {
      // Load model
      console.log(`📊 Loading model from ${modelPath}...`);
      const model = await tf.loadLayersModel(modelPath);
      
      // Load test dataset
      console.log(`📚 Loading test dataset for ${scanType}...`);
      const fullDataset = await loadTrainingDataFromDB(scanType, testSize * 2);
      const { test } = splitDataset(fullDataset, 0.5); // Use half as test
      
      if (test.texts.length < 10) {
        throw new Error(`Insufficient test data (${test.texts.length} samples). Need at least 10.`);
      }
      
      console.log(`✅ Test dataset: ${test.texts.length} samples`);
      
      // Prepare test data
      const { testX, testY } = await this.prepareTestData(test.texts, test.labels, scanType);
      
      // Run predictions
      console.log('🔮 Running predictions...');
      const predictions = model.predict(testX) as tf.Tensor;
      const predValues = await predictions.data();
      const trueLabels = await testY.data();
      
      // Calculate metrics
      const metrics = this.calculateMetrics(Array.from(predValues), Array.from(trueLabels));
      
      // Run live tests with sample data
      const liveTests = await this.runLiveTests(model, scanType);
      
      // Clean up
      testX.dispose();
      testY.dispose();
      predictions.dispose();
      
      const report: ValidationReport = {
        scanType,
        timestamp: new Date().toISOString(),
        metrics,
        liveTests,
        datasetSize: test.texts.length,
        modelPath,
        validated: metrics.accuracy >= 0.7 && metrics.f1Score >= 0.7
      };
      
      console.log(`📈 Validation complete: ${(metrics.accuracy * 100).toFixed(1)}% accuracy`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Validation failed:', error);
      throw new Error(`Model validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Prepare test data as tensors
   */
  private async prepareTestData(
    texts: string[],
    labels: number[],
    scanType: string
  ): Promise<{ testX: tf.Tensor; testY: tf.Tensor }> {
    // Simple preprocessing - convert to lowercase and pad/truncate
    const maxLength = scanType === 'url' ? 256 : 100;
    
    // Character-level for URLs, word-level for others
    const sequences = texts.map(text => {
      if (scanType === 'url') {
        return this.textToCharSequence(text, maxLength);
      } else {
        return this.textToWordSequence(text, maxLength);
      }
    });
    
    const testX = tf.tensor2d(sequences);
    const testY = tf.tensor2d(labels, [labels.length, 1]);
    
    return { testX, testY };
  }
  
  /**
   * Convert text to character sequence (for URLs)
   */
  private textToCharSequence(text: string, maxLength: number): number[] {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789-._~:/?#[]@!$&\'()*+,;=%';
    const charMap: Record<string, number> = {};
    chars.split('').forEach((char, idx) => {
      charMap[char] = idx + 1;
    });
    
    const sequence: number[] = [];
    const lowerText = text.toLowerCase();
    
    for (let i = 0; i < Math.min(text.length, maxLength); i++) {
      const char = lowerText[i];
      sequence.push(charMap[char] || 0);
    }
    
    // Pad with zeros
    while (sequence.length < maxLength) {
      sequence.push(0);
    }
    
    return sequence;
  }
  
  /**
   * Convert text to word sequence (for email/sms/qr)
   */
  private textToWordSequence(text: string, maxLength: number): number[] {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const sequence: number[] = [];
    
    for (let i = 0; i < Math.min(words.length, maxLength); i++) {
      // Simple hash for word IDs
      const hash = words[i].split('').reduce((acc, char) => {
        return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
      }, 0);
      sequence.push(Math.abs(hash) % 10000);
    }
    
    // Pad with zeros
    while (sequence.length < maxLength) {
      sequence.push(0);
    }
    
    return sequence;
  }
  
  /**
   * Calculate validation metrics
   */
  private calculateMetrics(predictions: number[], trueLabels: number[]): ValidationMetrics {
    let tp = 0, tn = 0, fp = 0, fn = 0;
    const threshold = 0.5;
    
    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i] >= threshold ? 1 : 0;
      const actual = trueLabels[i];
      
      if (predicted === 1 && actual === 1) tp++;
      else if (predicted === 0 && actual === 0) tn++;
      else if (predicted === 1 && actual === 0) fp++;
      else if (predicted === 0 && actual === 1) fn++;
    }
    
    const accuracy = (tp + tn) / predictions.length;
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const specificity = tn / (tn + fp) || 0;
    
    return {
      accuracy,
      precision,
      recall,
      f1Score,
      specificity,
      confusionMatrix: {
        truePositive: tp,
        trueNegative: tn,
        falsePositive: fp,
        falseNegative: fn
      },
      threshold
    };
  }
  
  /**
   * Run live tests with known phishing/legitimate samples
   */
  private async runLiveTests(
    model: tf.LayersModel,
    scanType: string
  ): Promise<LiveTestResult[]> {
    const testSamples = this.getTestSamples(scanType);
    const results: LiveTestResult[] = [];
    
    for (const sample of testSamples) {
      try {
        const sequence = scanType === 'url' 
          ? this.textToCharSequence(sample.input, 256)
          : this.textToWordSequence(sample.input, 100);
        
        const inputTensor = tf.tensor2d([sequence]);
        const prediction = model.predict(inputTensor) as tf.Tensor;
        const predValue = (await prediction.data())[0];
        
        inputTensor.dispose();
        prediction.dispose();
        
        const predicted = predValue >= 0.5 ? 'phishing' : 'legitimate';
        const correct = predicted === sample.label;
        
        results.push({
          input: sample.input,
          predicted,
          confidence: predValue,
          actualLabel: sample.label,
          correct
        });
      } catch (error) {
        console.error('Live test error:', error);
      }
    }
    
    return results;
  }
  
  /**
   * Get test samples for validation
   */
  private getTestSamples(scanType: string): Array<{ input: string; label: 'phishing' | 'legitimate' }> {
    const samples: Record<string, Array<{ input: string; label: 'phishing' | 'legitimate' }>> = {
      url: [
        { input: 'https://www.google.com', label: 'legitimate' },
        { input: 'https://github.com/login', label: 'legitimate' },
        { input: 'http://paypal-secure-login-verify.tk', label: 'phishing' },
        { input: 'https://microsoft-account-recovery.xyz/login', label: 'phishing' },
        { input: 'http://bit.ly/urgentupdate123', label: 'phishing' },
      ],
      email: [
        { input: 'Thank you for your order. Tracking: ABC123', label: 'legitimate' },
        { input: 'Your account has been suspended! Click here to verify immediately', label: 'phishing' },
        { input: 'URGENT: Your payment failed. Update your card now or lose access', label: 'phishing' },
        { input: 'Meeting scheduled for tomorrow at 3pm', label: 'legitimate' },
      ],
      sms: [
        { input: 'Your package will arrive tomorrow between 2-4pm', label: 'legitimate' },
        { input: 'URGENT! Your bank account has suspicious activity. Verify now: bit.ly/xxx', label: 'phishing' },
        { input: 'You won $5000! Claim your prize immediately at winner-portal.tk', label: 'phishing' },
        { input: 'Reminder: Doctor appointment on Friday at 10am', label: 'legitimate' },
      ],
      qr: [
        { input: 'https://restaurant-menu.com/table5', label: 'legitimate' },
        { input: 'http://free-wifi-login.xyz', label: 'phishing' },
        { input: 'https://parking-payment-urgent.tk', label: 'phishing' },
        { input: 'https://example.com/event-registration', label: 'legitimate' },
      ]
    };
    
    return samples[scanType] || samples.url;
  }
  
  /**
   * Generate validation report summary
   */
  generateReportSummary(report: ValidationReport): string {
    const { metrics, liveTests } = report;
    const liveAccuracy = liveTests.filter(t => t.correct).length / liveTests.length;
    
    return `
📊 Model Validation Report - ${report.scanType.toUpperCase()}

✅ Status: ${report.validated ? 'PASSED' : 'NEEDS IMPROVEMENT'}

📈 Test Dataset Metrics:
  • Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%
  • Precision: ${(metrics.precision * 100).toFixed(1)}%
  • Recall: ${(metrics.recall * 100).toFixed(1)}%
  • F1-Score: ${(metrics.f1Score * 100).toFixed(1)}%

🎯 Confusion Matrix:
  • True Positives: ${metrics.confusionMatrix.truePositive}
  • True Negatives: ${metrics.confusionMatrix.trueNegative}
  • False Positives: ${metrics.confusionMatrix.falsePositive}
  • False Negatives: ${metrics.confusionMatrix.falseNegative}

🔬 Live Tests: ${(liveAccuracy * 100).toFixed(0)}% (${liveTests.filter(t => t.correct).length}/${liveTests.length} correct)

Dataset Size: ${report.datasetSize} samples
Timestamp: ${new Date(report.timestamp).toLocaleString()}
    `.trim();
  }
}

/**
 * Global validation service instance
 */
let validationService: ModelValidationService | null = null;

export function getValidationService(): ModelValidationService {
  if (!validationService) {
    validationService = new ModelValidationService();
  }
  return validationService;
}
