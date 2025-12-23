/**
 * Comprehensive Database Population Script
 * Adds more rows to all tables: users, phishing_scans, training_records, model_versions, model_tests
 * 
 * Run with: node scripts/bulk-populate-all-tables.js
 */

const crypto = require('crypto');

// Helper functions
function generateId(prefix = 'rec') {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
}

function generateEmail() {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'test.com'];
  const names = ['john', 'jane', 'alex', 'taylor', 'casey', 'morgan', 'jordan', 'sam', 'chris', 'pat'];
  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const suffix = Math.floor(Math.random() * 1000);
  return `${name}${suffix}@${domain}`;
}

function generateDisplayName() {
  const firstNames = ['John', 'Jane', 'Alex', 'Taylor', 'Casey', 'Morgan', 'Jordan', 'Sam', 'Chris', 'Pat'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez'];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

// Phishing URL generators
const legitimateDomains = [
  'google.com', 'microsoft.com', 'apple.com', 'amazon.com',
  'facebook.com', 'twitter.com', 'linkedin.com', 'github.com',
  'stackoverflow.com', 'wikipedia.org', 'github.io', 'heroku.com'
];

const phishingDomains = [
  'gogle-verify.com', 'micros0ft-account.net', 'appl-security.xyz',
  'amaz0n-login.tk', 'faceb00k-confirm.ml', 'secure-verify-account.pw',
  'confirm-identity-now.tk', 'urgent-action-required.ga', 'account-update.tk',
  'verify-secure-login.pw', 'google-security-check.tk'
];

function generateURL(isPhishing = false) {
  const domain = isPhishing
    ? phishingDomains[Math.floor(Math.random() * phishingDomains.length)]
    : legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)];
  const paths = ['/login', '/signin', '/verify', '/account', '/security', '/settings'];
  const path = paths[Math.floor(Math.random() * paths.length)];
  return `https://${domain}${path}?id=${Math.random().toString(36).substring(7)}`;
}

function generateEmailContent(isPhishing = false) {
  const sender = isPhishing
    ? `support@${phishingDomains[Math.floor(Math.random() * phishingDomains.length)]}`
    : `noreply@${legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)]}`;

  const subject = isPhishing
    ? 'URGENT: Verify your account immediately'
    : 'Service notification update';

  return JSON.stringify({
    sender,
    subject,
    body: isPhishing ? 'Click here to verify your identity' : 'Information only'
  });
}

function generateSMSContent(isPhishing = false) {
  const legitimate = [
    'Your verification code is: 123456',
    'You are all set to access your account',
    'Thank you for using our service',
    'Your delivery is on the way'
  ];

  const phishing = [
    'URGENT: Verify now https://verify.tk',
    'Account suspended. Confirm identity immediately',
    'Claim your reward - limited time offer',
    'Update payment info urgently required'
  ];

  const pool = isPhishing ? phishing : legitimate;
  return pool[Math.floor(Math.random() * pool.length)];
}

function selectRandomIndicators(pool = [], count = 3) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

// SQL generation functions

function generateUserInserts(count = 25) {
  const users = [];
  const existingEmails = ['admin@phishguard.com', 'test@phishguard.com', 'demo@phishguard.com', 'user@phishguard.com'];
  
  for (let i = 0; i < count; i++) {
    let email;
    do {
      email = generateEmail();
    } while (existingEmails.includes(email));
    
    const user = {
      id: generateId('user'),
      email,
      email_verified: Math.random() > 0.3 ? 1 : 0,
      password_hash: hashPassword(`password${i}`),
      display_name: generateDisplayName(),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      phone: Math.random() > 0.5 ? `+1${Math.floor(Math.random() * 9000000000) + 1000000000}` : null,
      phone_verified: 0,
      role: Math.random() > 0.9 ? 'admin' : 'user',
      metadata: JSON.stringify({ preferences: { language: 'en', theme: 'light' } }),
      is_active: 1,
      last_sign_in: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      created_at: new Date(Date.now() - Math.random() * 86400000 * 90).toISOString(),
      updated_at: new Date().toISOString()
    };
    users.push(user);
  }
  
  return users;
}

function generatePhishingScans(users, count = 400) {
  const scans = [];
  const scanTypes = ['url', 'email', 'sms', 'qr'];
  const threatLevels = ['low', 'medium', 'high', 'critical'];
  
  const urlIndicators = ['suspicious_tld', 'ip_address', 'typosquatting', 'homograph_attack'];
  const emailIndicators = ['spoofing', 'suspicious_links', 'urgent_language', 'spelling_errors'];
  const smsIndicators = ['urgency_tone', 'shortened_url', 'account_verification', 'monetary_request'];
  const qrIndicators = ['suspicious_url', 'encoded_phishing', 'malware_url', 'obfuscated'];
  
  for (let i = 0; i < count; i++) {
    const scanType = scanTypes[Math.floor(Math.random() * scanTypes.length)];
    const isPhishing = Math.random() > 0.4;
    let content, indicators;
    
    switch (scanType) {
      case 'url':
        content = generateURL(isPhishing);
        indicators = isPhishing ? selectRandomIndicators(urlIndicators) : [];
        break;
      case 'email':
        content = generateEmailContent(isPhishing);
        indicators = isPhishing ? selectRandomIndicators(emailIndicators) : [];
        break;
      case 'sms':
        content = generateSMSContent(isPhishing);
        indicators = isPhishing ? selectRandomIndicators(smsIndicators) : [];
        break;
      case 'qr':
        content = generateURL(isPhishing);
        indicators = isPhishing ? selectRandomIndicators(qrIndicators) : [];
        break;
    }
    
    const scan = {
      id: generateId('scan'),
      user_id: users[Math.floor(Math.random() * users.length)].id,
      scan_type: scanType,
      content: content,
      threat_level: isPhishing ? threatLevels[Math.floor(Math.random() * 3) + 1] : 'low',
      confidence: parseFloat((Math.random() * 0.4 + 0.5).toFixed(2)),
      indicators: JSON.stringify(indicators),
      analysis: JSON.stringify({
        suspicious_patterns: indicators.length,
        domain_reputation: isPhishing ? 'bad' : 'good',
        is_phishing: isPhishing
      }),
      is_deleted: 0,
      synced: 1,
      created_at: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
      updated_at: new Date().toISOString()
    };
    scans.push(scan);
  }
  
  return scans;
}

function generateTrainingRecords(count = 1600) {
  const records = [];
  const datasetMap = {
    'url': ['ds_phishing_urls', 'ds_kaggle_urls'],
    'email': ['ds_phishing_emails'],
    'sms': ['ds_sms_phishing'],
    'qr': ['ds_qr_phishing']
  };
  
  const urlIndicators = ['suspicious_tld', 'ip_address_domain', 'url_obfuscation', 'typosquatting', 'homograph_attack'];
  const emailIndicators = ['sender_spoofing', 'suspicious_links', 'urgent_language', 'spelling_errors'];
  const smsIndicators = ['urgency_tone', 'shortened_url', 'suspicious_link', 'account_verification'];
  const qrIndicators = ['suspicious_url', 'encoded_phishing', 'malware_url', 'obfuscated_link'];
  
  const distributions = [
    { scanType: 'url', count: 600, ratio: 0.4 },
    { scanType: 'email', count: 500, ratio: 0.35 },
    { scanType: 'sms', count: 300, ratio: 0.45 },
    { scanType: 'qr', count: 200, ratio: 0.5 }
  ];
  
  for (const dist of distributions) {
    const phishingCount = Math.floor(dist.count * dist.ratio);
    const legitimateCount = dist.count - phishingCount;
    const datasets = datasetMap[dist.scanType];
    
    let indicatorPool;
    let contentGen;
    
    switch (dist.scanType) {
      case 'url':
        indicatorPool = urlIndicators;
        contentGen = (isPhishing) => generateURL(isPhishing);
        break;
      case 'email':
        indicatorPool = emailIndicators;
        contentGen = (isPhishing) => generateEmailContent(isPhishing);
        break;
      case 'sms':
        indicatorPool = smsIndicators;
        contentGen = (isPhishing) => generateSMSContent(isPhishing);
        break;
      case 'qr':
        indicatorPool = qrIndicators;
        contentGen = (isPhishing) => generateURL(isPhishing);
        break;
    }
    
    // Generate phishing records
    for (let i = 0; i < phishingCount; i++) {
      records.push({
        id: generateId('trec'),
        dataset_id: datasets[Math.floor(Math.random() * datasets.length)],
        content: contentGen(true),
        scan_type: dist.scanType,
        is_phishing: 1,
        threat_level: Math.random() > 0.5 ? 'high' : 'medium',
        indicators: JSON.stringify(selectRandomIndicators(indicatorPool, 3)),
        notes: 'Auto-generated phishing training record',
        synced: 1,
        created_at: new Date(Date.now() - Math.random() * 86400000 * 60).toISOString()
      });
    }
    
    // Generate legitimate records
    for (let i = 0; i < legitimateCount; i++) {
      records.push({
        id: generateId('trec'),
        dataset_id: datasets[Math.floor(Math.random() * datasets.length)],
        content: contentGen(false),
        scan_type: dist.scanType,
        is_phishing: 0,
        threat_level: 'low',
        indicators: JSON.stringify([]),
        notes: 'Auto-generated legitimate training record',
        synced: 1,
        created_at: new Date(Date.now() - Math.random() * 86400000 * 60).toISOString()
      });
    }
  }
  
  return records;
}

function generateModelVersions(count = 8) {
  const versions = [];
  const modelTypes = ['url-cnn', 'email-bilstm', 'sms-bilstm', 'qr-detector', 'ensemble'];
  
  for (let i = 1; i <= count; i++) {
    const modelType = modelTypes[Math.floor(Math.random() * modelTypes.length)];
    const isActive = i === count; // Last version is active
    const startTime = new Date(Date.now() - Math.random() * 86400000 * 20);
    const duration = Math.floor(Math.random() * 3600) + 1800; // 30min to 1hr
    
    versions.push({
      id: generateId('mv'),
      version_number: `v${1}.${i}.0`,
      description: `Model ${modelType} - version ${i} with improved accuracy`,
      model_type: modelType,
      training_dataset_id: `ds_${modelType}`,
      training_started_at: startTime.toISOString(),
      training_completed_at: new Date(startTime.getTime() + duration * 1000).toISOString(),
      training_duration: duration,
      status: 'completed',
      is_active: isActive ? 1 : 0,
      metrics: JSON.stringify({
        accuracy: (0.85 + Math.random() * 0.15).toFixed(4),
        precision: (0.82 + Math.random() * 0.15).toFixed(4),
        recall: (0.88 + Math.random() * 0.1).toFixed(4),
        f1_score: (0.85 + Math.random() * 0.12).toFixed(4),
        auc_roc: (0.92 + Math.random() * 0.07).toFixed(4)
      }),
      config: JSON.stringify({
        learning_rate: 0.001,
        batch_size: 32,
        epochs: Math.floor(Math.random() * 20) + 10,
        optimizer: 'adam'
      }),
      created_by: 'admin@phishguard.com',
      synced: 1,
      created_at: startTime.toISOString(),
      updated_at: new Date().toISOString()
    });
  }
  
  return versions;
}

function generateModelTests(versions, count = 20) {
  const tests = [];
  const testTypes = ['validation', 'benchmark', 'stress-test', 'regression'];
  
  for (let i = 0; i < count; i++) {
    const version = versions[Math.floor(Math.random() * versions.length)];
    const testType = testTypes[Math.floor(Math.random() * testTypes.length)];
    const startTime = new Date(Date.now() - Math.random() * 86400000 * 5);
    const duration = Math.floor(Math.random() * 1800) + 300; // 5min to 35min
    
    tests.push({
      id: generateId('mt'),
      model_version_id: version.id,
      test_name: `${testType}-${version.version_number}`,
      test_dataset_id: version.training_dataset_id,
      test_type: testType,
      status: 'completed',
      results: JSON.stringify({
        total_samples: Math.floor(Math.random() * 5000) + 1000,
        passed: Math.floor(Math.random() * 4500) + 500,
        failed: Math.floor(Math.random() * 500),
        duration_seconds: duration
      }),
      metrics: JSON.stringify({
        test_accuracy: (0.83 + Math.random() * 0.16).toFixed(4),
        test_precision: (0.80 + Math.random() * 0.18).toFixed(4),
        test_recall: (0.85 + Math.random() * 0.12).toFixed(4),
        inference_time_ms: Math.floor(Math.random() * 100) + 20
      }),
      started_at: startTime.toISOString(),
      completed_at: new Date(startTime.getTime() + duration * 1000).toISOString(),
      created_by: 'admin@phishguard.com',
      synced: 1,
      created_at: startTime.toISOString()
    });
  }
  
  return tests;
}

// Main function
function generateAllInserts() {
  console.log('🚀 Generating comprehensive SQL inserts...\n');
  
  // Generate data
  const users = generateUserInserts(25);
  const phishingScans = generatePhishingScans(users, 400);
  const trainingRecords = generateTrainingRecords(1600);
  const modelVersions = generateModelVersions(8);
  const modelTests = generateModelTests(modelVersions, 20);
  
  console.log(`✅ Users: ${users.length}`);
  console.log(`✅ Phishing Scans: ${phishingScans.length}`);
  console.log(`✅ Training Records: ${trainingRecords.length}`);
  console.log(`✅ Model Versions: ${modelVersions.length}`);
  console.log(`✅ Model Tests: ${modelTests.length}`);
  
  // Generate SQL
  let sql = '-- ===== USER INSERTS =====\n';
  for (const user of users) {
    const escapedJSON = (obj) => JSON.stringify(obj).replace(/'/g, "''");
    sql += `INSERT INTO users (id, email, email_verified, password_hash, display_name, avatar_url, phone, phone_verified, role, metadata, is_active, last_sign_in, created_at, updated_at) VALUES ('${user.id}', '${user.email}', ${user.email_verified}, '${user.password_hash}', '${user.display_name}', '${user.avatar_url}', ${user.phone ? `'${user.phone}'` : 'NULL'}, ${user.phone_verified}, '${user.role}', '${escapedJSON(user.metadata).replace(/"/g, '\\"')}', ${user.is_active}, '${user.last_sign_in}', '${user.created_at}', '${user.updated_at}');\n`;
  }
  
  sql += '\n-- ===== PHISHING SCANS INSERTS =====\n';
  for (const scan of phishingScans) {
    const escapedContent = scan.content.replace(/'/g, "''");
    sql += `INSERT INTO phishing_scans (id, user_id, scan_type, content, threat_level, confidence, indicators, analysis, is_deleted, synced, created_at, updated_at) VALUES ('${scan.id}', '${scan.user_id}', '${scan.scan_type}', '${escapedContent}', '${scan.threat_level}', ${scan.confidence}, '${scan.indicators.replace(/'/g, "''")}', '${scan.analysis.replace(/'/g, "''")}', ${scan.is_deleted}, ${scan.synced}, '${scan.created_at}', '${scan.updated_at}');\n`;
  }
  
  sql += '\n-- ===== TRAINING RECORDS INSERTS =====\n';
  for (const record of trainingRecords) {
    const escapedContent = record.content.replace(/'/g, "''");
    const escapedNotes = record.notes ? record.notes.replace(/'/g, "''") : '';
    sql += `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, notes, synced, created_at) VALUES ('${record.id}', '${record.dataset_id}', '${escapedContent}', '${record.scan_type}', ${record.is_phishing}, '${record.threat_level}', '${record.indicators.replace(/'/g, "''")}', '${escapedNotes}', ${record.synced}, '${record.created_at}');\n`;
  }
  
  sql += '\n-- ===== MODEL VERSIONS INSERTS =====\n';
  for (const version of modelVersions) {
    const escapedDesc = version.description ? version.description.replace(/'/g, "''") : '';
    sql += `INSERT INTO model_versions (id, version_number, description, model_type, training_dataset_id, training_started_at, training_completed_at, training_duration, status, is_active, metrics, config, created_by, synced, created_at, updated_at) VALUES ('${version.id}', '${version.version_number}', '${escapedDesc}', '${version.model_type}', '${version.training_dataset_id}', '${version.training_started_at}', '${version.training_completed_at}', ${version.training_duration}, '${version.status}', ${version.is_active}, '${version.metrics.replace(/'/g, "''")}', '${version.config.replace(/'/g, "''")}', '${version.created_by}', ${version.synced}, '${version.created_at}', '${version.updated_at}');\n`;
  }
  
  sql += '\n-- ===== MODEL TESTS INSERTS =====\n';
  for (const test of modelTests) {
    const escapedName = test.test_name ? test.test_name.replace(/'/g, "''") : '';
    sql += `INSERT INTO model_tests (id, model_version_id, test_name, test_dataset_id, test_type, status, results, metrics, started_at, completed_at, created_by, synced, created_at) VALUES ('${test.id}', '${test.model_version_id}', '${escapedName}', '${test.test_dataset_id}', '${test.test_type}', '${test.status}', '${test.results.replace(/'/g, "''")}', '${test.metrics.replace(/'/g, "''")}', '${test.started_at}', '${test.completed_at}', '${test.created_by}', ${test.synced}, '${test.created_at}');\n`;
  }
  
  return sql;
}

// Export or execute
if (typeof module !== 'undefined' && module.exports) {
  module.exports = generateAllInserts;
  
  // If run directly
  if (require.main === module) {
    const sql = generateAllInserts();
    console.log('\n📝 SQL generated successfully!');
    console.log('Save this to a file and execute in your database:');
    console.log('\n--- START SQL ---\n');
    console.log(sql);
    console.log('\n--- END SQL ---\n');
  }
}
