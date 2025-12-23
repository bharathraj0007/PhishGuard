/**
 * API Client for ML-based Phishing Detection Backend
 * 
 * This module provides a clean interface to interact with the backend
 * ML inference edge function for phishing detection.
 */

import type { ScanType, ScanResult } from '../types'

const ML_SCAN_API_URL = 'https://eky2mdxr--ml-phishing-scan.functions.blink.new'
const SMS_ML_DETECTOR_URL = 'https://eky2mdxr--sms-ml-detector.functions.blink.new'
const ANALYZE_PHISHING_URL = 'https://eky2mdxr--analyze-phishing.functions.blink.new'

export interface MLScanRequest {
  content?: string
  scanType: ScanType
  userId?: string
  imageData?: string // Base64 for QR images
  saveToHistory?: boolean
}

export interface MLScanResponse {
  success: boolean
  result: {
    isPhishing: boolean
    confidenceScore: number // Backend returns this, but it's phishing probability (0-100)
    threatLevel: 'safe' | 'suspicious' | 'dangerous'
    indicators: string[]
    analysis: string
    recommendations: string[]
    scanType: ScanType
    mlModel: string
    decodedContent?: string
  }
  timestamp: string
}

/**
 * Scan content for phishing using backend ML models
 * 
 * IMPORTANT: Backend confidenceScore is actually phishing probability (0-100)
 * We need to convert it to proper confidence and risk score:
 * - riskScore = phishing probability
 * - confidence = depends on threat classification
 */
export async function scanContentML(request: MLScanRequest): Promise<ScanResult> {
  try {
    const response = await fetch(ML_SCAN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to scan content')
    }

    const data: MLScanResponse = await response.json()
    
    // Backend confidenceScore is phishing probability (0-100)
    const phishingProbability = data.result.confidenceScore
    const threatLevel = data.result.threatLevel
    
    // Calculate proper confidence based on threat classification
    let confidence: number
    if (threatLevel === 'safe') {
      // Safe content: confidence = certainty it's safe (100 - phishing probability)
      confidence = Math.round(100 - phishingProbability)
    } else if (threatLevel === 'suspicious' || threatLevel === 'dangerous') {
      // Dangerous/suspicious: confidence = phishing probability itself
      confidence = Math.round(phishingProbability)
    } else {
      confidence = 50
    }
    
    // Update analysis text to show phishing probability instead of risk score
    let analysis = data.result.analysis
    analysis = analysis.replace(/Risk score: \d+\/100/gi, `Phishing probability: ${Math.round(phishingProbability)}%`)

    // Convert backend response to ScanResult format
    return {
      threatLevel: threatLevel,
      confidence: confidence,
      indicators: data.result.indicators,
      analysis: analysis,
      recommendations: data.result.recommendations,
    }
  } catch (error) {
    console.error('ML scan API error:', error)
    throw error
  }
}

/**
 * Scan email for phishing
 */
export async function scanEmail(
  emailContent: string,
  userId?: string,
  saveToHistory = false
): Promise<ScanResult> {
  return scanContentML({
    content: emailContent,
    scanType: 'email',
    userId,
    saveToHistory,
  })
}

/**
 * Scan SMS for phishing using backend ML analysis
 * 
 * Uses the analyze-phishing endpoint with Bi-LSTM pattern detection
 * for SMS text analysis. Server-side processing only.
 */
export async function scanSMS(
  smsContent: string,
  userId?: string,
  saveToHistory = false
): Promise<ScanResult> {
  console.log('📱 [scanSMS] Starting backend SMS analysis')
  
  try {
    console.log('📱 [scanSMS] Calling analyze-phishing endpoint for SMS detection')
    const response = await fetch(ANALYZE_PHISHING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: smsContent,
        scanType: 'sms',
        userId,
        saveToHistory,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn('📱 [scanSMS] API returned non-OK status:', response.status, errorData)
      throw new Error(errorData.error || `SMS analysis failed with status ${response.status}`)
    }

    const data = await response.json()
    console.log('📱 [scanSMS] API response:', data)

    if (!data.success || !data.result) {
      throw new Error('Invalid response from SMS analysis API')
    }

    const result = data.result
    const scanResult: ScanResult = {
      threatLevel: result.threatLevel,
      confidence: result.confidence,
      indicators: result.indicators || [],
      analysis: result.analysis || 'SMS analyzed for phishing patterns',
      recommendations: result.recommendations || [],
    }

    console.log('✅ [scanSMS] SMS analysis completed successfully')
    return scanResult
  } catch (error) {
    console.error('❌ [scanSMS] SMS analysis failed:', error)
    throw error
  }
}

/**
 * Scan URL for phishing
 */
export async function scanURL(
  url: string,
  userId?: string,
  saveToHistory = false
): Promise<ScanResult> {
  return scanContentML({
    content: url,
    scanType: 'url',
    userId,
    saveToHistory,
  })
}

/**
 * Scan QR code image for phishing
 */
export async function scanQRImage(
  imageData: string,
  userId?: string,
  saveToHistory = false
): Promise<ScanResult> {
  return scanContentML({
    imageData,
    scanType: 'qr',
    userId,
    saveToHistory,
  })
}

/**
 * Convert File to base64 for QR image upload
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
