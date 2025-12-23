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
// SMS model is DISABLED in frontend - SMS uses backend-only inference
// import { BiLSTMSMSModel, getSMSModel, type SMSPrediction } from './bilstm-sms-model';
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
 * 
 * IMPORTANT: SMS prediction is handled by backend-only inference.
 * Do NOT use this service for SMS - use the scanSMS() function from api-client.ts instead.
 */
export class UnifiedMLService {
  private emailModel: TFIDFEmailModel;
  // SMS model is DISABLED - SMS uses backend-only inference
  // private smsModel: BiLSTMSMSModel;
  private urlModel: LightweightURLCNN;
  private qrService: ReturnType<typeof getQRPhishingService>;

  constructor() {
    this.emailModel = getEmailModel();
    // SMS model is DISABLED - SMS uses backend-only inference
    // this.smsModel = getSMSModel();
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
        case 'url':
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
   * 
   * IMPORTANT: SMS prediction is handled by backend-only inference.
   * This method should NOT be called - use scanSMS() from api-client.ts instead.
   */
  private async predictSMS(_sms: string): Promise<MLPredictionResult> {
    // SMS uses BACKEND-ONLY inference - do not train or run models in browser
    throw new Error(
      'SMS prediction must use backend-only inference. ' +
      'Use scanSMS() from api-client.ts instead of UnifiedMLService.predict() for SMS.'
    );
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
    
    // Filter out undefined/null values to prevent runtime errors
    const suspiciousWords = (prediction.features.suspiciousWords || [])
      .filter((w): w is string => typeof w === 'string' && w.length > 0);
    
    return {
      isPhishing: prediction.isPhishing,
      confidence: Math.round(prediction.confidence * 100),
      threatLevel,
      indicators: suspiciousWords.map(w => `Suspicious word: ${w}`),
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
    
    // Filter out undefined/null values to prevent runtime errors
    const suspiciousTokens = (prediction.features.suspiciousTokens || [])
      .filter((t): t is string => typeof t === 'string' && t.length > 0);
    
    return {
      isPhishing: prediction.isPhishing,
      confidence: Math.round(prediction.confidence * 100),
      threatLevel,
      indicators: suspiciousTokens.map(t => `Suspicious token: ${t}`),
      analysis: this.generateSMSAnalysis(prediction),
      recommendations: this.generateSMSRecommendations(prediction.isPhishing),
      riskScore: prediction.features.riskScore
    };
  }

  /**
   * Format URL prediction result
   */
  private formatURLResult(prediction: URLPrediction, url: string): MLPredictionResult {
    const phishingProbability = prediction.probability;
    const threatLevel = this.calculateThreatLevel(phishingProbability);
    
    // Calculate confidence and risk score based on threat level and probability
    let confidence: number;
    let riskScore: number;
    
    if (threatLevel === 'safe') {
      // For safe content: high confidence in it being safe
      confidence = Math.round((1 - phishingProbability) * 100);
      riskScore = Math.round(phishingProbability * 100);
    } else {
      // For suspicious/dangerous: confidence is the phishing probability
      confidence = Math.round(phishingProbability * 100);
      riskScore = confidence;
    }
    
    // Filter out undefined/null values to prevent runtime errors
    const suspiciousPatterns = (prediction.features.suspiciousPatterns || [])
      .filter((p): p is string => typeof p === 'string' && p.length > 0);
    
    return {
      isPhishing: prediction.isPhishing,
      confidence,
      threatLevel,
      indicators: suspiciousPatterns.map(p => p.replace(/_/g, ' ')),
      analysis: this.generateURLAnalysis(prediction, url, phishingProbability),
      recommendations: this.generateURLRecommendations(prediction.isPhishing),
      riskScore
    };
  }

  /**
   * Calculate threat level from probability
   * probability = phishing probability (0 to 1)
   */
  private calculateThreatLevel(probability: number): 'safe' | 'suspicious' | 'dangerous' {
    if (probability < 0.5) return 'safe';
    if (probability < 0.75) return 'suspicious';
    return 'dangerous';
  }

  /**
   * Generate email analysis
   */
  private generateEmailAnalysis(prediction: EmailPrediction): string {
    if (!prediction.isPhishing) {
      return 'This email appears to be legitimate based on content analysis. No significant phishing indicators detected.';
    }

    // Safely filter suspicious words
    const suspiciousWords = (prediction.features.suspiciousWords || [])
      .filter((w): w is string => typeof w === 'string' && w.length > 0);
    const wordsDisplay = suspiciousWords.length > 0 ? suspiciousWords.join(', ') : 'various patterns';

    if (prediction.probability > 0.8) {
      return `HIGH RISK: This email shows strong phishing characteristics (${Math.round(prediction.probability * 100)}% confidence). ` +
             `Detected suspicious patterns: ${wordsDisplay}. Do not click links or provide information.`;
    }

    return `SUSPICIOUS: This email shows some concerning patterns (${Math.round(prediction.probability * 100)}% confidence). ` +
           `Exercise caution. Detected: ${wordsDisplay}.`;
  }

  /**
   * Generate SMS analysis
   */
  private generateSMSAnalysis(prediction: SMSPrediction): string {
    if (!prediction.isPhishing) {
      return 'This SMS appears to be legitimate. No significant phishing indicators detected.';
    }

    // Safely filter suspicious tokens
    const suspiciousTokens = (prediction.features.suspiciousTokens || [])
      .filter((t): t is string => typeof t === 'string' && t.length > 0);
    const tokensDisplay = suspiciousTokens.length > 0 ? suspiciousTokens.join(', ') : 'suspicious patterns';

    if (prediction.probability > 0.8) {
      return `HIGH RISK: This SMS shows strong phishing characteristics (${Math.round(prediction.probability * 100)}% confidence). ` +
             `Contains suspicious elements: ${tokensDisplay}. Do not click links.`;
    }

    return `SUSPICIOUS: This SMS contains some concerning patterns (${Math.round(prediction.probability * 100)}% confidence). ` +
           `Verify sender before taking action. Found: ${tokensDisplay}.`;
  }

  /**
   * Generate URL analysis
   */
  private generateURLAnalysis(prediction: URLPrediction, url: string, phishingProbability: number): string {
    const phishingPercentage = Math.round(phishingProbability * 100);
    
    if (!prediction.isPhishing) {
      const safeConfidence = Math.round((1 - phishingProbability) * 100);
      return `This URL appears to be safe (${safeConfidence}% confidence). Phishing probability: ${phishingPercentage}%. No major security concerns detected.`;
    }

    // Safely filter suspicious patterns
    const suspiciousPatterns = (prediction.features.suspiciousPatterns || [])
      .filter((p): p is string => typeof p === 'string' && p.length > 0);
    const patternsDisplay = suspiciousPatterns.length > 0 
      ? suspiciousPatterns.map(p => p.replace(/_/g, ' ')).join(', ') 
      : 'suspicious characteristics';

    if (phishingProbability > 0.75) {
      return `DANGER: This URL is highly likely to be malicious (${phishingPercentage}% phishing probability). ` +
             `Detected indicators: ${patternsDisplay}. Do NOT visit this link.`;
    }

    return `WARNING: This URL shows suspicious characteristics (${phishingPercentage}% phishing probability). ` +
           `Issues found: ${patternsDisplay}. Proceed with extreme caution.`;
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
   * Train SMS model - DISABLED
   * 
   * SMS uses BACKEND-ONLY inference. This method is intentionally disabled.
   * The backend has a pre-trained TensorFlow SavedModel that handles all SMS detection.
   */
  async trainSMS(
    _smsMessages: string[],
    _labels: number[],
    _onProgress?: (progress: MLTrainingProgress) => void
  ): Promise<MLTrainingResult> {
    console.warn('⚠️ SMS model training is DISABLED');
    console.warn('📱 SMS detection uses backend-only inference with pre-trained model');
    
    return {
      success: false,
      metrics: { accuracy: 0, loss: 0 },
      message: 'SMS model training is disabled. SMS detection uses backend-only inference.'
    };
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
