#!/usr/bin/env node

/**
 * Bulk Insert Training Records Script
 * Generates and inserts 470 training records to reach 500 total
 * Distributed across link, email, sms, qr scan types
 */

const crypto = require('crypto');

// Legitimate domains
const legitimateDomains = [
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
  'facebook.com', 'twitter.com', 'linkedin.com', 'github.com',
  'stackoverflow.com', 'wikipedia.org', 'reddit.com', 'youtube.com',
  'gmail.com', 'outlook.com', 'protonmail.com', 'banking.chase.com',
  'paypal.com', 'stripe.com', 'twilio.com', 'slack.com', 'notion.so',
  'dropbox.com', 'drive.google.com', 'onedrive.live.com', 'icloud.com'
];

// Phishing domains
const phishingDomains = [
  'gogle-verify.com', 'micros0ft-account.net', 'appl-security.xyz',
  'amaz0n-login.tk', 'faceb00k-confirm.ml', 'secure-verify-account.pw',
  'confirm-identity-now.tk', 'urgent-action-required.ga',
  'g00gle-security.com', 'microsoft-verify.pw', 'apple-id-verify.tk',
  'amazon-account-confirm.ml', 'facebook-security-check.ga',
  'twitter-verify-account.cf', 'linkedin-signin.biz',
  'github-auth-verify.info', 'paypal-confirm.pw', 'bank-security.tk',
  'verify-bank-account.ga', 'payment-confirm.ml', 'credential-verify.cf',
  'account-suspended.tk', 'urgent-verify-now.ga', 'click-here-to-verify.ml',
  'support-verification.top', 'account-recovery.bid', 'identity-confirm.download'
];

const legitimateBrands = ['Google', 'Microsoft', 'Apple', 'Amazon', 'Facebook', 'Twitter', 'LinkedIn', 'GitHub', 'PayPal', 'Chase Bank', 'Stripe'];
const phishingBrands = ['Gogle', 'Microsft', 'Appl', 'Amazn', 'Facebk', 'Twiter', 'Linked-In', 'GitHb', 'Paypa1', 'Bank of Amrica', 'Wells Fargo Security'];

const legitimateEmailServices = [
  'support@google.com', 'noreply@microsoft.com', 'security@apple.com',
  'account-team@amazon.com', 'help@facebook.com', 'support@twitter.com',
  'help@linkedin.com', 'support@github.com', 'support@paypal.com',
  'security@chase.com', 'alerts@wellsfargo.com', 'noreply@stripe.com'
];

const phishingEmailSenders = [
  'support@gogle-verify.com', 'security@micros0ft-login.net',
  'verify@appl-security.xyz', 'accounts@amaz0n-login.tk',
  'noreply@faceb00k-confirm.ml', 'alerts@secure-verify.tk',
  'admin@urgent-action.ga', 'security@verify-account.ml',
  'support@verify-identity.top', 'noreply@account-recovery.bid'
];

const urlPaths = [
  '/login', '/signin', '/verify', '/account', '/security',
  '/authenticate', '/confirm', '/update', '/validate', '/access',
  '/manage', '/settings', '/dashboard', '/profile', '/secure'
];

const urlPhishingIndicators = [
  'suspicious_tld', 'ip_address_domain', 'url_obfuscation',
  'typosquatting', 'homograph_attack', 'shortened_url',
  'port_number', 'subdomain_anomaly', 'special_characters',
  'internationalized_domain', 'url_redirect'
];

const emailPhishingIndicators = [
  'sender_spoofing', 'suspicious_links', 'urgent_language',
  'spelling_errors', 'phishing_attachment', 'request_sensitive_info',
  'executive_impersonation', 'reply_to_mismatch', 'dkim_fail', 'spf_fail'
];

const smsPhishingIndicators = [
  'urgency_tone', 'shortened_url', 'suspicious_link',
  'account_verification', 'monetary_request', 'unusual_sender',
  'misspelled_brand', 'fraudulent_offer', 'credential_request'
];

const qrPhishingIndicators = [
  'suspicious_url', 'encoded_phishing_link', 'malware_url',
  'obfuscated_link', 'typosquatting_url', 'shortened_url_in_qr'
];

function generateURL(isPhishing) {
  const domain = isPhishing
    ? phishingDomains[Math.floor(Math.random() * phishingDomains.length)]
    : legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)];
  const path = urlPaths[Math.floor(Math.random() * urlPaths.length)];
  const queryId = Math.random().toString(36).substring(7);
  const protocol = isPhishing && Math.random() > 0.7 ? 'http://' : 'https://';
  return `${protocol}${domain}${path}?id=${queryId}`;
}

function generateEmailContent(isPhishing) {
  const sender = isPhishing
    ? phishingEmailSenders[Math.floor(Math.random() * phishingEmailSenders.length)]
    : legitimateEmailServices[Math.floor(Math.random() * legitimateEmailServices.length)];
  const brand = isPhishing
    ? phishingBrands[Math.floor(Math.random() * phishingBrands.length)]
    : legitimateBrands[Math.floor(Math.random() * legitimateBrands.length)];

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
      `Update Required: ${brand} Account Settings`,
      `ALERT: ${brand} Unauthorized Access Detected`,
      `${brand} Account Recovery - Act Now`,
      `Final Notice: ${brand} Account Termination`
    ];

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
      `Confirm your credentials to maintain account access.`,
      `Your password has expired. Reset it immediately.`,
      `Unusual sign-in activity detected on your account.`
    ];

    return JSON.stringify({
      sender,
      subject: phishingSubjects[Math.floor(Math.random() * phishingSubjects.length)],
      body: phishingBodies[Math.floor(Math.random() * phishingBodies.length)],
      hasLink: true,
      hasAttachment: Math.random() > 0.7
    });
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
    ];

    return JSON.stringify({
      sender,
      subject: legitimateSubjects[Math.floor(Math.random() * legitimateSubjects.length)],
      body: 'Review your latest activity and settings.',
      hasLink: false,
      hasAttachment: false
    });
  }
}

function generateSMSContent(isPhishing) {
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
      'Your account needs verification. Act now: bit.ly/urgent-verify',
      'Delivery failed. Confirm address: bit.ly/update-address',
      'Bank alert: Large withdrawal. Verify: goo.gl/confirm-transaction'
    ];
    return phishingSMS[Math.floor(Math.random() * phishingSMS.length)];
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
    ];
    return legitimateSMS[Math.floor(Math.random() * legitimateSMS.length)];
  }
}

function selectRandomIndicators(indicatorPool, maxCount = 3) {
  const shuffled = [...indicatorPool].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * maxCount) + 1;
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function generateRecord(datasetId, scanType, isPhishing) {
  let content, indicatorPool;

  switch (scanType) {
    case 'email':
      content = generateEmailContent(isPhishing);
      indicatorPool = emailPhishingIndicators;
      break;
    case 'sms':
      content = generateSMSContent(isPhishing);
      indicatorPool = smsPhishingIndicators;
      break;
    case 'qr':
      content = generateURL(isPhishing);
      indicatorPool = qrPhishingIndicators;
      break;
    case 'link':
    default:
      content = generateURL(isPhishing);
      indicatorPool = urlPhishingIndicators;
  }

  const indicators = isPhishing ? selectRandomIndicators(indicatorPool) : [];
  const threatLevel = isPhishing
    ? Math.random() > 0.5 ? 'high' : 'medium'
    : 'low';

  return {
    id: `rec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
    datasetId,
    content,
    scanType,
    isPhishing: isPhishing ? 1 : 0,
    threatLevel,
    indicators: JSON.stringify(indicators),
    createdAt: new Date().toISOString()
  };
}

function generateBatch(datasetId, scanType, count, phishingRatio) {
  const phishingCount = Math.floor(count * phishingRatio);
  const legitimateCount = count - phishingCount;
  const records = [];

  for (let i = 0; i < phishingCount; i++) {
    records.push(generateRecord(datasetId, scanType, true));
  }

  for (let i = 0; i < legitimateCount; i++) {
    records.push(generateRecord(datasetId, scanType, false));
  }

  return records.sort(() => Math.random() - 0.5);
}

// Generate batches - 470 total records across 4 types
const recordsPerType = 117; // 117 * 4 = 468 + 2 extra = 470
const datasetId = 'dataset_main';

const batches = {
  link: generateBatch(datasetId, 'link', recordsPerType, 0.4),
  email: generateBatch(datasetId, 'email', recordsPerType, 0.35),
  sms: generateBatch(datasetId, 'sms', recordsPerType, 0.45),
  qr: generateBatch(datasetId, 'qr', recordsPerType, 0.5)
};

// Combine all records
const allRecords = [...batches.link, ...batches.email, ...batches.sms, ...batches.qr];

// Create SQL insert statements
const insertStatements = allRecords.map(record => {
  const escapedContent = record.content.replace(/'/g, "''");
  const escapedIndicators = record.indicators.replace(/'/g, "''");
  
  return `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, created_at) VALUES ('${record.id}', '${record.datasetId}', '${escapedContent}', '${record.scanType}', ${record.isPhishing}, '${record.threatLevel}', '${escapedIndicators}', '${record.createdAt}');`;
});

console.log(`Generated ${allRecords.length} training records`);
console.log(`Distribution:`);
console.log(`  - Links: ${batches.link.length} (${batches.link.filter(r => r.isPhishing).length} phishing, ${batches.link.filter(r => !r.isPhishing).length} legitimate)`);
console.log(`  - Emails: ${batches.email.length} (${batches.email.filter(r => r.isPhishing).length} phishing, ${batches.email.filter(r => !r.isPhishing).length} legitimate)`);
console.log(`  - SMS: ${batches.sms.length} (${batches.sms.filter(r => r.isPhishing).length} phishing, ${batches.sms.filter(r => !r.isPhishing).length} legitimate)`);
console.log(`  - QR: ${batches.qr.length} (${batches.qr.filter(r => r.isPhishing).length} phishing, ${batches.qr.filter(r => !r.isPhishing).length} legitimate)`);
console.log(`\nTotal SQL statements: ${insertStatements.length}`);

// Export for use in other scripts
module.exports = {
  records: allRecords,
  insertStatements,
  batches
};
