#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Phishing indicators
const urlPhishingIndicators = [
  "suspicious_tld",
  "ip_address_domain",
  "url_obfuscation",
  "typosquatting",
  "homograph_attack",
  "shortened_url",
  "port_number",
  "subdomain_anomaly",
  "special_characters",
  "internationalized_domain",
];

const emailIndicators = [
  "sender_spoofing",
  "suspicious_links",
  "urgent_language",
  "spelling_errors",
  "phishing_attachment",
  "request_sensitive_info",
  "executive_impersonation",
  "reply_to_mismatch",
  "dkim_fail",
  "spf_fail",
];

const smsIndicators = [
  "urgency_tone",
  "shortened_url",
  "suspicious_link",
  "account_verification",
  "monetary_request",
  "unusual_sender",
  "misspelled_brand",
  "fraudulent_offer",
];

const qrIndicators = [
  "suspicious_url",
  "encoded_phishing_link",
  "malware_url",
  "obfuscated_link",
  "typosquatting_url",
];

// Generate realistic URLs
function generateURL(isPhishing) {
  const legitimateDomains = [
    "google.com",
    "microsoft.com",
    "apple.com",
    "amazon.com",
    "facebook.com",
    "twitter.com",
    "linkedin.com",
    "github.com",
    "stackoverflow.com",
    "wikipedia.org",
  ];

  const phishingPatterns = [
    "gogle-verify.com",
    "micros0ft-account.net",
    "appl-security.xyz",
    "amaz0n-login.tk",
    "faceb00k-confirm.ml",
    "secure-verify-account.pw",
    "confirm-identity-now.tk",
    "urgent-action-required.ga",
  ];

  const domain = isPhishing
    ? phishingPatterns[Math.floor(Math.random() * phishingPatterns.length)]
    : legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)];

  const paths = ["/login", "/signin", "/verify", "/account", "/security"];
  const path = paths[Math.floor(Math.random() * paths.length)];

  return `https://${domain}${path}?id=${Math.random().toString(36).substring(7)}`;
}

// Generate realistic email content
function generateEmailContent(isPhishing) {
  const legitimateSenders = [
    "support@google.com",
    "noreply@microsoft.com",
    "security@apple.com",
    "account-team@amazon.com",
  ];

  const phishingSenders = [
    "support@gogle-verify.com",
    "security@micros0ft-login.net",
    "verify@appl-security.xyz",
  ];

  const sender = isPhishing
    ? phishingSenders[Math.floor(Math.random() * phishingSenders.length)]
    : legitimateSenders[Math.floor(Math.random() * legitimateSenders.length)];

  const subject = isPhishing
    ? "URGENT: Verify your account immediately"
    : "Service update notification";

  return JSON.stringify({
    sender,
    subject,
    body: isPhishing
      ? "Click here to verify your identity"
      : "Information only",
  });
}

// Generate realistic SMS content
function generateSMSContent(isPhishing) {
  const legitimateSMS = [
    "Your verification code is: 123456",
    "You are all set to access your account",
    "Thank you for using our service",
    "Your delivery is on the way",
  ];

  const phishingSMS = [
    "URGENT: Verify now verify.tk",
    "Account suspended. Confirm identity immediately",
    "Claim your reward - limited time",
    "Update payment info urgently",
  ];

  return isPhishing
    ? phishingSMS[Math.floor(Math.random() * phishingSMS.length)]
    : legitimateSMS[Math.floor(Math.random() * legitimateSMS.length)];
}

// Generate unique ID
function generateId() {
  return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Escape SQL string
function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

// Generate training records for a dataset
function generateDatasetRecords(
  datasetId,
  count,
  scanType,
  phishingRatio = 0.4
) {
  const records = [];
  const phishingCount = Math.floor(count * phishingRatio);
  const legitimateCount = count - phishingCount;

  let indicatorPool = [];
  let contentGenerator = generateURL;

  if (scanType === "email") {
    indicatorPool = emailIndicators;
    contentGenerator = generateEmailContent;
  } else if (scanType === "sms") {
    indicatorPool = smsIndicators;
    contentGenerator = generateSMSContent;
  } else if (scanType === "qr") {
    indicatorPool = qrIndicators;
    contentGenerator = generateURL;
  } else {
    indicatorPool = urlPhishingIndicators;
  }

  // Generate phishing records
  for (let i = 0; i < phishingCount; i++) {
    const selectedIndicators = indicatorPool
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);

    records.push({
      id: generateId(),
      dataset_id: datasetId,
      content: contentGenerator(true),
      scan_type: scanType,
      is_phishing: 1,
      threat_level: Math.random() > 0.5 ? "high" : "medium",
      indicators: JSON.stringify(selectedIndicators),
      created_at: new Date().toISOString(),
    });
  }

  // Generate legitimate records
  for (let i = 0; i < legitimateCount; i++) {
    records.push({
      id: generateId(),
      dataset_id: datasetId,
      content: contentGenerator(false),
      scan_type: scanType,
      is_phishing: 0,
      threat_level: "low",
      indicators: JSON.stringify([]),
      created_at: new Date().toISOString(),
    });
  }

  return records;
}

// Create SQL insert statement
function createBatchInsertSQL(records) {
  const values = records
    .map(
      (r) =>
        `('${r.id}', '${r.dataset_id}', '${escapeSqlString(r.content)}', '${r.scan_type}', ${r.is_phishing}, '${r.threat_level}', '${escapeSqlString(r.indicators)}', '${r.created_at}')`
    )
    .join(",");

  return `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, created_at) VALUES ${values};`;
}

// Main function
async function main() {
  console.log("🚀 Starting dataset population...\n");

  const datasets = [
    { id: "ds_phishing_urls", count: 15000, type: "url", ratio: 0.4 },
    { id: "ds_phishing_emails", count: 8500, type: "email", ratio: 0.35 },
    { id: "ds_sms_phishing", count: 5200, type: "sms", ratio: 0.45 },
    { id: "ds_qr_phishing", count: 3800, type: "qr", ratio: 0.5 },
    { id: "ds_kaggle_urls", count: 11000, type: "url", ratio: 0.4 },
    { id: "ds_custom_training", count: 4200, type: "mixed", ratio: 0.42 },
  ];

  let totalSQLStatements = 0;
  const sqlFile = path.join(__dirname, "../generated-dataset-inserts.sql");
  let allSQL = "-- Training Dataset Population SQL\n-- Generated at " + new Date().toISOString() + "\n\n";

  for (const dataset of datasets) {
    console.log(`📊 Generating ${dataset.count} records for ${dataset.id}...`);

    const records = generateDatasetRecords(
      dataset.id,
      dataset.count,
      dataset.type,
      dataset.ratio
    );

    console.log(
      `✓ Generated ${records.length} records. Creating SQL statements...`
    );

    // Process in chunks to avoid SQL statement size limits
    const chunkSize = 100;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, Math.min(i + chunkSize, records.length));
      const sql = createBatchInsertSQL(chunk);
      allSQL += sql + "\n";
      totalSQLStatements++;
    }

    console.log(`✓ Created ${Math.ceil(records.length / chunkSize)} SQL statements\n`);
  }

  // Write SQL file
  fs.writeFileSync(sqlFile, allSQL);
  console.log(`\n✅ Generated SQL file: ${sqlFile}`);
  console.log(`📝 Total SQL INSERT statements: ${totalSQLStatements}`);
  console.log(`💾 File size: ${(fs.statSync(sqlFile).size / 1024 / 1024).toFixed(2)} MB`);
  console.log(
    `\n📋 Next steps:\n   1. Copy the SQL file content\n   2. Paste into your database admin panel\n   3. Execute the SQL to populate all datasets`
  );
}

main().catch(console.error);
