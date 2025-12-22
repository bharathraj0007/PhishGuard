/**
 * Dataset Population Helper
 * Generates realistic phishing and legitimate records for training datasets
 */

import { blink } from "./blink";

export interface TrainingRecordInput {
  datasetId: string;
  content: string;
  scanType: string;
  isPhishing: number;
  threatLevel: string;
  indicators: string;
}

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

const phishingDomains = [
  "gogle-verify.com",
  "micros0ft-account.net",
  "appl-security.xyz",
  "amaz0n-login.tk",
  "faceb00k-confirm.ml",
  "secure-verify-account.pw",
  "confirm-identity-now.tk",
  "urgent-action-required.ga",
];

export function generateURL(isPhishing: boolean): string {
  const domain = isPhishing
    ? phishingDomains[Math.floor(Math.random() * phishingDomains.length)]
    : legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)];

  const paths = ["/login", "/signin", "/verify", "/account", "/security"];
  const path = paths[Math.floor(Math.random() * paths.length)];

  return `https://${domain}${path}?id=${Math.random().toString(36).substring(7)}`;
}

export function generateEmailContent(isPhishing: boolean): string {
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

export function generateSMSContent(isPhishing: boolean): string {
  const legitimateSMS = [
    "Your verification code is: 123456",
    "You are all set to access your account",
    "Thank you for using our service",
    "Your delivery is on the way",
  ];

  const phishingSMS = [
    "URGENT: Verify now verify.tk",
    "Account suspended. Confirm identity immediately",
    "Claim your reward - limited time offer",
    "Update payment info urgently required",
  ];

  return isPhishing
    ? phishingSMS[Math.floor(Math.random() * phishingSMS.length)]
    : legitimateSMS[Math.floor(Math.random() * legitimateSMS.length)];
}

export function generateId(): string {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function selectRandomIndicators(
  indicatorPool: string[],
  count: number = 3
): string[] {
  const shuffled = [...indicatorPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(Math.floor(Math.random() * count) + 1, shuffled.length));
}

export async function generateAndInsertDatasetRecords(
  datasetId: string,
  count: number,
  scanType: string,
  phishingRatio: number = 0.4
): Promise<{ success: boolean; inserted: number; error?: string }> {
  try {
    const phishingCount = Math.floor(count * phishingRatio);
    const legitimateCount = count - phishingCount;

    let indicatorPool: string[] = [];
    let contentGenerator: (isPhishing: boolean) => string = generateURL;

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

    const records: TrainingRecordInput[] = [];

    // Generate phishing records
    for (let i = 0; i < phishingCount; i++) {
      const selectedIndicators = selectRandomIndicators(indicatorPool);
      records.push({
        datasetId,
        content: contentGenerator(true),
        scanType,
        isPhishing: 1,
        threatLevel: Math.random() > 0.5 ? "high" : "medium",
        indicators: JSON.stringify(selectedIndicators),
      });
    }

    // Generate legitimate records
    for (let i = 0; i < legitimateCount; i++) {
      records.push({
        datasetId,
        content: contentGenerator(false),
        scanType,
        isPhishing: 0,
        threatLevel: "low",
        indicators: JSON.stringify([]),
      });
    }

    // Insert in batches of 100
    const batchSize = 100;
    let totalInserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, Math.min(i + batchSize, records.length));
      const recordsWithId = batch.map((r) => ({
        id: generateId(),
        ...r,
      }));

      await blink.db.trainingRecords.createMany(recordsWithId);
      totalInserted += batch.length;
    }

    return { success: true, inserted: totalInserted };
  } catch (error) {
    return {
      success: false,
      inserted: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function populateAllDatasets(): Promise<{
  success: boolean;
  results: Array<{
    dataset: string;
    count: number;
    type: string;
    inserted: number;
    status: string;
  }>;
}> {
  const datasets = [
    { id: "ds_phishing_urls", count: 15000, type: "url", ratio: 0.4 },
    { id: "ds_phishing_emails", count: 8500, type: "email", ratio: 0.35 },
    { id: "ds_sms_phishing", count: 5200, type: "sms", ratio: 0.45 },
    { id: "ds_qr_phishing", count: 3800, type: "qr", ratio: 0.5 },
    { id: "ds_kaggle_urls", count: 11000, type: "url", ratio: 0.4 },
    { id: "ds_custom_training", count: 4200, type: "mixed", ratio: 0.42 },
  ];

  const results = [];

  for (const dataset of datasets) {
    console.log(
      `Populating ${dataset.id} with ${dataset.count} records...`
    );

    const result = await generateAndInsertDatasetRecords(
      dataset.id,
      dataset.count,
      dataset.type,
      dataset.ratio
    );

    results.push({
      dataset: dataset.id,
      count: dataset.count,
      type: dataset.type,
      inserted: result.inserted,
      status: result.success ? "success" : "failed",
    });

    console.log(
      `${result.success ? "✓" : "✗"} ${dataset.id}: ${result.inserted}/${dataset.count} records`
    );
  }

  return {
    success: results.every((r) => r.status === "success"),
    results,
  };
}

/**
 * Check dataset population status
 */
export async function checkDatasetStatus(): Promise<{
  datasets: Array<{
    id: string;
    name: string;
    expectedCount: number;
    actualCount: number;
    populated: boolean;
  }>;
}> {
  const datasets = [
    { id: "ds_phishing_urls", name: "Phishing URLs Dataset", count: 15000 },
    { id: "ds_phishing_emails", name: "Email Phishing Dataset", count: 8500 },
    { id: "ds_sms_phishing", name: "SMS Phishing Dataset", count: 5200 },
    { id: "ds_qr_phishing", name: "QR Code Phishing Dataset", count: 3800 },
    { id: "ds_kaggle_urls", name: "Kaggle Phishing URLs", count: 11000 },
    { id: "ds_custom_training", name: "Custom Training Set", count: 4200 },
  ];

  const result = [];

  for (const dataset of datasets) {
    const count = await blink.db.trainingRecords.count({
      where: { datasetId: dataset.id },
    });

    result.push({
      id: dataset.id,
      name: dataset.name,
      expectedCount: dataset.count,
      actualCount: count,
      populated: count > 0,
    });
  }

  return { datasets: result };
}
