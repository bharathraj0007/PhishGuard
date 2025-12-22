import { blink } from './blink'
import type { ScanType, ScanResult } from '../types'
import { getQRPhishingService } from './ml/qr-phishing-service'
import { autoTrainingService } from './ml/auto-training-service'
import { UnifiedMLService } from './ml/unified-ml-service'

/**
 * Calculate confidence score based on threat level and risk score
 * - SAFE: confidence = (100 - riskScore) normalized to 85-99%
 * - SUSPICIOUS: confidence = 60-80% based on risk score
 * - DANGEROUS: confidence = 85-99% based on risk score
 */
function calculateConfidence(threatLevel: 'safe' | 'suspicious' | 'dangerous', riskScore: number): number {
  let confidence: number
  
  if (threatLevel === 'safe') {
    // For safe content, low risk = high confidence
    // riskScore 0-29 maps to confidence 85-99%
    const safetyScore = 100 - riskScore
    confidence = Math.round(85 + (safetyScore / 100) * 14)
  } else if (threatLevel === 'suspicious') {
    // For suspicious content, moderate confidence (60-80%)
    // riskScore 30-49 maps to confidence 60-80%
    const normalizedRisk = (riskScore - 30) / 20
    confidence = Math.round(60 + normalizedRisk * 20)
  } else {
    // For dangerous content, high confidence (85-99%)
    // riskScore 50-100 maps to confidence 85-99%
    const normalizedRisk = Math.min((riskScore - 50) / 50, 1)
    confidence = Math.round(85 + normalizedRisk * 14)
  }
  
  // Ensure confidence is within valid range (60-99)
  return Math.max(60, Math.min(99, confidence))
}

/**
 * Analyze content for phishing threats.
 *
 * Strategy:
 * 1. Auto-train ML models on first scan (silent, non-intrusive)
 * 2. Use ML models for prediction if available
 * 3. Fall back to heuristic analysis if ML fails or not ready
 */
export async function analyzeContent(content: string, scanType: ScanType): Promise<ScanResult> {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Content is required')

  // Auto-train model if needed (non-blocking, transparent to user)
  try {
    await autoTrainingService.ensureModelTrained(scanType)
  } catch (error) {
    console.warn(`Auto-training warning for ${scanType}:`, error)
    // Continue with fallback heuristics if training fails
  }

  // Try ML prediction first
  try {
    const mlService = new UnifiedMLService()
    const mlResult = await mlService.predict(trimmed, scanType)
    
    return {
      threatLevel: mlResult.threatLevel,
      confidence: mlResult.confidence,
      indicators: mlResult.indicators,
      analysis: mlResult.analysis,
      recommendations: mlResult.recommendations,
    }
  } catch (mlError) {
    console.warn(`ML prediction failed for ${scanType}, falling back to heuristics:`, mlError)
  }

  // Fall back to heuristic analysis
  switch (scanType) {
    case 'url':
      return analyzeURLLocal(trimmed)
    case 'email':
      return analyzeEmailLocal(trimmed)
    case 'sms':
      return analyzeSMSLocal(trimmed)
    case 'qr':
      // QR image scanning is handled in the Scanner component; here we only handle QR text/URL.
      return analyzeQRLocal(trimmed)
    default:
      throw new Error(`Unknown scan type: ${scanType}`)
  }
}

function analyzeURLLocal(url: string): ScanResult {
  const indicators: string[] = []
  let riskScore = 0

  if (/^https:\/\//i.test(url)) {
    indicators.push('✓ HTTPS connection (secure)')
  } else if (/^http:\/\//i.test(url)) {
    indicators.push('⚠️ HTTP connection (not encrypted)')
    riskScore += 15
  } else {
    indicators.push('⚠️ URL missing protocol (http/https)')
    riskScore += 10
  }

  if (/bit\.ly|tinyurl|goo\.gl|short\.link|t\.co|ow\.ly|buff\.ly/i.test(url)) {
    indicators.push('⚠️ Shortened URL detected')
    riskScore += 20
  }

  if (/(?:\d{1,3}\.){3}\d{1,3}/.test(url)) {
    indicators.push('🔴 IP address used instead of domain')
    riskScore += 25
  }

  const dotCount = (url.match(/\./g) || []).length
  if (dotCount > 3) {
    indicators.push('⚠️ Multiple subdomains (possible spoofing)')
    riskScore += 15
  }

  if (/[_\-\%\@\#\$]/.test(url)) {
    indicators.push('🟡 Special characters in URL')
    riskScore += 10
  }

  if (/\.(tk|ml|ga|cf|info|biz|pw)(\/|$)/i.test(url)) {
    indicators.push('⚠️ Unusual TLD detected')
    riskScore += 15
  }

  if (url.length > 100) {
    indicators.push('⚠️ Unusually long URL')
    riskScore += 10
  }

  const threatLevel = riskScore >= 50 ? 'dangerous' : riskScore >= 30 ? 'suspicious' : 'safe'
  const confidence = calculateConfidence(threatLevel, riskScore)

  return {
    threatLevel,
    confidence,
    indicators: indicators.length ? indicators : ['✓ No obvious phishing patterns'],
    analysis: `URL pattern analysis (Confidence: ${confidence}%). ${
      threatLevel === 'dangerous'
        ? 'Multiple high-risk indicators detected.'
        : threatLevel === 'suspicious'
          ? 'Some suspicious patterns found.'
          : 'URL appears legitimate based on pattern analysis.'
    }`,
    recommendations:
      threatLevel === 'dangerous'
        ? ['❌ Do not click this link', '📧 Report to the sender or security team', '🛡️ Verify with the official website directly']
        : ['✓ Exercise caution', '⚠️ Verify sender identity', '🔍 Check for typosquatting in the domain'],
  }
}

function analyzeEmailLocal(content: string): ScanResult {
  const indicators: string[] = []
  let riskScore = 0
  const lower = content.toLowerCase()

  if (/urgent|immediate|asap|expires|limited|act now|right away/i.test(lower)) {
    indicators.push('🟡 Urgency tactics detected')
    riskScore += 15
  }

  if (/verify.*account|confirm.*identity|update.*payment|re-?enter|re-?confirm|verify.*password/i.test(lower)) {
    indicators.push('🔴 Account verification request')
    riskScore += 25
  }

  if (/click.*here|click.*link|open.*attachment|download.*file|update.*now|confirm.*here/i.test(lower)) {
    indicators.push('⚠️ Call-to-action with link/attachment')
    riskScore += 20
  }

  if (/dear (customer|user|valued|member)|to whom it may concern|dear sir|dear madam/i.test(lower)) {
    indicators.push('🟡 Generic greeting detected')
    riskScore += 10
  }

  if (/account.*suspended|locked|disabled|unauthorized|compromise|suspicious/i.test(lower)) {
    indicators.push('🔴 Threat language detected')
    riskScore += 20
  }

  if (/bank|card|credit|payment|refund|transfer|wire/i.test(lower)) {
    indicators.push('🔴 Financial information request')
    riskScore += 20
  }

  if (/noreply|donotreply|no-?reply|no_?reply/i.test(lower)) {
    indicators.push('⚠️ Automated no-reply sender')
    riskScore += 10
  }

  if (/won|prize|reward|congratulations|claim|lottery|contest/i.test(lower)) {
    indicators.push('🟡 Prize/reward offer detected')
    riskScore += 15
  }

  const threatLevel = riskScore >= 50 ? 'dangerous' : riskScore >= 30 ? 'suspicious' : 'safe'
  const confidence = calculateConfidence(threatLevel, riskScore)

  return {
    threatLevel,
    confidence,
    indicators: indicators.length ? indicators : ['✓ No obvious phishing indicators'],
    analysis: `Email pattern analysis (Confidence: ${confidence}%). ${
      threatLevel === 'dangerous'
        ? 'Strong phishing indicators detected.'
        : threatLevel === 'suspicious'
          ? 'Moderate phishing patterns identified.'
          : 'Email appears legitimate based on content analysis.'
    }`,
    recommendations:
      threatLevel === 'dangerous'
        ? ['❌ Do not click links or open attachments', '📧 Contact the sender via official channels', '🗑️ Delete the email if unsure']
        : ['✓ Email appears safe', '⚠️ Verify important requests independently', '🔍 Check the sender address carefully'],
  }
}

function analyzeSMSLocal(smsContent: string): ScanResult {
  const indicators: string[] = []
  let riskScore = 0
  const lower = smsContent.toLowerCase()

  if (/click|tap|download|install|confirm|verify|update|open/i.test(lower)) {
    indicators.push('⚠️ Action request detected')
    riskScore += 15
  }

  if (/urgent|immediate|expires|limited|asap|now|quickly|right away/i.test(lower)) {
    indicators.push('🟡 Urgency language detected')
    riskScore += 15
  }

  if (/confirm.*identity|verify.*account|update.*payment|card.*verify|account.*confirm/i.test(lower)) {
    indicators.push('🔴 Account/payment verification request')
    riskScore += 25
  }

  if (/bank|card|payment|transfer|wire|credit|atm|pin|cvv/i.test(lower)) {
    indicators.push('🔴 Financial information request')
    riskScore += 20
  }

  if (/prize|won|free|reward|claim|bonus|gift|congratulations|selected/i.test(lower)) {
    indicators.push('🟡 Too-good-to-be-true offer')
    riskScore += 15
  }

  if (/ssn|social security|password|pin|code|otp|2fa|authentication/i.test(lower)) {
    indicators.push('🔴 Identity/credential request')
    riskScore += 25
  }

  if (/delivery|shipment|package|parcel|customs|ups|fedex|dhl|tracking/i.test(lower)) {
    indicators.push('🟡 Delivery/shipment notification')
    riskScore += 12
  }

  if (smsContent.trim().length < 20) {
    indicators.push('⚠️ Very short message')
    riskScore += 10
  }

  const threatLevel = riskScore >= 50 ? 'dangerous' : riskScore >= 30 ? 'suspicious' : 'safe'
  const confidence = calculateConfidence(threatLevel, riskScore)

  return {
    threatLevel,
    confidence,
    indicators: indicators.length ? indicators : ['✓ No obvious phishing patterns'],
    analysis: `SMS pattern analysis (Confidence: ${confidence}%). ${
      threatLevel === 'dangerous'
        ? 'High phishing probability detected.'
        : threatLevel === 'suspicious'
          ? 'Moderate phishing indicators present.'
          : 'SMS appears legitimate based on text analysis.'
    }`,
    recommendations:
      threatLevel === 'dangerous'
        ? ['❌ Do not click links', '📞 Contact the organization directly', '🗑️ Delete the message immediately']
        : ['✓ SMS appears safe', '⚠️ Still verify important requests', '🔍 Be cautious of unexpected messages'],
  }
}

async function analyzeQRLocal(content: string): Promise<ScanResult> {
  // Prefer the dedicated QR service for richer scoring when available.
  try {
    const qrService = getQRPhishingService()
    const analysis = await qrService.analyzeQRFromData(content)

    return {
      threatLevel:
        analysis.threatLevel === 'critical' || analysis.threatLevel === 'high'
          ? 'dangerous'
          : analysis.threatLevel === 'medium'
            ? 'suspicious'
            : 'safe',
      confidence: Math.round(analysis.confidence * 100),
      indicators: analysis.indicators,
      analysis: `QR decoded to: ${analysis.decodedURL || 'unknown'}\nRisk Score: ${analysis.riskScore}/100`,
      recommendations: analysis.isPhishing
        ? ['Do not scan this QR code', 'Report suspicious QR codes', 'Verify destination before scanning']
        : ['QR appears safe', 'Verify destination URL', 'Be cautious of unexpected QR codes'],
    }
  } catch {
    // Minimal QR heuristics
    const indicators: string[] = []
    let riskScore = 0

    if (!/^https?:\/\//i.test(content)) {
      indicators.push('⚠️ QR does not decode to a valid URL')
      riskScore += 15
    }

    if (/bit\.ly|tinyurl|goo\.gl|short\.link|t\.co|ow\.ly/i.test(content)) {
      indicators.push('⚠️ QR leads to shortened URL')
      riskScore += 20
    }

    if (/(?:\d{1,3}\.){3}\d{1,3}/.test(content)) {
      indicators.push('🔴 QR leads to IP address')
      riskScore += 25
    }

    if (/amaz0n|g00gle|microsft|paypa1/i.test(content)) {
      indicators.push('🔴 Potential domain typosquatting')
      riskScore += 25
    }

    if (/\.(tk|ml|ga|cf|pw)(\/|$)/i.test(content)) {
      indicators.push('⚠️ Unusual TLD in QR destination')
      riskScore += 15
    }

    const threatLevel = riskScore >= 50 ? 'dangerous' : riskScore >= 30 ? 'suspicious' : 'safe'
    const confidence = calculateConfidence(threatLevel, riskScore)

    return {
      threatLevel,
      confidence,
      indicators: indicators.length ? indicators : ['✓ QR appears safe'],
      analysis: `QR URL analysis (Confidence: ${confidence}%). Decoded content: ${content}.`,
      recommendations:
        threatLevel === 'dangerous'
          ? ['❌ Do not scan this QR code', '⚠️ Report suspicious QR codes', '🔍 Verify destination first']
          : ['✓ QR appears safe', '⚠️ Still verify destination', '🔍 Be cautious with unexpected QR codes'],
    }
  }
}

export async function saveScan(
  userId: string,
  scanType: ScanType,
  content: string,
  result: ScanResult
): Promise<void> {
  const scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const now = new Date().toISOString()

  await blink.db.phishingScans.create({
    id: scanId,
    userId,
    scanType,
    content: content.substring(0, 500),
    threatLevel: result.threatLevel,
    confidence: result.confidence,
    indicators: JSON.stringify(result.indicators),
    analysis: result.analysis,
    createdAt: now,
    updatedAt: now,
  })
}

export async function getUserScans(userId: string, limit: number = 20) {
  const scans = await blink.db.phishingScans.list({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    limit,
  })

  return scans.map((scan: any) => ({
    ...scan,
    indicators: typeof scan.indicators === 'string' ? JSON.parse(scan.indicators) : (scan.indicators ?? []),
  }))
}
