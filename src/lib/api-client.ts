/**
 * API Client for ML-based Phishing Detection Backend
 * 
 * This module provides a clean interface to interact with the backend
 * ML inference edge function for phishing detection.
 */

import type { ScanType, ScanResult } from '../types'

const ML_SCAN_API_URL = 'https://eky2mdxr--ml-phishing-scan.functions.blink.new'

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
    confidenceScore: number
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

    // Convert backend response to ScanResult format
    return {
      threatLevel: data.result.threatLevel,
      confidence: data.result.confidenceScore,
      indicators: data.result.indicators,
      analysis: data.result.analysis,
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
 * Scan SMS for phishing
 */
export async function scanSMS(
  smsContent: string,
  userId?: string,
  saveToHistory = false
): Promise<ScanResult> {
  return scanContentML({
    content: smsContent,
    scanType: 'sms',
    userId,
    saveToHistory,
  })
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
