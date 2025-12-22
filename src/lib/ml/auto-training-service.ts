/**
 * Automatic ML Model Training Service
 * 
 * Trains models on first scan with minimal synthetic data
 * Ensures models are ready without user interaction
 */

import { getEmailModel } from './tfidf-email-model'
import { getSMSModel } from './bilstm-sms-model'
import { getURLCNNModel } from './lightweight-url-cnn'
import type { ScanType } from '../../types'

interface TrainingState {
  trained: boolean
  training: boolean
  error: string | null
}

/**
 * Auto-Training Service - trains models automatically on first scan
 */
export class AutoTrainingService {
  private static instance: AutoTrainingService
  private trainedModels = new Set<ScanType>()
  private trainingState: Record<ScanType, TrainingState> = {
    link: { trained: false, training: false, error: null },
    email: { trained: false, training: false, error: null },
    sms: { trained: false, training: false, error: null },
    qr: { trained: false, training: false, error: null },
  }

  private constructor() {
    this.loadTrainedState()
  }

  static getInstance(): AutoTrainingService {
    if (!AutoTrainingService.instance) {
      AutoTrainingService.instance = new AutoTrainingService()
    }
    return AutoTrainingService.instance
  }

  /**
   * Load trained models state from localStorage
   */
  private loadTrainedState(): void {
    try {
      const stored = localStorage.getItem('phishguard_trained_models')
      if (stored) {
        const trained = JSON.parse(stored) as ScanType[]
        trained.forEach(scanType => this.trainedModels.add(scanType))
      }
    } catch (error) {
      console.warn('Failed to load trained models state:', error)
    }
  }

  /**
   * Save trained models state to localStorage
   */
  private saveTrainedState(): void {
    try {
      const trained = Array.from(this.trainedModels)
      localStorage.setItem('phishguard_trained_models', JSON.stringify(trained))
    } catch (error) {
      console.warn('Failed to save trained models state:', error)
    }
  }

  /**
   * Check if a model is trained
   */
  isModelTrained(scanType: ScanType): boolean {
    return this.trainedModels.has(scanType)
  }

  /**
   * Auto-train model before first scan
   */
  async ensureModelTrained(scanType: ScanType): Promise<boolean> {
    // If already trained, skip
    if (this.isModelTrained(scanType)) {
      return true
    }

    // If already training, wait
    if (this.trainingState[scanType].training) {
      let attempts = 0
      while (this.trainingState[scanType].training && attempts < 60) {
        await new Promise(r => setTimeout(r, 500))
        attempts++
      }
      return this.isModelTrained(scanType)
    }

    // Start training
    this.trainingState[scanType].training = true
    this.trainingState[scanType].error = null

    try {
      console.log(`Auto-training ${scanType} model...`)
      
      switch (scanType) {
        case 'link':
          await this.trainURLModel()
          break
        case 'email':
          await this.trainEmailModel()
          break
        case 'sms':
          await this.trainSMSModel()
          break
        case 'qr':
          // QR uses URL model
          await this.trainURLModel()
          break
      }

      this.trainedModels.add(scanType)
      this.saveTrainedState()
      this.trainingState[scanType].trained = true
      
      console.log(`✓ ${scanType} model trained successfully`)
      return true
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Training failed'
      this.trainingState[scanType].error = errorMsg
      console.error(`Failed to train ${scanType} model:`, error)
      return false
    } finally {
      this.trainingState[scanType].training = false
    }
  }

  /**
   * Train URL/Link model with minimal synthetic data
   */
  private async trainURLModel(): Promise<void> {
    const model = getURLCNNModel()
    
    // Minimal training data - phishing URLs
    const urls: string[] = [
      // Phishing examples
      'http://192.168.1.1/admin/login.php',
      'https://paypa1.com/verify-account',
      'https://bit.ly/click-here-now',
      'http://amaz0n.com.spoofed-domain.tk/signin',
      'https://g00gle-login-verify.ga/account',
      'https://apple-id-verify.ml/secure/login',
      'https://micros0ft.com/office365-verify',
      'https://short.link/malware-infected',
      'http://login-paypal.suspicious.xyz/account',
      'https://secure-bank-login.tk/verify',
      // Legitimate examples
      'https://github.com/login',
      'https://www.google.com/search',
      'https://www.amazon.com/products',
      'https://www.apple.com/support',
      'https://www.microsoft.com/en-us/',
      'https://twitter.com/home',
      'https://linkedin.com/in/profile',
      'https://stackoverflow.com/questions',
      'https://www.youtube.com/watch',
      'https://www.reddit.com/r/programming',
    ]
    
    const labels: number[] = [
      // Phishing labels (1)
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
      // Legitimate labels (0)
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]

    await model.train(urls, labels, 0.2)
  }

  /**
   * Train Email model with minimal synthetic data
   */
  private async trainEmailModel(): Promise<void> {
    const model = getEmailModel()
    
    // Minimal training data - phishing emails
    const emails: string[] = [
      // Phishing examples
      'Urgent: Verify your account immediately! Click here to confirm your identity before your account is suspended.',
      'Congratulations! You won a prize. Click this link to claim your reward now!',
      'Your bank account has suspicious activity. Update your payment information immediately.',
      'Dear customer, please re-enter your password to verify your account security.',
      'Limited time offer! Confirm your credit card details to receive your $500 voucher.',
      'ALERT: Your PayPal account has been limited. Restore access now by verifying your information.',
      'Your Apple ID has been locked for security reasons. Confirm your identity to unlock.',
      'Action Required: Unusual sign-in activity detected. Verify your account immediately.',
      // Legitimate examples
      'Hi John, your order #12345 has been shipped. Track your package using the link below.',
      'Welcome to GitHub! Verify your email to complete your registration.',
      'Your subscription renewal is coming up next month. No action needed at this time.',
      'Thank you for your purchase. Your receipt is attached. Questions? Contact support.',
      'Weekly newsletter: Top programming articles and tutorials for developers.',
      'Your monthly statement is ready to view in your account dashboard.',
      'Meeting reminder: Team standup tomorrow at 10 AM. See you there!',
      'Your flight confirmation for booking #ABC123. Check-in opens 24 hours before departure.',
    ]
    
    const labels: number[] = [
      // Phishing labels (1)
      1, 1, 1, 1, 1, 1, 1, 1,
      // Legitimate labels (0)
      0, 0, 0, 0, 0, 0, 0, 0,
    ]

    await model.train(emails, labels, 0.2)
  }

  /**
   * Train SMS model with minimal synthetic data
   */
  private async trainSMSModel(): Promise<void> {
    const model = getSMSModel()
    
    // Minimal training data - phishing SMS
    const smsTexts: string[] = [
      // Phishing examples
      'Click now to verify your account! Limited time only.',
      'Your bank account has been locked. Confirm your password immediately.',
      'URGENT: Suspicious activity detected. Update payment details now.',
      'Congratulations! You won $1000. Claim your prize: bit.ly/prize',
      'Your package delivery failed. Click to reschedule: short.link/delivery',
      'FREE gift card! Claim now before it expires: click here',
      'ALERT: Unusual login attempt. Verify identity now.',
      'Your account will be suspended. Confirm now to keep access.',
      // Legitimate examples
      'Your Uber is arriving in 3 minutes. Driver: John M.',
      'Your verification code is 123456. Do not share with anyone.',
      'Order confirmed! Your item will arrive tomorrow.',
      'Welcome to Netflix! Enjoy your free trial.',
      'Reminder: Doctor appointment tomorrow at 2 PM.',
      'Your DoorDash order is on the way. Track in app.',
      'Package delivered. Left at front door.',
      'Sale starts tomorrow! 20% off all items.',
    ]
    
    const labels: number[] = [
      // Phishing labels (1)
      1, 1, 1, 1, 1, 1, 1, 1,
      // Legitimate labels (0)
      0, 0, 0, 0, 0, 0, 0, 0,
    ]

    await model.train(smsTexts, labels, undefined, 0.2)
  }

  /**
   * Get training state for a model
   */
  getTrainingState(scanType: ScanType): TrainingState {
    return this.trainingState[scanType]
  }

  /**
   * Reset training state (for testing/reset)
   */
  resetTraining(): void {
    this.trainedModels.clear()
    this.saveTrainedState()
    Object.keys(this.trainingState).forEach(key => {
      this.trainingState[key as ScanType] = { trained: false, training: false, error: null }
    })
  }
}

export const autoTrainingService = AutoTrainingService.getInstance()
