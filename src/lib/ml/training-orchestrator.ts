/**
 * ML Training Orchestrator
 * Manages the complete training pipeline from data fetching to model deployment
 */

import { blink } from '../blink';
import { parseCSVData, TrainingRecord } from './kaggle-service';
import { 
  URLModelTrainer, 
  EmailModelTrainer, 
  SMSModelTrainer, 
  QRModelTrainer,
  TrainingConfig,
  TrainingProgress,
  ModelMetrics 
} from './model-trainer';

export type ScanType = 'url' | 'email' | 'sms' | 'qr';

export interface TrainingOptions {
  scanType: ScanType;
  useKaggleData: boolean;
  datasetSize?: number;
  config?: Partial<TrainingConfig>;
  onProgress?: (progress: TrainingProgress) => void;
}

export interface TrainingResult {
  success: boolean;
  metrics?: ModelMetrics;
  error?: string;
  datasetSize?: number;
  trainingDuration?: number;
}

/**
 * Main training orchestrator
 */
export class TrainingOrchestrator {
  private readonly KAGGLE_FUNCTION_URL = 'https://eky2mdxr--kaggle-dataset-fetcher.functions.blink.new';
  
  /**
   * Fetch dataset from Kaggle via edge function
   */
  private async fetchKaggleDataset(scanType: ScanType): Promise<TrainingRecord[]> {
    try {
      const response = await fetch(this.KAGGLE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetSlug: scanType
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Kaggle dataset: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch dataset');
      }

      // Parse CSV data
      const records = parseCSVData(result.data, scanType);
      
      console.log(`Fetched ${records.length} records from Kaggle`);
      return records;
      
    } catch (error) {
      console.error('Error fetching Kaggle dataset:', error);
      throw error;
    }
  }

  /**
   * Fetch training data from Blink database
   */
  private async fetchBlinkDataset(scanType: ScanType, limit: number = 1000): Promise<TrainingRecord[]> {
    try {
      const records = await blink.db.trainingRecords.list({
        where: { scanType },
        limit
      });

      return (records as unknown as Array<{content: string; isPhishing: number; scanType: string}>).map(r => ({
        content: r.content,
        isPhishing: r.isPhishing === 1,
        scanType: r.scanType as ScanType
      }));
    } catch (error) {
      console.error('Error fetching Blink dataset:', error);
      return [];
    }
  }

  /**
   * Generate synthetic dataset for demo/testing
   */
  private generateSyntheticDataset(scanType: ScanType, size: number): TrainingRecord[] {
    const phishingExamples: Record<ScanType, string[]> = {
      url: [
        'http://paypal-security.xyz/login',
        'https://amazon-prize.com/claim',
        'http://bank-verify.net/secure',
        'https://microsoft-alert.com/fix',
        'http://netflix-billing.org/pay',
        'https://apple-support-id.com/unlock',
        'http://fedex-package-delivery.net/track',
        'https://irs-refund-claim.com/verify'
      ],
      email: [
        'URGENT: Your account will be suspended unless you verify now!',
        'Congratulations! You won $1,000,000. Send bank details to claim.',
        'Security Alert: Unusual login activity. Click here immediately.',
        'Your package is held at customs. Pay fee to release shipment.',
        'Free iPhone giveaway! Enter credit card to claim your prize.',
        'IRS Tax Refund: Claim your $5,000 refund by clicking this link.',
        'Your password will expire. Update it now to avoid account closure.'
      ],
      sms: [
        'URGENT! Bank account locked. Click: bit.ly/xyz123 to unlock',
        'You won $5000! Claim now: scam-link.com',
        'Package held. Pay $2.99: fake-delivery.net/track',
        'Netflix payment failed. Update: phish-site.com/billing',
        'IRS: You owe taxes. Pay now: irs-fake.org or face arrest',
        'Free gift card! Click to claim your $100 Amazon voucher'
      ],
      qr: [
        'http://fake-payment.com/qr/12345',
        'https://phishing-site.net/scan',
        'http://malicious-qr.xyz/redirect',
        'https://scam-payment.com/checkout',
        'http://fake-wifi.com/connect'
      ]
    };

    const legitimateExamples: Record<ScanType, string[]> = {
      url: [
        'https://www.google.com/search',
        'https://github.com/tensorflow/tfjs',
        'https://www.wikipedia.org/wiki/Machine_learning',
        'https://stackoverflow.com/questions/tagged/tensorflow',
        'https://www.reddit.com/r/MachineLearning/',
        'https://www.amazon.com/books',
        'https://www.netflix.com/browse',
        'https://www.microsoft.com/products'
      ],
      email: [
        'Your order #12345 has shipped and will arrive tomorrow.',
        'Welcome to our newsletter! This week: AI trends and tutorials.',
        'Meeting reminder: Team sync at 2 PM in Conference Room A.',
        'Your subscription renewed successfully. Thank you!',
        'Receipt for your recent purchase is attached to this email.',
        'Your flight is confirmed. Check-in opens 24 hours before departure.'
      ],
      sms: [
        'Your verification code is: 123456. Valid for 10 minutes.',
        'Appointment reminder: Dental checkup tomorrow at 10 AM',
        'Your package delivered successfully to your front door',
        'Bank alert: $50 withdrawal at Main St ATM',
        'Flight on time. Gate B12, Boarding 3:30 PM',
        'Subscription renewed. $9.99 charged to card ending in 4321'
      ],
      qr: [
        'https://www.example.com/menu',
        'https://maps.google.com/location/restaurant',
        'https://linkedin.com/in/johndoe',
        'https://wifi-setup.hotel.com',
        'https://tickets.eventbrite.com/event/12345'
      ]
    };

    const records: TrainingRecord[] = [];
    const phishing = phishingExamples[scanType];
    const legitimate = legitimateExamples[scanType];

    for (let i = 0; i < size; i++) {
      const isPhishing = Math.random() < 0.5; // 50/50 split
      const examples = isPhishing ? phishing : legitimate;
      const content = examples[Math.floor(Math.random() * examples.length)];
      
      records.push({
        content,
        isPhishing,
        scanType
      });
    }

    return records;
  }

  /**
   * Train model for specific scan type
   */
  async trainModel(options: TrainingOptions): Promise<TrainingResult> {
    const startTime = Date.now();
    const { scanType, useKaggleData, datasetSize = 500, config, onProgress } = options;

    try {
      // Step 1: Fetch training data
      let trainingData: TrainingRecord[];
      
      if (useKaggleData) {
        console.log(`Fetching Kaggle dataset for ${scanType}...`);
        trainingData = await this.fetchKaggleDataset(scanType);
        
        // If Kaggle fails, fall back to Blink DB
        if (trainingData.length === 0) {
          console.log('Kaggle fetch failed, using Blink database...');
          trainingData = await this.fetchBlinkDataset(scanType, datasetSize);
        }
        
        // If still no data, use synthetic
        if (trainingData.length === 0) {
          console.log('No data available, generating synthetic dataset...');
          trainingData = this.generateSyntheticDataset(scanType, datasetSize);
        }
      } else {
        // Use synthetic data for quick testing
        trainingData = this.generateSyntheticDataset(scanType, datasetSize);
      }

      // Limit dataset size if specified
      if (trainingData.length > datasetSize) {
        trainingData = trainingData.slice(0, datasetSize);
      }

      console.log(`Training with ${trainingData.length} records`);

      // Step 2: Configure training
      const trainingConfig: TrainingConfig = {
        epochs: config?.epochs || 10,
        batchSize: config?.batchSize || 32,
        learningRate: config?.learningRate || 0.001,
        validationSplit: config?.validationSplit || 0.2
      };

      // Step 3: Select and train model
      let trainer;
      let metrics: ModelMetrics;

      switch (scanType) {
        case 'url':
          trainer = new URLModelTrainer();
          metrics = await trainer.train(trainingData, trainingConfig, onProgress);
          break;
        
        case 'email':
          trainer = new EmailModelTrainer();
          metrics = await trainer.train(trainingData, trainingConfig, onProgress);
          break;
        
        case 'sms':
          trainer = new SMSModelTrainer();
          metrics = await trainer.train(trainingData, trainingConfig, onProgress);
          break;
        
        case 'qr':
          trainer = new QRModelTrainer();
          metrics = await trainer.train(trainingData, trainingConfig, onProgress);
          break;
        
        default:
          throw new Error(`Unknown scan type: ${scanType}`);
      }

      // Step 4: Save training metadata
      const trainingDuration = Date.now() - startTime;
      
      await this.saveTrainingMetadata({
        scanType,
        datasetSize: trainingData.length,
        metrics,
        duration: trainingDuration,
        config: trainingConfig
      });

      return {
        success: true,
        metrics,
        datasetSize: trainingData.length,
        trainingDuration
      };

    } catch (error) {
      console.error('Training error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Save training metadata to database
   */
  private async saveTrainingMetadata(metadata: {
    scanType: ScanType;
    datasetSize: number;
    metrics: ModelMetrics;
    duration: number;
    config: TrainingConfig;
  }): Promise<void> {
    try {
      const user = await blink.auth.me();
      if (!user) return;

      const now = new Date().toISOString();
      const modelId = `model_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      await blink.db.modelVersions.create({
        id: modelId,
        versionNumber: `v${Date.now()}`,
        description: `${metadata.scanType.toUpperCase()} model training`,
        modelType: metadata.scanType,
        trainingDatasetId: '',
        trainingStartedAt: new Date(Date.now() - metadata.duration).toISOString(),
        trainingCompletedAt: now,
        trainingDuration: metadata.duration,
        status: 'completed',
        isActive: 1,
        metrics: JSON.stringify(metadata.metrics),
        config: JSON.stringify(metadata.config),
        createdBy: user.id,
        synced: 1,
        createdAt: now,
        updatedAt: now
      });
    } catch (error) {
      console.error('Error saving training metadata:', error);
    }
  }
}

// Singleton instance
export const trainingOrchestrator = new TrainingOrchestrator();
