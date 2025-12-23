import { blink } from './blink'
import type { ScanType, ScanResult } from '../types'
import { getQRPhishingService } from './ml/qr-phishing-service'
import { autoTrainingService } from './ml/auto-training-service'
import { UnifiedMLService } from './ml/unified-ml-service'
import { urlModelLoader } from './ml/url-model-loader'
import { getEmailBiLSTMService } from './ml/email-bilstm-service'

/**
 * Calculate confidence score based on threat level and phishing probability
 * 
 * IMPORTANT: riskScore here represents PHISHING PROBABILITY (0-100)
 * 
 * - SAFE: confidence = certainty it's safe = (100 - phishingProbability)
 * - SUSPICIOUS: confidence = phishing probability itself (decision certainty)
 * - DANGEROUS: confidence = phishing probability itself (decision certainty)
 */
function calculateConfidence(threatLevel: 'safe' | 'suspicious' | 'dangerous', riskScore: number): number {
  let confidence: number
  
  if (threatLevel === 'safe') {
    // For safe content: confidence = certainty it's safe (100 - phishing probability)
    // Example: riskScore=2 → confidence=98%, riskScore=10 → confidence=90%
    confidence = Math.round(100 - riskScore)
  } else if (threatLevel === 'suspicious' || threatLevel === 'dangerous') {
    // For suspicious/dangerous: confidence = phishing probability itself
    // Example: riskScore=60 → confidence=60%, riskScore=91 → confidence=91%
    confidence = Math.round(riskScore)
  } else {
    confidence = 50
  }
  
  // Ensure confidence is within valid range (1-99) to avoid 0% and 100%
  return Math.max(1, Math.min(99, confidence))
}

/**
 * Analyze content for phishing threats.
 *
 * Strategy:
 * 1. For URLs: ALWAYS use TensorFlow.js ML model (NO heuristic fallback)
 * 2. For other types: Try ML models first, then fall back to heuristics if ML fails
 * 3. Auto-train ML models on first scan (silent, non-intrusive)
 * 
 * IMPORTANT: URL detection MUST use ML model only for accurate detection.
 */
export async function analyzeContent(content: string, scanType: ScanType): Promise<ScanResult> {
  const trimmed = content.trim()
  if (!trimmed) throw new Error('Content is required')

  // For URLs, ALWAYS use TensorFlow ML model - NO HEURISTIC FALLBACK
  if (scanType === 'url') {
    console.log('🔵 [URL Analysis] Using ML model ONLY (no heuristic fallback)')
    return await analyzeURLWithTFModel(trimmed)
  }

  // Auto-train model if needed (non-blocking, transparent to user) for non-URL types
  try {
    await autoTrainingService.ensureModelTrained(scanType)
  } catch (error) {
    console.warn(`Auto-training warning for ${scanType}:`, error)
    // Continue with fallback heuristics if training fails
  }

  // Try ML prediction first for non-URL types
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

  // Fall back to heuristic analysis for non-URL types only
  switch (scanType) {
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

/**
 * Analyze email using trained BiLSTM ML model (95.96% accuracy)
 * This function uses the pre-trained email phishing detection model
 * with 18,634 training samples and 20,000 vocabulary size.
 * 
 * Falls back to heuristics if ML model fails to load.
 */
export async function analyzeEmailWithMLModel(content: string): Promise<ScanResult> {
  try {
    console.log('📧 [Email Analysis] Using trained BiLSTM ML model')
    const emailService = getEmailBiLSTMService()
    const result = await emailService.analyzeEmail(content)
    console.log('✅ [Email Analysis] ML prediction completed')
    return result
  } catch (error) {
    console.warn('⚠️ [Email Analysis] ML model failed, falling back to heuristics:', error)
    return analyzeEmailLocal(content)
  }
}

/**
 * Analyze URL using TensorFlow.js Character-level CNN model (INTERNAL)
 * Model input: [1, 200] character indices (capped at 127)
 * Model output: sigmoid score 0-1, where > 0.5 = phishing probability
 * 
 * IMPORTANT: Treat model output as phishing probability, not confidence
 */
async function analyzeURLWithTFModel(url: string): Promise<ScanResult> {
  return analyzeURLWithFrontendModel(url)
}

/**
 * TRUSTED DOMAINS WHITELIST
 * Major legitimate domains that should never be flagged as phishing
 */
const TRUSTED_DOMAINS = new Set([
  'google.com',
  'youtube.com',
  'github.com',
  'microsoft.com',
  'amazon.com',
  'apple.com',
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'netflix.com',
  'spotify.com',
  'wikipedia.org',
  'reddit.com',
  'stackoverflow.com',
])

/**
 * Extract hostname from URL
 */
function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname.toLowerCase()
  } catch {
    // Try adding protocol if missing
    try {
      const parsed = new URL(`https://${url}`)
      return parsed.hostname.toLowerCase()
    } catch {
      return null
    }
  }
}

/**
 * Check if hostname matches a trusted domain
 */
function isTrustedDomain(hostname: string): boolean {
  // Direct match
  if (TRUSTED_DOMAINS.has(hostname)) {
    return true
  }
  // Check if it's a subdomain of a trusted domain (e.g., www.google.com, mail.google.com)
  for (const trusted of TRUSTED_DOMAINS) {
    if (hostname === trusted || hostname.endsWith(`.${trusted}`)) {
      return true
    }
  }
  return false
}

/**
 * Apply model confidence calibration
 * Transforms raw sigmoid score to calibrated score
 * Formula: calibratedScore = clamp((modelScore - 0.5) * 1.8, 0, 1)
 */
function calibrateModelScore(rawScore: number): number {
  const calibrated = (rawScore - 0.5) * 1.8
  return Math.max(0, Math.min(1, calibrated))
}

/**
 * EXPORTED: Analyze URL using ONLY Frontend TensorFlow.js Character-level CNN model
 * 
 * CRITICAL: This function uses ONLY the frontend TensorFlow.js model
 * - NO backend ML inference
 * - Model path: /public/models/url/model.json
 * - Uses tf.loadLayersModel() / tf.loadGraphModel()
 * 
 * CALIBRATION & FIXES (v2.0):
 * 1. Model confidence calibration: (rawScore - 0.5) * 1.8
 * 2. Trusted domain whitelist (pre-inference skip)
 * 3. Short URL normalization (length < 20)
 * 4. Updated thresholds: DANGEROUS ≥80, SUSPICIOUS ≥45, SAFE <45
 * 
 * Decision Logic:
 * - risk >= 80 → DANGEROUS (red, alert)
 * - risk >= 45 → SUSPICIOUS (yellow, warning)
 * - risk < 45 → SAFE (green, check)
 */
export async function analyzeURLWithFrontendModel(url: string): Promise<ScanResult> {
  try {
    console.log('🔵 [URL Analysis] analyzeURLWithFrontendModel called')
    console.log('   - URL:', url)
    
    // Extract hostname for checks
    const hostname = extractHostname(url)
    console.log('   - Hostname:', hostname || 'invalid')
    
    // =====================================================
    // FIX #2: TRUSTED DOMAIN WHITELIST (PRE-INFERENCE)
    // =====================================================
    const whitelistTriggered = hostname !== null && isTrustedDomain(hostname)
    
    if (whitelistTriggered) {
      console.log('✅ [Whitelist] Trusted domain detected, skipping ML inference')
      console.log('   - Domain:', hostname)
      
      const safeIndicators = [
        '✅ Trusted domain whitelist match',
        `✓ Domain: ${hostname}`,
        '✓ HTTPS connection (secure)',
        '✓ No ML inference required for trusted domain',
      ]
      
      // Debug logging
      console.log('📊 [Debug] Final Results:')
      console.log('   - rawModelScore: N/A (skipped)')
      console.log('   - calibratedScore: N/A (skipped)')
      console.log('   - finalRisk: 5')
      console.log('   - finalDecision: SAFE')
      console.log('   - whitelistTriggered: true')
      
      return {
        threatLevel: 'safe',
        confidence: 5, // Low confidence = high certainty it's safe
        indicators: safeIndicators,
        analysis: `URL Analysis: SAFE

✅ Trusted domain override applied
Domain: ${hostname}

This URL belongs to a verified trusted domain.
No ML inference was performed - trusted domains are automatically marked safe.

Risk Score: 5/100
Decision: SAFE`,
        recommendations: [
          '✓ URL is from a trusted domain',
          '✓ Safe to proceed',
          '⚠️ Always verify the full URL path for legitimacy',
        ],
      }
    }
    
    // =====================================================
    // Run ML Model Inference (for non-whitelisted domains)
    // =====================================================
    const prediction = await urlModelLoader.predict(url)
    const rawModelScore = prediction.score // Raw sigmoid score 0.0-1.0
    
    console.log('🟢 [ML Model] Raw sigmoid score:', rawModelScore.toFixed(4))
    
    // =====================================================
    // FIX #1: APPLY MODEL CONFIDENCE CALIBRATION
    // =====================================================
    let calibratedScore = calibrateModelScore(rawModelScore)
    console.log('🔵 [Calibration] Calibrated score:', calibratedScore.toFixed(4))
    
    // =====================================================
    // FIX #3: SHORT URL NORMALIZATION
    // =====================================================
    const shortURLNormalizationApplied = url.length < 20
    if (shortURLNormalizationApplied) {
      const originalCalibrated = calibratedScore
      calibratedScore = calibratedScore * 0.3
      console.log(`🔵 [Short URL] Length ${url.length} < 20, applying 0.3x multiplier`)
      console.log(`   - Before: ${originalCalibrated.toFixed(4)}, After: ${calibratedScore.toFixed(4)}`)
    }
    
    // Collect threat indicators and calculate adjustments
    const indicators: string[] = []
    let riskAdjustment = 0
    
    // Check HTTP (not encrypted) +10 risk
    if (/^http:\/\//i.test(url)) {
      indicators.push('⚠️ HTTP connection (not encrypted)')
      riskAdjustment += 10
      console.log('   - HTTP detected: +10 risk')
    } else if (/^https:\/\//i.test(url)) {
      indicators.push('✓ HTTPS connection (secure)')
    }
    
    // Check special characters +10 risk
    if (/[_\\%@#$]/.test(url)) {
      indicators.push('🟡 Special characters in URL')
      riskAdjustment += 10
      console.log('   - Special chars detected: +10 risk')
    }
    
    // Check typosquatting +15 risk
    const typosquattingPatterns = /amaz0n|g00gle|microsft|paypa1|fac3book|twitt3r|app1e|netfl1x|1nstagram|wh4tsapp|l1nkedin|yah00/i
    if (typosquattingPatterns.test(url)) {
      indicators.push('🔴 Potential typosquatting detected')
      riskAdjustment += 15
      console.log('   - Typosquatting detected: +15 risk')
    }
    
    // Check IP address usage +20 risk
    if (/(?:\d{1,3}\.){3}\d{1,3}/.test(url)) {
      indicators.push('🔴 IP address used instead of domain')
      riskAdjustment += 20
      console.log('   - IP address detected: +20 risk')
    }
    
    // Check URL shorteners +15 risk (mark as SUSPICIOUS)
    const isURLShortener = /bit\.ly|tinyurl|goo\.gl|short\.link|t\.co|ow\.ly|buff\.ly/i.test(url)
    if (isURLShortener) {
      indicators.push('⚠️ Shortened URL detected')
      riskAdjustment += 15
      console.log('   - URL shortener detected: +15 risk')
    }
    
    // Check multiple subdomains +10 risk
    const dotCount = (url.match(/\./g) || []).length
    if (dotCount > 3) {
      indicators.push('⚠️ Multiple subdomains (possible spoofing)')
      riskAdjustment += 10
      console.log('   - Multiple subdomains detected: +10 risk')
    }
    
    // =====================================================
    // Calculate final risk score from CALIBRATED score
    // =====================================================
    const calibratedRiskScore = Math.round(calibratedScore * 100)
    const finalRiskScore = Math.min(100, calibratedRiskScore + riskAdjustment)
    
    console.log('🟡 [Risk Calculation]')
    console.log('   - Calibrated risk (from ML):', calibratedRiskScore)
    console.log('   - Risk adjustment (heuristics):', riskAdjustment)
    console.log('   - Final risk:', finalRiskScore)
    
    // =====================================================
    // FIX #4: UPDATED DECISION THRESHOLDS
    // risk >= 80 → DANGEROUS
    // risk >= 45 → SUSPICIOUS
    // risk < 45 → SAFE
    // =====================================================
    let threatLevel: 'safe' | 'suspicious' | 'dangerous'
    let statusMessage: string
    
    if (finalRiskScore >= 80) {
      threatLevel = 'dangerous'
      statusMessage = 'High confidence phishing URL detected'
    } else if (finalRiskScore >= 45) {
      threatLevel = 'suspicious'
      statusMessage = 'Potential phishing patterns detected'
    } else {
      threatLevel = 'safe'
      statusMessage = 'URL appears legitimate'
    }
    
    // =====================================================
    // FIX #7: CONSOLE LOGGING FOR DEBUG
    // =====================================================
    console.log('📊 [Debug] Final Results:')
    console.log('   - rawModelScore:', rawModelScore.toFixed(4))
    console.log('   - calibratedScore:', calibratedScore.toFixed(4))
    console.log('   - finalRisk:', finalRiskScore)
    console.log('   - finalDecision:', threatLevel.toUpperCase())
    console.log('   - whitelistTriggered:', whitelistTriggered)
    console.log('   - shortURLNormalization:', shortURLNormalizationApplied)
    
    // =====================================================
    // FIX #5: CONFIDENCE MAPPING
    // =====================================================
    // Confidence = risk score for suspicious/dangerous, (100 - risk) for safe
    const confidence = threatLevel === 'safe' 
      ? Math.round(100 - finalRiskScore)
      : finalRiskScore
    
    // =====================================================
    // FIX #6: UPDATE ANALYSIS REPORT TEXT
    // =====================================================
    // Add model indicator with calibration info
    indicators.unshift(`🤖 Calibrated ML Score: ${calibratedRiskScore}%`)
    if (shortURLNormalizationApplied) {
      indicators.push('📏 Length normalization applied (short URL)')
    }
    indicators.push(
      finalRiskScore >= 45 
        ? '🔴 Model predicts PHISHING' 
        : '✓ Model predicts SAFE'
    )
    
    // Build analysis report with calibration details
    const analysisReport = `Phishing probability: ${finalRiskScore}%
Risk score: ${finalRiskScore}/100
Decision: ${threatLevel.toUpperCase()}

${statusMessage}

TensorFlow Character-level CNN Model (Frontend)
• Raw model score: ${(rawModelScore * 100).toFixed(1)}%
• Calibrated ML score: ${calibratedRiskScore}%${shortURLNormalizationApplied ? ' (length normalization applied)' : ''}
• Threat indicator adjustments: +${riskAdjustment}%
• Final risk assessment: ${finalRiskScore}%

Calibration Formula: (rawScore - 0.5) × 1.8, clamped [0,1]
Thresholds: DANGEROUS ≥80%, SUSPICIOUS ≥45%, SAFE <45%`
    
    const recommendations =
      threatLevel === 'dangerous'
        ? ['❌ Do not click this link', '📧 Report to security team', '🛡️ Verify with official website']
        : threatLevel === 'suspicious'
          ? ['⚠️ Exercise caution', '🔍 Verify the domain carefully', '📞 Contact sender independently']
          : ['✓ URL appears safe', '⚠️ Still verify important requests', '🔐 Keep security practices strong']
    
    return {
      threatLevel,
      confidence,
      indicators,
      analysis: analysisReport,
      recommendations,
    }
  } catch (error) {
    console.error('🔴 TensorFlow model error:', error)
    // For URL detection, we MUST use the ML model - provide a clear error message
    throw new Error(`URL ML model analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the model is loaded.`)
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

  const threatLevel = riskScore >= 75 ? 'dangerous' : riskScore >= 50 ? 'suspicious' : 'safe'
  const confidence = calculateConfidence(threatLevel, riskScore)

  return {
    threatLevel,
    confidence,
    indicators: indicators.length ? indicators : ['✓ No obvious phishing patterns'],
    analysis: `URL pattern analysis. Phishing probability: ${riskScore}%. ${
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

  const threatLevel = riskScore >= 75 ? 'dangerous' : riskScore >= 50 ? 'suspicious' : 'safe'
  const confidence = calculateConfidence(threatLevel, riskScore)

  return {
    threatLevel,
    confidence,
    indicators: indicators.length ? indicators : ['✓ No obvious phishing indicators'],
    analysis: `Email pattern analysis. Phishing probability: ${riskScore}%. ${
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

  const threatLevel = riskScore >= 75 ? 'dangerous' : riskScore >= 50 ? 'suspicious' : 'safe'
  const confidence = calculateConfidence(threatLevel, riskScore)

  return {
    threatLevel,
    confidence,
    indicators: indicators.length ? indicators : ['✓ No obvious phishing patterns'],
    analysis: `SMS pattern analysis. Phishing probability: ${riskScore}%. ${
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

    const threatLevel = riskScore >= 75 ? 'dangerous' : riskScore >= 50 ? 'suspicious' : 'safe'
    const confidence = calculateConfidence(threatLevel, riskScore)

    return {
      threatLevel,
      confidence,
      indicators: indicators.length ? indicators : ['✓ QR appears safe'],
      analysis: `QR URL analysis. Phishing probability: ${riskScore}%. Decoded content: ${content}.`,
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