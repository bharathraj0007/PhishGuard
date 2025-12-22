/**
 * ML Prediction Service for PhishGuard
 * 
 * Provides real-time phishing detection using the trained TensorFlow.js model.
 * Updated for browser stability with safe backend initialization.
 */

import { UnifiedUSEPhishingModel } from './unified-use-model';
import { initializeForInference, ensureBackendReady, getBackendStatus } from './tf-backend-manager';
 
 export interface ScanResult {
   threatLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
   confidence: number;
   isPhishing: boolean;
   indicators: string[];
   analysis: string;
   mlPowered: boolean;
   modelType?: 'unified-use' | 'rule-based';
 }
 
 export class MLPredictionService {
   private model: UnifiedUSEPhishingModel | null = null;
   private isInitialized = false;
   private initializationPromise: Promise<void> | null = null;
 
   /**
     * Initialize the ML model for predictions
     */
    async initialize(): Promise<void> {
      if (this.isInitialized) return;
    
      if (this.initializationPromise) {
        return this.initializationPromise;
      }
   
      this.initializationPromise = (async () => {
        try {
          console.log('🤖 Initializing ML prediction service...');
          
          // Initialize TF backend for inference (WebGL with CPU fallback)
          await initializeForInference();
          
          const status = getBackendStatus();
          console.log(`📊 TF Backend: ${status.currentBackend} (CPU mode: ${status.isCPUMode})`);
   
          this.model = new UnifiedUSEPhishingModel();
          await this.model.initialize();
   
          this.isInitialized = true;
          console.log('✅ Unified ML model ready (Email + SMS + URL + QR text)');
        } catch (error) {
          console.error('❌ Failed to initialize ML model:', error);
          throw error;
        }
      })();
   
      return this.initializationPromise;
    }
 
   /**
    * Analyze email/text for phishing using ML model
    * Uses a single USE-based binary classifier for all text inputs
    */
   async analyzeText(text: string, scanType: 'email' | 'sms' | 'link' | 'qr'): Promise<ScanResult> {
     // Ensure model is initialized
     if (!this.isInitialized) {
       console.log('⚠️ Model not initialized, using rule-based detection');
       return this.ruleBasedAnalysis(text, scanType);
     }
   
     try {
       // Ensure backend is ready (handles WebGL context recovery)
       await ensureBackendReady();
       
       const pred = await this.model!.predict(text);
 
       const threatLevel: ScanResult['threatLevel'] = pred.probability < 0.2
         ? 'safe'
         : pred.probability < 0.4
           ? 'low'
           : pred.probability < 0.6
             ? 'medium'
             : pred.probability < 0.8
               ? 'high'
               : 'critical';
 
       const analysis = pred.isPhishing
         ? `Likely phishing ${scanType.toUpperCase()} content (model probability ${(pred.probability * 100).toFixed(1)}%).`
         : `Likely legitimate ${scanType.toUpperCase()} content (model probability ${(pred.probability * 100).toFixed(1)}%).`;
 
       return {
         threatLevel,
         confidence: pred.probability,
         isPhishing: pred.isPhishing,
         indicators: pred.isPhishing
           ? ['Unified ML model flagged this content as phishing']
           : ['Unified ML model classified this content as legitimate'],
         analysis,
         mlPowered: true,
         modelType: 'unified-use',
       };
     } catch (error) {
       console.error('ML prediction failed, falling back to rules:', error);
       return this.ruleBasedAnalysis(text, scanType);
     }
   }
 
   /**
    * Batch analysis for multiple texts
    */
   async analyzeBatch(texts: string[], scanType: 'email' | 'sms' | 'link' | 'qr'): Promise<ScanResult[]> {
     if (!this.isInitialized) {
       return texts.map(text => this.ruleBasedAnalysis(text, scanType));
     }
 
     try {
       const predictions = await this.model!.predictBatch(texts);
 
       return predictions.map((pred) => {
         const threatLevel: ScanResult['threatLevel'] = pred.probability < 0.2
           ? 'safe'
           : pred.probability < 0.4
             ? 'low'
             : pred.probability < 0.6
               ? 'medium'
               : pred.probability < 0.8
                 ? 'high'
                 : 'critical';
 
         return {
           threatLevel,
           confidence: pred.probability,
           isPhishing: pred.isPhishing,
           indicators: pred.isPhishing
             ? ['Unified ML model flagged this content as phishing']
             : ['Unified ML model classified this content as legitimate'],
           analysis: pred.isPhishing
             ? `Likely phishing ${scanType.toUpperCase()} content (model probability ${(pred.probability * 100).toFixed(1)}%).`
             : `Likely legitimate ${scanType.toUpperCase()} content (model probability ${(pred.probability * 100).toFixed(1)}%).`,
           mlPowered: true,
           modelType: 'unified-use',
         };
       });
     } catch (error) {
       console.error('Batch ML prediction failed, falling back to rules:', error);
       return texts.map(text => this.ruleBasedAnalysis(text, scanType));
     }
   }
 
   /**
    * Rule-based analysis (fallback when ML is not available)
    */
   private ruleBasedAnalysis(text: string, scanType: string): ScanResult {
     const lowerText = text.toLowerCase();
     const indicators: string[] = [];
     let riskScore = 0;
 
     // Urgency tactics
     if (/urgent|immediate|act now|expires|limited time|hurry|asap/i.test(lowerText)) {
       indicators.push('Urgency tactics detected');
       riskScore += 15;
     }
 
     // Financial keywords
     if (/bank|account|credit card|payment|verify|confirm|update|suspend/i.test(lowerText)) {
       indicators.push('Financial information request');
       riskScore += 20;
     }
 
     // Suspicious links
     if (/click here|click now|download|verify now|update now/i.test(lowerText)) {
       indicators.push('Suspicious call-to-action');
       riskScore += 15;
     }
 
     // Threats
     if (/suspended|locked|unauthorized|security alert|verify identity|unusual activity/i.test(lowerText)) {
       indicators.push('Threatening language');
       riskScore += 20;
     }
 
     // Too good to be true
     if (/free|prize|winner|congratulations|claim|lottery|inheritance/i.test(lowerText)) {
       indicators.push('Suspicious offers');
       riskScore += 25;
     }
 
     // Generic greetings
     if (/dear customer|dear user|dear member|valued customer/i.test(lowerText)) {
       indicators.push('Generic greeting (not personalized)');
       riskScore += 10;
     }
 
     // Misspellings
     if (/recieve|sucessful|garantee|offical|acount|verfiy/i.test(lowerText)) {
       indicators.push('Spelling errors');
       riskScore += 15;
     }
 
     // Links with suspicious domains
     if (/(bit\.ly|tinyurl|goo\.gl|ow\.ly|t\.co)/i.test(lowerText)) {
       indicators.push('Shortened URL detected');
       riskScore += 10;
     }
 
     // Email-specific checks
     if (scanType === 'email') {
       if (/reply within|respond immediately|confirm your|verify your/i.test(lowerText)) {
         indicators.push('Pressure to respond quickly');
         riskScore += 15;
       }
     }
 
     // SMS-specific checks
     if (scanType === 'sms') {
       if (/click|tap|download|install/i.test(lowerText)) {
         indicators.push('Suspicious SMS action request');
         riskScore += 20;
       }
     }
 
     // Determine threat level
     let threatLevel: ScanResult['threatLevel'];
     if (riskScore < 20) threatLevel = 'safe';
     else if (riskScore < 40) threatLevel = 'low';
     else if (riskScore < 60) threatLevel = 'medium';
     else if (riskScore < 80) threatLevel = 'high';
     else threatLevel = 'critical';
 
     const confidence = Math.min(riskScore / 100, 0.99);
     const isPhishing = riskScore >= 40;
 
     let analysis: string;
     if (threatLevel === 'safe') {
       analysis = 'No significant phishing indicators detected. This appears to be legitimate.';
     } else if (threatLevel === 'low') {
       analysis = `Some minor concerns detected: ${indicators.join(', ')}. Exercise caution.`;
     } else if (threatLevel === 'medium') {
       analysis = `Multiple red flags detected: ${indicators.join(', ')}. Be very cautious.`;
     } else if (threatLevel === 'high') {
       analysis = `High risk of phishing. Detected: ${indicators.join(', ')}. Do not interact.`;
     } else {
       analysis = `CRITICAL THREAT: Almost certainly phishing. ${indicators.join(', ')}. Delete immediately.`;
     }
 
     return {
       threatLevel,
       confidence,
       isPhishing,
       indicators,
       analysis,
       mlPowered: false
     };
   }
 
   /**
    * Check if ML model is ready
    */
   isReady(): boolean {
     return this.isInitialized;
   }
 
   /**
    * Get model info
    */
   getModelInfo(): { initialized: boolean; summary?: string } {
     return {
       initialized: this.isInitialized,
       summary: this.isInitialized ? 'Unified USE phishing model (binary classifier)' : undefined
     };
   }
 
   /**
    * Dispose of the model
    */
   dispose(): void {
     this.model?.dispose();
     this.model = null;
     this.isInitialized = false;
   }
 }
 
 /**
  * Global ML Prediction Service instance
  */
 let globalPredictionService: MLPredictionService | null = null;
 
 export function getPredictionService(): MLPredictionService {
   if (!globalPredictionService) {
     globalPredictionService = new MLPredictionService();
   }
   return globalPredictionService;
 }
 
 /**
  * Initialize ML prediction service on app startup
  */
 export async function initializeMLService(): Promise<void> {
   try {
     const service = getPredictionService();
     await service.initialize();
     console.log('✅ ML Service initialized successfully');
   } catch (error) {
     console.warn('⚠️ ML Service initialization failed, will use rule-based detection:', error);
   }
 }
