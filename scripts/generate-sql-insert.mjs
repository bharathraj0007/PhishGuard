#!/usr/bin/env node

/**
 * Generate SQL INSERT statements for 470 training records
 * Run the output SQL to populate the database
 */

const crypto = require('crypto');

function generateRandomId() {
  return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);
}

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Training data templates
const links = [
  'https://google.com/login',
  'https://microsoft.com/account',
  'https://apple.com/verify',
  'https://amazon.com/signin',
  'https://facebook.com/account',
  'https://paypal.com/secure',
  'https://linkedin.com/profile',
  'https://github.com/auth',
  'https://twitter.com/login',
  'http://gogle-verify.com/verify',
  'https://micros0ft-account.net/login',
  'https://appl-security.xyz/account',
  'https://amaz0n-login.tk/signin',
  'https://faceb00k-confirm.ml/verify'
];

const emails = [
  'Support: Google Account Verification Required',
  'Alert: Microsoft Account Security Update',
  'Action Needed: Apple ID Confirmation',
  'Amazon: Verify Your Account Now',
  'Facebook: Security Check Required',
  'PayPal: Confirm Your Identity',
  'LinkedIn: Account Verification',
  'GitHub: Login Verification Required',
  'Unusual Activity: Verify Your Account',
  'URGENT: Account Suspended - Take Action'
];

const sms = [
  'Your 2FA code is 123456. Do not share.',
  'Delivery confirmed. Track order here.',
  'Account login verified from new device.',
  'Payment successful. Thank you.',
  'URGENT: Verify account now: bit.ly/verify',
  'Suspicious activity detected. Confirm: goo.gl/confirm',
  'Update payment info: bit.ly/update',
  'Account suspended. Verify here: tinyurl.com/verify'
];

const qrUrls = [
  'https://secure.google.com/verify',
  'https://account.microsoft.com/login',
  'https://appleid.apple.com/auth',
  'https://amazon.com/account/security',
  'https://facebook.com/security/verify',
  'https://login.paypal.com/confirm',
  'https://linkedin.com/feed/security',
  'http://verify-account.tk/confirm',
  'https://urgent-verify.ga/login',
  'https://account-recovery.bid/verify'
];

const urlIndicators = ['suspicious_tld', 'typosquatting', 'shortened_url', 'url_redirect', 'port_number'];
const emailIndicators = ['sender_spoofing', 'urgent_language', 'request_sensitive_info', 'suspicious_links', 'spelling_errors'];
const smsIndicators = ['urgency_tone', 'shortened_url', 'credential_request', 'unusual_sender', 'fraudulent_offer'];
const qrIndicators = ['suspicious_url', 'encoded_phishing_link', 'shortened_url_in_qr', 'obfuscated_link'];

function generateRecord(type, isPhishing) {
  const id = generateRandomId();
  const createdAt = new Date().toISOString();
  const threatLevel = isPhishing ? (Math.random() > 0.5 ? 'high' : 'medium') : 'low';
  let content, indicators;

  switch (type) {
    case 'link':
      content = isPhishing 
        ? getRandomElement(links.filter(l => l.includes('tk') || l.includes('ga') || l.includes('ml')))
        : getRandomElement(links.filter(l => l.includes('google') || l.includes('microsoft') || l.includes('apple') || l.includes('amazon')));
      indicators = isPhishing ? [getRandomElement(urlIndicators), getRandomElement(urlIndicators)] : [];
      break;
    case 'email':
      content = getRandomElement(emails);
      indicators = isPhishing ? [getRandomElement(emailIndicators), getRandomElement(emailIndicators)] : [];
      break;
    case 'sms':
      content = getRandomElement(sms);
      indicators = isPhishing ? [getRandomElement(smsIndicators), getRandomElement(smsIndicators)] : [];
      break;
    case 'qr':
      content = getRandomElement(qrUrls);
      indicators = isPhishing ? [getRandomElement(qrIndicators), getRandomElement(qrIndicators)] : [];
      break;
  }

  const escapedContent = content.replace(/'/g, "''");
  const indicatorsStr = JSON.stringify(indicators).replace(/'/g, "''");

  return {
    id,
    content: escapedContent,
    type,
    isPhishing: isPhishing ? 1 : 0,
    threatLevel,
    indicators: indicatorsStr,
    createdAt
  };
}

// Generate batches
const records = [];
const perType = 117;

for (let i = 0; i < perType; i++) {
  records.push(generateRecord('link', Math.random() > 0.6));
  records.push(generateRecord('email', Math.random() > 0.65));
  records.push(generateRecord('sms', Math.random() > 0.55));
  records.push(generateRecord('qr', Math.random() > 0.5));
}
records.push(generateRecord('link', false));
records.push(generateRecord('email', false));

// Generate SQL INSERT statements
console.log(`-- Inserting ${records.length} training records`);
console.log(`-- Total with existing: ${30 + records.length} records\n`);

let sqlBatch = '';
records.forEach((rec, idx) => {
  sqlBatch += `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, created_at) VALUES ('${rec.id}', 'dataset_main', '${rec.content}', '${rec.type}', ${rec.isPhishing}, '${rec.threatLevel}', '${rec.indicators}', '${rec.createdAt}');\n`;
  
  // Print batch every 50 records for monitoring
  if ((idx + 1) % 50 === 0) {
    console.log(`-- Batch at record ${idx + 1}`);
  }
});

console.log(sqlBatch);
console.log(`\n-- Verification query`);
console.log(`SELECT COUNT(*) as total_records, scan_type, COUNT(CASE WHEN is_phishing = 1 THEN 1 END) as phishing, COUNT(CASE WHEN is_phishing = 0 THEN 1 END) as legitimate FROM training_records GROUP BY scan_type;`);

// Stats
const phishingCount = records.filter(r => r.isPhishing).length;
const legitimateCount = records.filter(r => !r.isPhishing).length;

console.error(`\nStats:`);
console.error(`- Total new records: ${records.length}`);
console.error(`- Phishing: ${phishingCount}`);
console.error(`- Legitimate: ${legitimateCount}`);
console.error(`- By type:`);
console.error(`  - Link: ${records.filter(r => r.type === 'link').length}`);
console.error(`  - Email: ${records.filter(r => r.type === 'email').length}`);
console.error(`  - SMS: ${records.filter(r => r.type === 'sms').length}`);
console.error(`  - QR: ${records.filter(r => r.type === 'qr').length}`);
console.error(`\nFinal total in DB: 30 + ${records.length} = ${30 + records.length} records`);
