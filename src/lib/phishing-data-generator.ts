/**
 * Enhanced Phishing Data Generator
 * Generates realistic phishing and legitimate data for all scan types
 * 500+ records per type with diverse patterns
 */

export type ScanType = 'link' | 'email' | 'sms' | 'qr'

// Legitimate domains and services
const legitimateDomains = [
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
  'facebook.com', 'twitter.com', 'linkedin.com', 'github.com',
  'stackoverflow.com', 'wikipedia.org', 'reddit.com', 'youtube.com',
  'gmail.com', 'outlook.com', 'protonmail.com', 'banking.chase.com',
  'paypal.com', 'stripe.com', 'twilio.com', 'slack.com'
]

// Phishing domains (various typosquatting and suspicious patterns)
const phishingDomains = [
  'gogle-verify.com', 'micros0ft-account.net', 'appl-security.xyz',
  'amaz0n-login.tk', 'faceb00k-confirm.ml', 'secure-verify-account.pw',
  'confirm-identity-now.tk', 'urgent-action-required.ga',
  'g00gle-security.com', 'microsoft-verify.pw', 'apple-id-verify.tk',
  'amazon-account-confirm.ml', 'facebook-security-check.ga',
  'twitter-verify-account.cf', 'linkedin-signin.biz',
  'github-auth-verify.info', 'paypal-confirm.pw', 'bank-security.tk',
  'verify-bank-account.ga', 'payment-confirm.ml', 'credential-verify.cf',
  'account-suspended.tk', 'urgent-verify-now.ga', 'click-here-to-verify.ml'
]

// Legitimate brand names
const legitimateBrands = ['Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Twitter', 'LinkedIn', 'GitHub', 'PayPal', 'Chase Bank', 'Wells Fargo']

// Phishing brand names (misspelled)
const phishingBrands = ['Gogle', 'Microsft', 'Appl', 'Amazn', 'Facebk', 'Twiter', 'Linked-In', 'GitHb', 'Paypa1', 'Bank of Amrica', 'Wells Fargo Security']

// Email service providers (legitimate)
const legitimateEmailServices = [
  'support@google.com', 'noreply@microsoft.com', 'security@apple.com',
  'account-team@amazon.com', 'help@facebook.com', 'support@twitter.com',
  'help@linkedin.com', 'support@github.com', 'support@paypal.com',
  'security@chase.com', 'alerts@wellsfargo.com'
]

// Phishing email senders
const phishingEmailSenders = [
  'support@gogle-verify.com', 'security@micros0ft-login.net',
  'verify@appl-security.xyz', 'accounts@amaz0n-login.tk',
  'noreply@faceb00k-confirm.ml', 'alerts@secure-verify.tk',
  'admin@urgent-action.ga', 'security@verify-account.ml'
]

// URL patterns
const urlPaths = [
  '/login', '/signin', '/verify', '/account', '/security',
  '/authenticate', '/confirm', '/update', '/validate', '/access',
  '/manage', '/settings', '/dashboard', '/profile', '/secure'
]

// Phishing indicators for links
const urlPhishingIndicators = [
  'suspicious_tld', 'ip_address_domain', 'url_obfuscation',
  'typosquatting', 'homograph_attack', 'shortened_url',
  'port_number', 'subdomain_anomaly', 'special_characters',
  'internationalized_domain', 'url_redirect'
]

// Email phishing indicators
const emailPhishingIndicators = [
  'sender_spoofing', 'suspicious_links', 'urgent_language',
  'spelling_errors', 'phishing_attachment', 'request_sensitive_info',
  'executive_impersonation', 'reply_to_mismatch', 'dkim_fail', 'spf_fail'
]

// SMS phishing indicators
const smsPhishingIndicators = [
  'urgency_tone', 'shortened_url', 'suspicious_link',
  'account_verification', 'monetary_request', 'unusual_sender',
  'misspelled_brand', 'fraudulent_offer', 'credential_request'
]

// QR phishing indicators
const qrPhishingIndicators = [
  'suspicious_url', 'encoded_phishing_link', 'malware_url',
  'obfuscated_link', 'typosquatting_url', 'shortened_url_in_qr'
]

/**
 * Generate realistic URL
 */
export function generateURL(isPhishing: boolean): string {
  const domain = isPhishing
    ? phishingDomains[Math.floor(Math.random() * phishingDomains.length)]
    : legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)]

  const path = urlPaths[Math.floor(Math.random() * urlPaths.length)]
  const queryId = Math.random().toString(36).substring(7)
  
  const protocol = isPhishing && Math.random() > 0.7 ? 'http://' : 'https://'
  
  return `${protocol}${domain}${path}?id=${queryId}`
}

/**
 * Generate realistic email content
 */
export function generateEmailContent(isPhishing: boolean): string {
  const sender = isPhishing
    ? phishingEmailSenders[Math.floor(Math.random() * phishingEmailSenders.length)]
    : legitimateEmailServices[Math.floor(Math.random() * legitimateEmailServices.length)]

  const brand = isPhishing
    ? phishingBrands[Math.floor(Math.random() * phishingBrands.length)]
    : legitimateBrands[Math.floor(Math.random() * legitimateBrands.length)]

  if (isPhishing) {
    const phishingSubjects = [
      `URGENT: Verify your ${brand} account immediately`,
      `Action Required: ${brand} Security Alert`,
      `Confirm Your ${brand} Identity Now`,
      `Unusual Activity on Your ${brand} Account`,
      `${brand} Account Verification Required`,
      `IMPORTANT: Update Your ${brand} Payment Information`,
      `Your ${brand} Account Has Been Suspended`,
      `Verify Your ${brand} Login From New Device`,
      `${brand} Security Check - Complete Now`,
      `Update Required: ${brand} Account Settings`
    ]

    const phishingBodies = [
      `Click here to verify your identity and restore account access.`,
      `We detected unusual activity. Please confirm your information immediately.`,
      `Your account will be suspended in 24 hours unless you verify now.`,
      `Click the link below to update your security settings.`,
      `We need you to confirm your identity for your protection.`,
      `Your payment method needs to be updated immediately.`,
      `Complete verification to restore full access to your account.`,
      `Someone tried to access your account. Verify it's you.`,
      `Security update required. Click below to proceed.`,
      `Confirm your credentials to maintain account access.`
    ]

    return JSON.stringify({
      sender,
      subject: phishingSubjects[Math.floor(Math.random() * phishingSubjects.length)],
      body: phishingBodies[Math.floor(Math.random() * phishingBodies.length)],
      hasLink: true,
      hasAttachment: Math.random() > 0.7
    })
  } else {
    const legitimateSubjects = [
      `Your ${brand} monthly statement is ready`,
      `Service update notification from ${brand}`,
      `Password reset confirmation for ${brand}`,
      `Security notification from ${brand}`,
      `${brand} newsletter - Latest updates`,
      `Account activity summary from ${brand}`,
      `Thank you for using ${brand}`,
      `${brand} system maintenance notification`,
      `Your ${brand} subscription confirmation`,
      `Important information about your ${brand} account`
    ]

    const legitimateBodies = [
      `Review your latest activity and settings.`,
      `This is a notification-only message. No action required.`,
      `Your request to reset your password was successful.`,
      `For security questions, visit our help center.`,
      `Check out our latest features and updates.`,
      `Everything is secure. No action needed.`,
      `Thank you for your continued trust.`,
      `System will be available shortly.`,
      `Your subscription is active and valid.`,
      `For more information, visit our website.`
    ]

    return JSON.stringify({
      sender,
      subject: legitimateSubjects[Math.floor(Math.random() * legitimateSubjects.length)],
      body: legitimateBodies[Math.floor(Math.random() * legitimateBodies.length)],
      hasLink: false,
      hasAttachment: false
    })
  }
}

/**
 * Generate realistic SMS content
 */
export function generateSMSContent(isPhishing: boolean): string {
  if (isPhishing) {
    const phishingSMS = [
      'URGENT: Verify your account now. Click here: bit.ly/verify',
      'Your account suspended. Confirm identity immediately. Click: tinyurl.com/verify',
      'Claim your reward - Limited time! bit.ly/claim-now',
      'Update payment info urgently required. bit.ly/update-payment',
      'Unusual activity detected. Verify here: goo.gl/verify-account',
      'Your login failed. Confirm identity: bit.ly/confirm-login',
      'Security alert. Verify your credentials now: tinyurl.com/secure',
      'Complete account verification: bit.ly/verify-id',
      'Payment declined. Update now: goo.gl/update-payment',
      'Your card has been locked. Verify here: bit.ly/unlock-card',
      'Confirm your identity for account security. Click: tinyurl.com/confirm',
      'Your account needs verification. Act now: bit.ly/urgent-verify'
    ]
    return phishingSMS[Math.floor(Math.random() * phishingSMS.length)]
  } else {
    const legitimateSMS = [
      'Your 2FA code is: 123456. Do not share this code.',
      'Your delivery is on the way. Tracking: ABC123',
      'Account login confirmed from new device.',
      'Password reset successful. Your account is secure.',
      'You have earned 100 reward points.',
      'Your appointment is confirmed for tomorrow at 2PM.',
      'Your package will arrive within 2 hours.',
      'Banking alert: Withdrawal of $500 from account ****1234',
      'Subscription renewed successfully. Thank you.',
      'Your flight confirmation code is ABC123DEF',
      'Welcome! Your account activation is complete.',
      'Service restored. Your account is now active.'
    ]
    return legitimateSMS[Math.floor(Math.random() * legitimateSMS.length)]
  }
}

/**
 * Generate QR code (as decoded URL)
 */
export function generateQRContent(isPhishing: boolean): string {
  return generateURL(isPhishing)
}

/**
 * Select random indicators
 */
export function selectRandomIndicators(indicatorPool: string[], maxCount: number = 3): string[] {
  const shuffled = [...indicatorPool].sort(() => Math.random() - 0.5)
  const count = Math.floor(Math.random() * maxCount) + 1
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/**
 * Generate training record for database insertion
 */
export interface TrainingRecord {
  id: string
  datasetId: string
  content: string
  scanType: ScanType
  isPhishing: number
  threatLevel: string
  indicators: string
  createdAt: string
}

export function generateRecord(
  datasetId: string,
  scanType: ScanType,
  isPhishing: boolean,
  index?: number
): TrainingRecord {
  let content: string
  let indicatorPool: string[]

  switch (scanType) {
    case 'email':
      content = generateEmailContent(isPhishing)
      indicatorPool = emailPhishingIndicators
      break
    case 'sms':
      content = generateSMSContent(isPhishing)
      indicatorPool = smsPhishingIndicators
      break
    case 'qr':
      content = generateQRContent(isPhishing)
      indicatorPool = qrPhishingIndicators
      break
    case 'link':
    default:
      content = generateURL(isPhishing)
      indicatorPool = urlPhishingIndicators
  }

  const indicators = isPhishing ? selectRandomIndicators(indicatorPool) : []
  const threatLevel = isPhishing
    ? Math.random() > 0.5 ? 'high' : 'medium'
    : 'low'

  return {
    id: `rec_${Date.now().toString(36)}_${index || Math.random().toString(36).substring(2, 8)}`,
    datasetId,
    content,
    scanType,
    isPhishing: isPhishing ? 1 : 0,
    threatLevel,
    indicators: JSON.stringify(indicators),
    createdAt: new Date().toISOString()
  }
}

/**
 * Generate batch of records for a scan type
 * 500+ records with 40% phishing ratio by default
 */
export function generateBatch(
  datasetId: string,
  scanType: ScanType,
  count: number = 500,
  phishingRatio: number = 0.4
): TrainingRecord[] {
  const phishingCount = Math.floor(count * phishingRatio)
  const legitimateCount = count - phishingCount
  const records: TrainingRecord[] = []

  // Generate phishing records
  for (let i = 0; i < phishingCount; i++) {
    records.push(generateRecord(datasetId, scanType, true, i))
  }

  // Generate legitimate records
  for (let i = 0; i < legitimateCount; i++) {
    records.push(generateRecord(datasetId, scanType, false, phishingCount + i))
  }

  // Shuffle records
  return records.sort(() => Math.random() - 0.5)
}

/**
 * Generate all batches for all scan types
 */
export function generateAllBatches(
  datasetId: string,
  recordsPerType: number = 500
): Record<ScanType, TrainingRecord[]> {
  return {
    link: generateBatch(datasetId, 'link', recordsPerType, 0.4),
    email: generateBatch(datasetId, 'email', recordsPerType, 0.35),
    sms: generateBatch(datasetId, 'sms', recordsPerType, 0.45),
    qr: generateBatch(datasetId, 'qr', recordsPerType, 0.5)
  }
}

/**
 * Get summary statistics
 */
export function getSummaryStats(batches: Record<ScanType, TrainingRecord[]>) {
  const stats: Record<ScanType, { total: number; phishing: number; legitimate: number }> = {
    link: { total: 0, phishing: 0, legitimate: 0 },
    email: { total: 0, phishing: 0, legitimate: 0 },
    sms: { total: 0, phishing: 0, legitimate: 0 },
    qr: { total: 0, phishing: 0, legitimate: 0 }
  }

  for (const [type, records] of Object.entries(batches)) {
    const scanType = type as ScanType
    stats[scanType].total = records.length
    stats[scanType].phishing = records.filter(r => r.isPhishing === 1).length
    stats[scanType].legitimate = records.filter(r => r.isPhishing === 0).length
  }

  return stats
}
