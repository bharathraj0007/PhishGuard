/**
 * QR Code Phishing Detection Service
 * Combines QR Decoder + URL Model algorithm
 * Complete phishing detection pipeline for QR codes
 */

import { decodeQRFromImage, batchDecodeQRImages } from './qr-decoder';
import { getURLPhishingModel, URLPhishingAnalysis } from './url-phishing-model';

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
 * Uses QR Decoder + URL Model for comprehensive detection
 */
export class QRPhishingService {
  private urlModel = getURLPhishingModel();

  /**
   * Analyze single QR code image for phishing
   */
  async analyzeQRImage(imageFile: Blob | File): Promise<QRPhishingAnalysis> {
    const timestamp = new Date().toISOString();

    try {
      // Step 1: Decode QR code to extract URL
      const decodedURL = await decodeQRFromImage(imageFile);

      if (!decodedURL) {
        return {
          decodedURL: null,
          urlAnalysis: null,
          isPhishing: false,
          confidence: 0,
          threatLevel: 'low',
          indicators: ['qr_decode_failed'],
          riskScore: 0,
          timestamp
        };
      }

      // Step 2: Check if decoded content looks like URL
      const isURLContent = this.isValidURLContent(decodedURL);

      if (!isURLContent) {
        // Could be contact info, Wi-Fi, SMS, or other QR content
        return {
          decodedURL,
          urlAnalysis: null,
          isPhishing: false,
          confidence: 0.3,
          threatLevel: 'low',
          indicators: ['non_url_qr_content'],
          riskScore: 10,
          timestamp
        };
      }

      // Step 3: Analyze URL for phishing indicators
      const urlAnalysis = this.urlModel.analyzeURL(decodedURL);

      // Step 4: Determine threat level
      const threatLevel = this.determineThreatLevel(
        urlAnalysis.score,
        urlAnalysis.indicators
      );

      return {
        decodedURL,
        urlAnalysis,
        isPhishing: urlAnalysis.isPhishing,
        confidence: urlAnalysis.confidence,
        threatLevel,
        indicators: [
          ...new Set([
            ...urlAnalysis.indicators,
            'qr_decoded_successfully'
          ])
        ],
        riskScore: urlAnalysis.score,
        timestamp
      };
    } catch (error) {
      console.error('QR phishing analysis error:', error);
      return {
        decodedURL: null,
        urlAnalysis: null,
        isPhishing: false,
        confidence: 0,
        threatLevel: 'low',
        indicators: ['analysis_error'],
        riskScore: 0,
        timestamp
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
   */
  async analyzeQRFromData(decodedData: string): Promise<QRPhishingAnalysis> {
    const timestamp = new Date().toISOString();

    try {
      // Check if decoded content looks like URL
      const isURLContent = this.isValidURLContent(decodedData);

      if (!isURLContent) {
        // Could be contact info, Wi-Fi, SMS, or other QR content
        return {
          decodedURL: decodedData,
          urlAnalysis: null,
          isPhishing: false,
          confidence: 0.3,
          threatLevel: 'low',
          indicators: ['non_url_qr_content'],
          riskScore: 10,
          timestamp
        };
      }

      // Analyze URL for phishing indicators
      const urlAnalysis = this.urlModel.analyzeURL(decodedData);

      // Determine threat level
      const threatLevel = this.determineThreatLevel(
        urlAnalysis.score,
        urlAnalysis.indicators
      );

      const combinedIndicators = [
        ...urlAnalysis.indicators,
        'qr_decoded_successfully'
      ];

      return {
        decodedURL: decodedData,
        urlAnalysis,
        isPhishing: urlAnalysis.isPhishing,
        confidence: urlAnalysis.confidence,
        threatLevel,
        indicators: [...new Set(combinedIndicators)],
        riskScore: urlAnalysis.score,
        timestamp
      };
    } catch (error) {
      console.error('QR data analysis error:', error);
      return {
        decodedURL: decodedData,
        urlAnalysis: null,
        isPhishing: false,
        confidence: 0,
        threatLevel: 'low',
        indicators: ['analysis_error'],
        riskScore: 0,
        timestamp
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
      console.error('QR URL analysis error:', error);
      return {
        decodedURL: null,
        urlAnalysis: null,
        isPhishing: false,
        confidence: 0,
        threatLevel: 'low',
        indicators: ['url_fetch_error'],
        riskScore: 0,
        timestamp: new Date().toISOString()
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
   * Check if decoded content is a URL
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
