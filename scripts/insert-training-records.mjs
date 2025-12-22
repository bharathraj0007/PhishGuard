#!/usr/bin/env node

/**
 * Insert 470 training records to reach 500 total
 */

const legitimateDomains = [
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
  'facebook.com', 'twitter.com', 'linkedin.com', 'github.com',
  'stackoverflow.com', 'wikipedia.org', 'reddit.com', 'youtube.com',
  'gmail.com', 'outlook.com', 'protonmail.com', 'banking.chase.com',
  'paypal.com', 'stripe.com', 'twilio.com', 'slack.com', 'notion.so',
  'dropbox.com', 'drive.google.com', 'onedrive.live.com', 'icloud.com'
];

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

const urlPhishingIndicators = [
  'suspicious_tld', 'ip_address_domain', 'url_obfuscation',
  'typosquatting', 'homograph_attack', 'shortened_url',
  'port_number', 'subdomain_anomaly', 'special_characters',
  'internationalized_domain', 'url_redirect'
];

const urlPaths = [
  '/login', '/signin', '/verify', '/account', '/security',
  '/authenticate', '/confirm', '/update', '/validate', '/access',
  '/manage', '/settings', '/dashboard', '/profile', '/secure'
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
  const brand = isPhishing
    ? phishingBrands[Math.floor(Math.random() * phishingBrands.length)]
    : legitimateBrands[Math.floor(Math.random() * legitimateBrands.length)];

  if (isPhishing) {
    const subjects = [
      `URGENT: Verify your ${brand} account immediately`,
      `Action Required: ${brand} Security Alert`,
      `Confirm Your ${brand} Identity Now`,
      `Unusual Activity on Your ${brand} Account`,
      `${brand} Account Verification Required`,
      `IMPORTANT: Update Your ${brand} Payment Information`,
      `Your ${brand} Account Has Been Suspended`,
      `Verify Your ${brand} Login From New Device`
    ];
    return JSON.stringify({
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      body: 'Click here to verify your identity',
      hasLink: true
    });
  }
  return JSON.stringify({
    subject: `${brand} Account Update`,
    body: 'Your account is secure',
    hasLink: false
  });
}

function generateSMSContent(isPhishing) {
  if (isPhishing) {
    const messages = [
      'URGENT: Verify account now bit.ly/verify',
      'Suspicious activity detected. Confirm identity: tinyurl.com/verify',
      'Update payment now: bit.ly/update-payment',
      'Account locked. Verify here: goo.gl/verify-account'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  const messages = [
    'Your 2FA code is: 123456',
    'Delivery confirmed. Track: ABC123',
    'Login verified from new device',
    'Payment successful'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

function selectRandomIndicators(pool) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.floor(Math.random() * 3) + 1);
}

function generateRecord(scanType, isPhishing) {
  let content, indicators;
  const id = `rec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  const threatLevel = isPhishing ? (Math.random() > 0.5 ? 'high' : 'medium') : 'low';
  const createdAt = new Date().toISOString();

  switch (scanType) {
    case 'link':
      content = generateURL(isPhishing);
      indicators = isPhishing ? selectRandomIndicators(urlPhishingIndicators) : [];
      break;
    case 'email':
      content = generateEmailContent(isPhishing);
      indicators = isPhishing ? selectRandomIndicators(emailPhishingIndicators) : [];
      break;
    case 'sms':
      content = generateSMSContent(isPhishing);
      indicators = isPhishing ? selectRandomIndicators(smsPhishingIndicators) : [];
      break;
    case 'qr':
      content = generateURL(isPhishing);
      indicators = isPhishing ? selectRandomIndicators(qrPhishingIndicators) : [];
      break;
  }

  // Escape single quotes for SQL
  const escapedContent = content.replace(/'/g, "''");
  const escapedIndicators = JSON.stringify(indicators).replace(/'/g, "''");

  return { id, scanType, content: escapedContent, isPhishing: isPhishing ? 1 : 0, threatLevel, indicators: escapedIndicators, createdAt };
}

// Generate 470 records (117 per type + 2 extra)
const records = [];
const recordsPerType = 117;

for (let i = 0; i < recordsPerType; i++) {
  records.push(generateRecord('link', Math.random() > 0.6));
  records.push(generateRecord('email', Math.random() > 0.65));
  records.push(generateRecord('sms', Math.random() > 0.55));
  records.push(generateRecord('qr', Math.random() > 0.5));
}
records.push(generateRecord('link', false));
records.push(generateRecord('email', false));

console.log(`Generated ${records.length} records for insertion`);

// Output SQL in batches
let batchCount = 0;
let currentBatch = '';
const batchSize = 50;

records.forEach((rec, idx) => {
  const sql = `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, created_at) VALUES ('${rec.id}', 'dataset_main', '${rec.content}', '${rec.scanType}', ${rec.isPhishing}, '${rec.threatLevel}', '${rec.indicators}', '${rec.createdAt}')`;
  currentBatch += sql + '; ';
  
  if ((idx + 1) % batchSize === 0 || idx === records.length - 1) {
    batchCount++;
    console.log(`Batch ${batchCount}: ${currentBatch.split(';').length - 1} records`);
    currentBatch = '';
  }
});

console.log(`\nTotal: ${records.length} records ready for insertion`);
console.log('Stats:');
console.log(`- Link: ${records.filter(r => r.scanType === 'link').length}`);
console.log(`- Email: ${records.filter(r => r.scanType === 'email').length}`);
console.log(`- SMS: ${records.filter(r => r.scanType === 'sms').length}`);
console.log(`- QR: ${records.filter(r => r.scanType === 'qr').length}`);
console.log(`- Phishing: ${records.filter(r => r.isPhishing).length}`);
console.log(`- Legitimate: ${records.filter(r => !r.isPhishing).length}`);

export { records };
