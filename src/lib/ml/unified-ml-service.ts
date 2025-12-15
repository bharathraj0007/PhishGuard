/**
 * Unified ML Service for PhishGuard
 * 
 * Integrates all machine learning models:
 * - Email: TF-IDF + Dense NN
 * - SMS: Tokenization + Bi-LSTM
 * - URL: Character-level CNN
 * - QR: QR Decoder + URL Model
 * 
 * Provides simple interface for predictions and training
 */

import { TFIDFEmailModel, getEmailModel, type EmailPrediction } from './tfidf-email-model';
import { BiLSTMSMSModel, getSMSModel, type SMSPrediction } from './bilstm-sms-model';
import { LightweightURLCNN, getURLCNNModel, type URLPrediction } from './lightweight-url-cnn';
import { getQRPhishingService } from './qr-phishing-service';
import type { ScanType } from '../../types';

export interface MLPredictionResult {
  isPhishing: boolean;
  confidence: number;
  threatLevel: 'safe' | 'suspicious' | 'dangerous';
  indicators: string[];
  analysis: string;
  recommendations: string[];
  riskScore: number;
}

export interface MLTrainingProgress {
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
  valLoss?: number;
  valAccuracy?: number;
}

export interface MLTrainingResult {
  success: boolean;
  metrics: {
    accuracy: number;
    loss: number;
    valAccuracy?: number;
    valLoss?: number;
  };
  message: string;
}

/**
 * Unified ML Service Class
 */
export class UnifiedMLService {
  private emailModel: TFIDFEmailModel;
  private smsModel: BiLSTMSMSModel;
  private urlModel: LightweightURLCNN;
  private qrService: ReturnType<typeof getQRPhishingService>;

  constructor() {
    this.emailModel = getEmailModel();
    this.smsModel = getSMSModel();
    this.urlModel = getURLCNNModel();
    this.qrService = getQRPhishingService();
  }

  /**
   * Predict phishing for any scan type
   */
  async predict(content: string, scanType: ScanType): Promise<MLPredictionResult> {
    try {
      switch (scanType) {
        case 'email':
          return await this.predictEmail(content);
        case 'sms':
          return await this.predictSMS(content);
        case 'link':
          return await this.predictURL(content);
        case 'qr':
          return await this.predictQR(content);
        default:
          throw new Error(`Unknown scan type: ${scanType}`);
      }
    } catch (error) {
      console.error(`Prediction error for ${scanType}:`, error);
      throw error;
    }
  }

  /**
   * Predict email phishing
   */
  private async predictEmail(email: string): Promise<MLPredictionResult> {
    if (!this.emailModel.isReady()) {
      throw new Error('Email model not trained. Please train the model first.');
    }

    const prediction: EmailPrediction = await this.emailModel.predict(email);

    return this.formatEmailResult(prediction);
  }

  /**
   * Predict SMS phishing
   */
  private async predictSMS(sms: string): Promise<MLPredictionResult> {
    if (!this.smsModel.isReady()) {
      throw new Error('SMS model not trained. Please train the model first.');
    }

    const prediction: SMSPrediction = await this.smsModel.predictSMS(sms);

    return this.formatSMSResult(prediction);
  }

  /**
   * Predict URL phishing
   */
  private async predictURL(url: string): Promise<MLPredictionResult> {
    if (!this.urlModel.isReady()) {
      throw new Error('URL model not trained. Please train the model first.');
    }

    const prediction: URLPrediction = await this.urlModel.predict(url);

    return this.formatURLResult(prediction, url);
  }

  /**
   * Predict QR code phishing
   */
  private async predictQR(qrContent: string): Promise<MLPredictionResult> {
    // QR service uses URL model internally
    if (!this.urlModel.isReady()) {
      throw new Error('URL model not trained. Please train the model first (QR uses URL model).');
    }

    // Assume qrContent is the decoded URL from QR code
    return await this.predictURL(qrContent);
  }

  /**
   * Format email prediction result
   */
  private formatEmailResult(prediction: EmailPrediction): MLPredictionResult {
    const threatLevel = this.calculateThreatLevel(prediction.probability);
    
    return {
      isPhishing: prediction.isPhishing,
      confidence: Math.round(prediction.confidence * 100),
      threatLevel,
      indicators: prediction.features.suspiciousWords.map(w => `Suspicious word: ${w}`),
      analysis: this.generateEmailAnalysis(prediction),
      recommendations: this.generateEmailRecommendations(prediction.isPhishing),
      riskScore: prediction.features.riskScore
    };
  }

  /**
   * Format SMS prediction result
   */
  private formatSMSResult(prediction: SMSPrediction): MLPredictionResult {
    const threatLevel = this.calculateThreatLevel(prediction.probability);
    
    return {
      isPhishing: prediction.isPhishing,
      confidence: Math.round(prediction.confidence * 100),
      threatLevel,
      indicators: prediction.features.suspiciousTokens.map(t => `Suspicious token: ${t}`),
      analysis: this.generateSMSAnalysis(prediction),
      recommendations: this.generateSMSRecommendations(prediction.isPhishing),
      riskScore: prediction.features.riskScore
    };
  }

  /**
   * Format URL prediction result
   */
  private formatURLResult(prediction: URLPrediction, url: string): MLPredictionResult {
    const threatLevel = this.calculateThreatLevel(prediction.probability);
    
    return {
      isPhishing: prediction.isPhishing,
      confidence: Math.round(prediction.confidence * 100),
      threatLevel,
      indicators: prediction.features.suspiciousPatterns.map(p => p.replace(/_/g, ' ')),
      analysis: this.generateURLAnalysis(prediction, url),
      recommendations: this.generateURLRecommendations(prediction.isPhishing),
      riskScore: prediction.features.riskScore
    };
  }

  /**
   * Calculate threat level from probability
   */
  private calculateThreatLevel(probability: number): 'safe' | 'suspicious' | 'dangerous' {
    if (probability < 0.3) return 'safe';
    if (probability < 0.7) return 'suspicious';
    return 'dangerous';
  }

  /**
   * Generate email analysis
   */
  private generateEmailAnalysis(prediction: EmailPrediction): string {
    if (!prediction.isPhishing) {
      return 'This email appears to be legitimate based on content analysis. No significant phishing indicators detected.';
    }

    if (prediction.probability > 0.8) {
      return `HIGH RISK: This email shows strong phishing characteristics (${Math.round(prediction.probability * 100)}% confidence). ` +
             `Detected suspicious patterns: ${prediction.features.suspiciousWords.join(', ')}. Do not click links or provide information.`;
    }

    return `SUSPICIOUS: This email shows some concerning patterns (${Math.round(prediction.probability * 100)}% confidence). ` +
           `Exercise caution. Detected: ${prediction.features.suspiciousWords.join(', ')}.`;
  }

  /**
   * Generate SMS analysis
   */
  private generateSMSAnalysis(prediction: SMSPrediction): string {
    if (!prediction.isPhishing) {
      return 'This SMS appears to be legitimate. No significant phishing indicators detected.';
    }

    if (prediction.probability > 0.8) {
      return `HIGH RISK: This SMS shows strong phishing characteristics (${Math.round(prediction.probability * 100)}% confidence). ` +
             `Contains suspicious elements: ${prediction.features.suspiciousTokens.join(', ')}. Do not click links.`;
    }

    return `SUSPICIOUS: This SMS contains some concerning patterns (${Math.round(prediction.probability * 100)}% confidence). ` +
           `Verify sender before taking action. Found: ${prediction.features.suspiciousTokens.join(', ')}.`;
  }

  /**
   * Generate URL analysis
   */
  private generateURLAnalysis(prediction: URLPrediction, url: string): string {
    if (!prediction.isPhishing) {
      return `This URL appears to be safe (${Math.round((1 - prediction.probability) * 100)}% confidence). No major security concerns detected.`;
    }

    if (prediction.probability > 0.8) {
      return `DANGER: This URL is highly likely to be malicious (${Math.round(prediction.probability * 100)}% confidence). ` +
             `Detected indicators: ${prediction.features.suspiciousPatterns.map(p => p.replace(/_/g, ' ')).join(', ')}. Do NOT visit this link.`;
    }

    return `WARNING: This URL shows suspicious characteristics (${Math.round(prediction.probability * 100)}% confidence). ` +
           `Issues found: ${prediction.features.suspiciousPatterns.map(p => p.replace(/_/g, ' ')).join(', ')}. Proceed with extreme caution.`;
  }

  /**
   * Generate email recommendations
   */
  private generateEmailRecommendations(isPhishing: boolean): string[] {
    if (!isPhishing) {
      return [
        'Email appears safe, but always verify sender',
        'Check for spelling errors and unusual requests',
        'Hover over links before clicking'
      ];
    }

    return [
      'Do not click any links in this email',
      'Do not reply or provide any information',
      'Do not download attachments',
      'Report this email as phishing',
      'Delete the email immediately',
      'If you clicked a link, change your passwords'
    ];
  }

  /**
   * Generate SMS recommendations
   */
  private generateSMSRecommendations(isPhishing: boolean): string[] {
    if (!isPhishing) {
      return [
        'SMS appears safe, but verify sender',
        'Be cautious with unsolicited messages',
        'Verify links before clicking'
      ];
    }

    return [
      'Do not click any links in this SMS',
      'Do not reply to this message',
      'Block the sender number',
      'Report as spam to your carrier',
      'Delete the message',
      'Contact the supposed sender through official channels to verify'
    ];
  }

  /**
   * Generate URL recommendations
   */
  private generateURLRecommendations(isPhishing: boolean): string[] {
    if (!isPhishing) {
      return [
        'URL appears safe to visit',
        'Still verify it matches the expected site',
        'Check for HTTPS encryption'
      ];
    }

    return [
      'Do NOT visit this URL',
      'Do not enter any personal information',
      'Report this URL to authorities',
      'Warn others if you received this link',
      'Run antivirus if you visited the link',
      'Monitor accounts for suspicious activity'
    ];
  }

  /**
   * Train email model
   */
  async trainEmail(
    emails: string[],
    labels: number[],
    onProgress?: (progress: MLTrainingProgress) => void
  ): Promise<MLTrainingResult> {
    try {
      console.log('🏋️ Starting email model training...');

      const metrics = await this.emailModel.train(
        emails,
        labels,
        0.2,
        (epoch, logs) => {
          if (onProgress) {
            onProgress({
              epoch: epoch + 1,
              totalEpochs: this.emailModel.getConfig().epochs,
              loss: logs.loss,
              accuracy: logs.acc,
              valLoss: logs.val_loss,
              valAccuracy: logs.val_acc
            });
          }
        }
      );

      return {
        success: true,
        metrics,
        message: `Email model trained successfully with ${Math.round(metrics.accuracy * 100)}% accuracy`
      };
    } catch (error) {
      console.error('Email training error:', error);
      return {
        success: false,
        metrics: { accuracy: 0, loss: 0 },
        message: `Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Train SMS model
   */
  async trainSMS(
    smsMessages: string[],
    labels: number[],
    onProgress?: (progress: MLTrainingProgress) => void
  ): Promise<MLTrainingResult> {
    try {
      console.log('🏋️ Starting SMS model training...');

      const metrics = await this.smsModel.train(
        smsMessages,
        labels,
        undefined,
        0.2,
        (epoch, logs) => {
          if (onProgress) {
            onProgress({
              epoch: epoch + 1,
              totalEpochs: 15,
              loss: logs.loss,
              accuracy: logs.acc,
              valLoss: logs.val_loss,
              valAccuracy: logs.val_acc
            });
          }
        }
      );

      return {
        success: true,
        metrics,
        message: `SMS model trained successfully with ${Math.round(metrics.accuracy * 100)}% accuracy`
      };
    } catch (error) {
      console.error('SMS training error:', error);
      return {
        success: false,
        metrics: { accuracy: 0, loss: 0 },
        message: `Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Train URL model
   */
  async trainURL(
    urls: string[],
    labels: number[],
    onProgress?: (progress: MLTrainingProgress) => void
  ): Promise<MLTrainingResult> {
    try {
      console.log('🏋️ Starting URL model training...');

      const metrics = await this.urlModel.train(
        urls,
        labels,
        0.2,
        (epoch, logs) => {
          if (onProgress) {
            onProgress({
              epoch: epoch + 1,
              totalEpochs: this.urlModel.getConfig().epochs,
              loss: logs.loss,
              accuracy: logs.acc,
              valLoss: logs.val_loss,
              valAccuracy: logs.val_acc
            });
          }
        }
      );

      return {
        success: true,
        metrics,
        message: `URL model trained successfully with ${Math.round(metrics.accuracy * 100)}% accuracy`
      };
    } catch (error) {
      console.error('URL training error:', error);
      return {
        success: false,
        metrics: { accuracy: 0, loss: 0 },
        message: `Training failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check model status
   */
  getModelStatus() {
    return {
      email: {
        ready: this.emailModel.isReady(),
        vocabularySize: this.emailModel.getVocabularySize()
      },
      sms: {
        ready: this.smsModel.isReady(),
        vocabularySize: this.smsModel.getVocabularySize()
      },
      url: {
        ready: this.urlModel.isReady(),
        charsetSize: this.urlModel.getCharsetSize()
      }
    };
  }

  /**
   * Dispose all models
   */
  dispose() {
    this.emailModel.dispose();
    this.smsModel.dispose();
    this.urlModel.dispose();
    console.log('🧹 All ML models disposed');
  }
}

// Singleton instance
let mlService: UnifiedMLService | null = null;

/**
 * Get or create unified ML service instance
 */
export function getMLService(): UnifiedMLService {
  if (!mlService) {
    mlService = new UnifiedMLService();
  }
  return mlService;
}
