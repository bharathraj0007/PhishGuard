/**
 * QR Code Phishing Detection Service
 * Combines QR Decoder + TensorFlow.js ML URL Model algorithm
 * Complete phishing detection pipeline for QR codes
 * 
 * IMPORTANT: All URL analysis uses the TensorFlow.js ML model for accurate detection.
 */

import { decodeQRFromImage, batchDecodeQRImages } from './qr-decoder';
import { getURLPhishingModel, URLPhishingAnalysis } from './url-phishing-model';
import { urlModelLoader } from './url-model-loader';

// QR analysis status for proper error handling
export type QRAnalysisStatus = 'success' | 'decode_error' | 'unsupported_content' | 'analysis_error';

export interface QRPhishingAnalysis {
  qrImagePath?: string;
  decodedURL: string | null;
  urlAnalysis: URLPhishingAnalysis | null;
  isPhishing: boolean;
  confidence: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  riskScore: number;
  timestamp: string;
  // New status field for proper error handling
  status: QRAnalysisStatus;
  errorMessage?: string;
}

export interface BatchQRAnalysisResult {
  totalProcessed: number;
  phishingDetected: number;
  clean: number;
  analyses: QRPhishingAnalysis[];
  summary: {
    phishingRate: number;
    avgConfidence: number;
    highRiskCount: number;
  };
}

/**
 * QR Code Phishing Detection Service
 * Uses QR Decoder + TensorFlow.js ML Model for comprehensive detection
 * 
 * IMPORTANT: All URL detection uses the ML model for accuracy.
 */
export class QRPhishingService {
  private urlModel = getURLPhishingModel();

  /**
   * Analyze URL using TensorFlow.js ML model
   * Reuses the existing URL Character-CNN ML model for consistent detection
   * Returns ML-based phishing prediction
   */
  private async analyzeURLWithML(url: string): Promise<{
    isPhishing: boolean;
    score: number;
    confidence: number;
    indicators: string[];
  }> {
    try {
      console.log('🔵 [QR→URL] Using existing URL Character-CNN ML model for phishing detection');
      const prediction = await urlModelLoader.predict(url);
      
      // Apply calibration similar to phishing-detector.ts
      // calibrateModelScore logic: (rawScore - 0.5) * 1.8
      const rawModelScore = prediction.score; // Raw sigmoid 0.0-1.0
      const calibratedScore = Math.max(0, Math.min(1, (rawModelScore - 0.5) * 1.8));
      const calibratedRiskScore = Math.round(calibratedScore * 100);
      
      // Decision thresholds (same as URL analysis):
      // risk >= 80 → DANGEROUS
      // risk >= 45 → SUSPICIOUS  
      // risk < 45 → SAFE
      const isPhishing = calibratedRiskScore >= 45;
      
      console.log(`🟢 [QR→URL] Raw ML score: ${rawModelScore.toFixed(4)}`);
      console.log(`🔵 [QR→URL] Calibrated score: ${calibratedScore.toFixed(4)}`);
      console.log(`🟡 [QR→URL] Final risk: ${calibratedRiskScore}/100 - ${isPhishing ? 'PHISHING' : 'SAFE'}`);
      
      const indicators: string[] = [
        `🤖 Calibrated ML Score: ${calibratedRiskScore}%`,
        isPhishing ? '🔴 ML Model predicts PHISHING' : '✓ ML Model predicts SAFE'
      ];
      
      // Add URL-based indicators (same as URL scan)
      if (/^http:\/\//i.test(url)) {
        indicators.push('⚠️ HTTP connection (not encrypted)');
      } else if (/^https:\/\//i.test(url)) {
        indicators.push('✓ HTTPS connection (secure)');
      }
      
      if (/bit\.ly|tinyurl|goo\.gl|short\.link|t\.co|ow\.ly|buff\.ly/i.test(url)) {
        indicators.push('⚠️ Shortened URL detected');
      }
      
      if (/(?:\d{1,3}\.){3}\d{1,3}/.test(url)) {
        indicators.push('🔴 IP address used instead of domain');
      }
      
      // Check for special characters
      if (/[_\\%@#$]/.test(url)) {
        indicators.push('🟡 Special characters in URL');
      }
      
      // Check for typosquatting
      if (/amaz0n|g00gle|microsft|paypa1|fac3book|twitt3r|app1e|netfl1x|1nstagram|wh4tsapp|l1nkedin|yah00/i.test(url)) {
        indicators.push('🔴 Potential typosquatting detected');
      }
      
      console.log('✅ [QR→URL] ML analysis complete:', { calibratedRiskScore, isPhishing });
      
      return {
        isPhishing,
        score: calibratedRiskScore,
        confidence: prediction.confidence,
        indicators
      };
    } catch (error) {
      console.error('🔴 [QR→URL] ML model failed:', error);
      throw error;
    }
  }

  /**
   * Analyze single QR code image for phishing
   * CRITICAL: Follows strict QR → URL → ML pipeline
   * - QR decode failure = ERROR state (NOT safe)
   * - Non-URL content = UNSUPPORTED state (NOT safe)
   * - Only valid URLs proceed to ML analysis
   */
  async analyzeQRImage(imageFile: Blob | File): Promise<QRPhishingAnalysis> {
    const timestamp = new Date().toISOString();
    console.log('🚀 [QR-Pipeline] ===== STARTING QR ANALYSIS PIPELINE =====');
    console.log('📁 [QR-Pipeline] Input file:', {
      name: imageFile instanceof File ? imageFile.name : 'Blob',
      size: `${(imageFile.size / 1024).toFixed(1)} KB`,
      type: imageFile.type
    });

    try {
      // Step 1: Decode QR code to extract content
      console.log('\n📍 [QR-Pipeline] STEP 1: QR DECODING');
      console.log('📸 [QR-Pipeline] Attempting to decode QR image...');
      const decodedContent = await decodeQRFromImage(imageFile);

      // CRITICAL: QR decode failure is NOT a safe result
      if (!decodedContent) {
        console.log('\n❌ [QR-Pipeline] PIPELINE FAILED AT STEP 1: QR Decode Error');
        console.log('🔴 [QR-Pipeline] STATE: ERROR - Unable to decode QR code');
        console.log('⚠️  [QR-Pipeline] Reason: QR pattern not detected or image quality insufficient');
        return {
          decodedURL: null,
          urlAnalysis: null,
          isPhishing: false,
          confidence: 0,
          threatLevel: 'low',
          indicators: ['Unable to decode QR code'],
          riskScore: 0,
          timestamp,
          status: 'decode_error',
          errorMessage: 'Unable to decode QR code. Please upload a clear, valid QR image.'
        };
      }

      console.log('✅ [QR-Pipeline] STEP 1 SUCCESS: QR decoded');
      console.log('📄 [QR-Pipeline] Decoded content:', {
        length: decodedContent.length,
        preview: decodedContent.substring(0, 60) + (decodedContent.length > 60 ? '...' : '')
      });

      // Step 2: Validate that content is a URL (http:// or https://)
      console.log('\n📍 [QR-Pipeline] STEP 2: URL VALIDATION');
      const isValidURL = this.isValidHTTPURL(decodedContent);

      if (!isValidURL) {
        // QR decoded but content is not a URL - UNSUPPORTED state
        console.log('❌ [QR-Pipeline] PIPELINE HALTED AT STEP 2: URL Validation Failed');
        console.log('🟡 [QR-Pipeline] STATE: UNSUPPORTED - Content is not a URL');
        console.log('⚠️  [QR-Pipeline] Reason: QR code contains non-HTTP/HTTPS content');
        console.log('📝 [QR-Pipeline] Content detected as:', {
          type: decodedContent.startsWith('http') ? 'Web URL' : 'Text/Data',
          protocol: decodedContent.split('://')[0] || 'none'
        });
        return {
          decodedURL: decodedContent,
          urlAnalysis: null,
          isPhishing: false,
          confidence: 0,
          threatLevel: 'low',
          indicators: ['QR code decoded but content is not a URL'],
          riskScore: 0,
          timestamp,
          status: 'unsupported_content',
          errorMessage: 'QR code does not contain a URL. Only URL-based QR codes can be scanned for phishing.'
        };
      }

      console.log('✅ [QR-Pipeline] STEP 2 SUCCESS: Content is a valid HTTP/HTTPS URL');
      console.log('🔗 [QR-Pipeline] URL detected:', decodedContent.substring(0, 80) + (decodedContent.length > 80 ? '...' : ''));

      // Step 3: Analyze URL using ML model (PRIMARY) with heuristic fallback
      console.log('\n📍 [QR-Pipeline] STEP 3: ML PHISHING ANALYSIS');
      console.log('🤖 [QR-Pipeline] Initiating TensorFlow.js Character-CNN model...');
      let mlResult: { isPhishing: boolean; score: number; confidence: number; indicators: string[] };
      let urlAnalysis: URLPhishingAnalysis | null = null;
      
      try {
        mlResult = await this.analyzeURLWithML(decodedContent);
        console.log('✅ [QR-Pipeline] STEP 3 SUCCESS: ML analysis completed');
      } catch (mlError) {
        console.warn('\n⚠️  [QR-Pipeline] ML model unavailable, falling back to heuristic analysis');
        console.log('🔧 [QR-Pipeline] Error:', mlError instanceof Error ? mlError.message : String(mlError));
        // Fallback to heuristic URL model
        urlAnalysis = this.urlModel.analyzeURL(decodedContent);
        mlResult = {
          isPhishing: urlAnalysis.isPhishing,
          score: urlAnalysis.score,
          confidence: urlAnalysis.confidence,
          indicators: [...urlAnalysis.indicators, '⚠️ Heuristic analysis (ML unavailable)']
        };
        console.log('✅ [QR-Pipeline] STEP 3 SUCCESS: Heuristic analysis completed (fallback)');
      }

      // Step 4: Determine threat level based on ML score
      console.log('\n📍 [QR-Pipeline] STEP 4: THREAT ASSESSMENT');
      const threatLevel = this.determineThreatLevel(
        mlResult.score,
        mlResult.indicators
      );

      console.log('✅ [QR-Pipeline] STEP 4 SUCCESS: Threat level determined');
      console.log('📊 [QR-Pipeline] Final Analysis Results:', {
        threatLevel: threatLevel.toUpperCase(),
        riskScore: `${mlResult.score}/100`,
        isPhishing: mlResult.isPhishing ? '⚠️ PHISHING DETECTED' : '✅ SAFE',
        confidence: `${(mlResult.confidence * 100).toFixed(1)}%`
      });

      console.log('\n🟢 [QR-Pipeline] ===== PIPELINE COMPLETE: SUCCESS =====');
      console.log('📌 [QR-Pipeline] FINAL STATE: SAFE/PHISHING RESULT');

      return {
        decodedURL: decodedContent,
        urlAnalysis,
        isPhishing: mlResult.isPhishing,
        confidence: mlResult.confidence,
        threatLevel,
        indicators: [
          ...new Set([
            ...mlResult.indicators,
            '✓ QR decoded successfully',
            '🤖 TensorFlow.js ML model used'
          ])
        ],
        riskScore: mlResult.score,
        timestamp,
        status: 'success'
      };
    } catch (error) {
      console.error('\n❌ [QR-Pipeline] CRITICAL ERROR - Pipeline failed unexpectedly');
      console.error('🔴 [QR-Pipeline] STATE: ERROR - Unexpected exception');
      console.error('📋 [QR-Pipeline] Error details:', error instanceof Error ? error.message : String(error));
      return {
        decodedURL: null,
        urlAnalysis: null,
        isPhishing: false,
        confidence: 0,
        threatLevel: 'low',
        indicators: ['Unexpected error during QR analysis'],
        riskScore: 0,
        timestamp,
        status: 'analysis_error',
        errorMessage: 'An error occurred while analyzing the QR code. Please try again.'
      };
    }
  }

  /**
   * Batch analyze multiple QR images
   */
  async batchAnalyzeQRImages(
    imageFiles: Array<Blob | File>
  ): Promise<BatchQRAnalysisResult> {
    const analyses = await Promise.all(
      imageFiles.map(file => this.analyzeQRImage(file))
    );

    const phishingDetected = analyses.filter(a => a.isPhishing).length;
    const highRisk = analyses.filter(a => 
      a.threatLevel === 'high' || a.threatLevel === 'critical'
    ).length;

    const avgConfidence = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
      : 0;

    return {
      totalProcessed: analyses.length,
      phishingDetected,
      clean: analyses.length - phishingDetected,
      analyses,
      summary: {
        phishingRate: analyses.length > 0 ? phishingDetected / analyses.length : 0,
        avgConfidence,
        highRiskCount: highRisk
      }
    };
  }

  /**
   * Analyze QR code from decoded data (URL/content)
   * CRITICAL: Only analyzes valid HTTP/HTTPS URLs
   */
  async analyzeQRFromData(decodedData: string): Promise<QRPhishingAnalysis> {
    const timestamp = new Date().toISOString();
    console.log('🚀 [QR-Data-Pipeline] ===== STARTING QR DATA ANALYSIS PIPELINE =====');
    console.log('📄 [QR-Data-Pipeline] Input data:', {
      length: decodedData.length,
      preview: decodedData.substring(0, 60) + (decodedData.length > 60 ? '...' : '')
    });

    try {
      console.log('\n📍 [QR-Data-Pipeline] STEP 1: URL VALIDATION');
      console.log('🔗 [QR-Data-Pipeline] Analyzing decoded data...');
      
      // STRICT validation - only HTTP/HTTPS URLs
      const isValidURL = this.isValidHTTPURL(decodedData);

      if (!isValidURL) {
        // QR decoded but content is not a URL - UNSUPPORTED state
        console.log('❌ [QR-Data-Pipeline] PIPELINE HALTED AT STEP 1: URL Validation Failed');
        console.log('🟡 [QR-Data-Pipeline] STATE: UNSUPPORTED - Content is not a URL');
        console.log('⚠️  [QR-Data-Pipeline] Reason: QR data contains non-HTTP/HTTPS content');
        console.log('📝 [QR-Data-Pipeline] Content detected as:', {
          type: decodedData.startsWith('http') ? 'Web URL' : 'Text/Data',
          protocol: decodedData.split('://')[0] || 'none'
        });
        return {
          decodedURL: decodedData,
          urlAnalysis: null,
          isPhishing: false,
          confidence: 0,
          threatLevel: 'low',
          indicators: ['QR data decoded but content is not a URL'],
          riskScore: 0,
          timestamp,
          status: 'unsupported_content',
          errorMessage: 'QR code does not contain a URL. Only URL-based QR codes can be scanned for phishing.'
        };
      }

      console.log('✅ [QR-Data-Pipeline] STEP 1 SUCCESS: Content is a valid HTTP/HTTPS URL');
      console.log('🔗 [QR-Data-Pipeline] URL detected:', decodedData.substring(0, 80) + (decodedData.length > 80 ? '...' : ''));

      // Analyze URL using ML model (PRIMARY) with heuristic fallback
      console.log('\n📍 [QR-Data-Pipeline] STEP 2: ML PHISHING ANALYSIS');
      console.log('🤖 [QR-Data-Pipeline] Initiating TensorFlow.js Character-CNN model...');
      let mlResult: { isPhishing: boolean; score: number; confidence: number; indicators: string[] };
      let urlAnalysis: URLPhishingAnalysis | null = null;
      
      try {
        mlResult = await this.analyzeURLWithML(decodedData);
        console.log('✅ [QR-Data-Pipeline] STEP 2 SUCCESS: ML analysis completed');
      } catch (mlError) {
        console.warn('\n⚠️  [QR-Data-Pipeline] ML model unavailable, falling back to heuristic analysis');
        console.log('🔧 [QR-Data-Pipeline] Error:', mlError instanceof Error ? mlError.message : String(mlError));
        // Fallback to heuristic URL model
        urlAnalysis = this.urlModel.analyzeURL(decodedData);
        mlResult = {
          isPhishing: urlAnalysis.isPhishing,
          score: urlAnalysis.score,
          confidence: urlAnalysis.confidence,
          indicators: [...urlAnalysis.indicators, '⚠️ Heuristic analysis (ML unavailable)']
        };
        console.log('✅ [QR-Data-Pipeline] STEP 2 SUCCESS: Heuristic analysis completed (fallback)');
      }

      // Determine threat level
      console.log('\n📍 [QR-Data-Pipeline] STEP 3: THREAT ASSESSMENT');
      const threatLevel = this.determineThreatLevel(
        mlResult.score,
        mlResult.indicators
      );

      const combinedIndicators = [
        ...mlResult.indicators,
        '✓ QR data decoded successfully',
        '🤖 TensorFlow.js ML model used'
      ];

      console.log('✅ [QR-Data-Pipeline] STEP 3 SUCCESS: Threat level determined');
      console.log('📊 [QR-Data-Pipeline] Final Analysis Results:', {
        threatLevel: threatLevel.toUpperCase(),
        riskScore: `${mlResult.score}/100`,
        isPhishing: mlResult.isPhishing ? '⚠️ PHISHING DETECTED' : '✅ SAFE',
        confidence: `${(mlResult.confidence * 100).toFixed(1)}%`
      });

      console.log('\n🟢 [QR-Data-Pipeline] ===== PIPELINE COMPLETE: SUCCESS =====');
      console.log('📌 [QR-Data-Pipeline] FINAL STATE: SAFE/PHISHING RESULT');

      return {
        decodedURL: decodedData,
        urlAnalysis,
        isPhishing: mlResult.isPhishing,
        confidence: mlResult.confidence,
        threatLevel,
        indicators: [...new Set(combinedIndicators)],
        riskScore: mlResult.score,
        timestamp,
        status: 'success'
      };
    } catch (error) {
      console.error('\n❌ [QR-Data-Pipeline] CRITICAL ERROR - Pipeline failed unexpectedly');
      console.error('🔴 [QR-Data-Pipeline] STATE: ERROR - Unexpected exception');
      console.error('📋 [QR-Data-Pipeline] Error details:', error instanceof Error ? error.message : String(error));
      return {
        decodedURL: decodedData,
        urlAnalysis: null,
        isPhishing: false,
        confidence: 0,
        threatLevel: 'low',
        indicators: ['Unexpected error during QR data analysis'],
        riskScore: 0,
        timestamp,
        status: 'analysis_error',
        errorMessage: 'An error occurred while analyzing the QR code content. Please try again.'
      };
    }
  }

  /**
   * Analyze QR code from URL (for stored/uploaded images)
   */
  async analyzeQRFromURL(imageURL: string): Promise<QRPhishingAnalysis> {
    try {
      const response = await fetch(imageURL);
      const blob = await response.blob();
      return this.analyzeQRImage(blob);
    } catch (error) {
      console.error('❌ [QR] URL fetch error:', error);
      return {
        decodedURL: null,
        urlAnalysis: null,
        isPhishing: false,
        confidence: 0,
        threatLevel: 'low',
        indicators: [],
        riskScore: 0,
        timestamp: new Date().toISOString(),
        status: 'analysis_error',
        errorMessage: 'Failed to fetch QR image from URL. Please try again.'
      };
    }
  }

  /**
   * Analyze QR from canvas/video stream
   */
  async analyzeQRFromCanvas(
    canvas: HTMLCanvasElement
  ): Promise<QRPhishingAnalysis> {
    try {
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve({
              decodedURL: null,
              urlAnalysis: null,
              isPhishing: false,
              confidence: 0,
              threatLevel: 'low',
              indicators: ['canvas_conversion_failed'],
              riskScore: 0,
              timestamp: new Date().toISOString()
            });
            return;
          }

          const result = await this.analyzeQRImage(blob);
          resolve(result);
        });
      });
    } catch (error) {
      console.error('Canvas QR analysis error:', error);
      return {
        decodedURL: null,
        urlAnalysis: null,
        isPhishing: false,
        confidence: 0,
        threatLevel: 'low',
        indicators: ['canvas_error'],
        riskScore: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Real-time QR scanning from video/webcam
   */
  async startRealTimeQRScanning(
    videoElement: HTMLVideoElement,
    onDetection: (analysis: QRPhishingAnalysis) => void
  ): Promise<() => void> {
    let scanning = true;
    const detectedCodes = new Set<string>();

    const { startRealTimeQRScanning: startScanning } = await import('./qr-decoder');

    const stopScanning = await startScanning(
      videoElement,
      async (decodedData: string) => {
        try {
          // Avoid duplicate analysis of same QR code
          if (detectedCodes.has(decodedData)) {
            return;
          }
          detectedCodes.add(decodedData);

          const analysis = await this.analyzeQRFromData(decodedData);
          onDetection(analysis);
        } catch (error) {
          console.error('Real-time QR analysis error:', error);
        }
      }
    );

    // Return function to stop scanning
    return () => {
      scanning = false;
      stopScanning();
    };
  }

  /**
   * Check if decoded content is a URL (any format)
   */
  private isValidURLContent(content: string): boolean {
    if (!content) return false;

    const urlPatterns = [
      /^https?:\/\//i,
      /^ftp:\/\//i,
      /^www\./i,
      /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
    ];

    return urlPatterns.some(pattern => pattern.test(content));
  }

  /**
   * STRICT URL validation - only accepts http:// or https:// URLs
   * Used for QR code scanning to ensure ML model can analyze the content
   */
  private isValidHTTPURL(content: string): boolean {
    if (!content) return false;
    // Only accept http:// or https:// URLs for phishing analysis
    return /^https?:\/\//i.test(content);
  }

  /**
   * Determine threat level based on analysis results
   */
  private determineThreatLevel(
    score: number,
    indicators: string[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical indicators
    if (indicators.some(i =>
      ['homograph_attack_detected', 'invalid_url_format', 'ip_address_used'].includes(i)
    )) {
      return 'critical';
    }

    if (score >= 80) {
      return 'critical';
    }

    if (score >= 60) {
      return 'high';
    }

    if (score >= 40) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Get threat level color for UI
   */
  getThreatColor(level: string): string {
    switch (level) {
      case 'critical':
        return '#dc2626';
      case 'high':
        return '#ea580c';
      case 'medium':
        return '#f59e0b';
      case 'low':
      default:
        return '#10b981';
    }
  }

  /**
   * Generate detailed report for QR analysis
   */
  generateReport(analysis: QRPhishingAnalysis): string {
    const lines = [
      '=== QR CODE PHISHING ANALYSIS REPORT ===',
      `Timestamp: ${analysis.timestamp}`,
      ``,
      `DECODED URL: ${analysis.decodedURL || 'Failed to decode'}`,
      `THREAT LEVEL: ${analysis.threatLevel.toUpperCase()}`,
      `RISK SCORE: ${analysis.riskScore}/100`,
      `CONFIDENCE: ${(analysis.confidence * 100).toFixed(1)}%`,
      ``,
      `INDICATORS FOUND (${analysis.indicators.length}):`,
      ...analysis.indicators.map(i => `  • ${i}`),
      ``
    ];

    if (analysis.urlAnalysis) {
      lines.push(`URL ANALYSIS DETAILS:`,);
      lines.push(`  Domain Score: ${analysis.urlAnalysis.details.domainScore}/100`);
      lines.push(`  Path Score: ${analysis.urlAnalysis.details.pathScore}/100`);
      lines.push(`  Parameter Score: ${analysis.urlAnalysis.details.parameterScore}/100`);
      lines.push(`  Structure Score: ${analysis.urlAnalysis.details.structureScore}/100`);
      lines.push(``);
    }

    lines.push(`RECOMMENDATION: ${
      analysis.isPhishing 
        ? '⚠️ SUSPICIOUS - DO NOT CLICK' 
        : '✓ APPEARS SAFE'
    }`);

    return lines.join('\n');
  }
}

// Singleton instance
let qrService: QRPhishingService | null = null;

/**
 * Get or create QR phishing service instance
 */
export function getQRPhishingService(): QRPhishingService {
  if (!qrService) {
    qrService = new QRPhishingService();
  }
  return qrService;
}
