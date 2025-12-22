import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const BLINK_SECRET_KEY = Deno.env.get("BLINK_SECRET_KEY");

interface TrainingRecord {
  id: string;
  dataset_id: string;
  content: string;
  scan_type: string;
  is_phishing: number;
  threat_level: string;
  indicators: string;
  created_at: string;
}

// Generate realistic phishing indicators
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
function generateURL(isPhishing: boolean): string {
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

  const paths = [
    "/login",
    "/signin",
    "/verify",
    "/account",
    "/security",
    "/confirm",
    "/api/auth",
  ];
  const path = paths[Math.floor(Math.random() * paths.length)];

  return `https://${domain}${path}?id=${Math.random().toString(36).substring(7)}`;
}

// Generate realistic email content
function generateEmailContent(isPhishing: boolean): string {
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
    ? `URGENT: Verify your account immediately`
    : `Service update notification`;

  return JSON.stringify({
    sender,
    subject,
    body: isPhishing ? "Click here to verify" : "Information only",
  }).replace(/"/g, '\\"');
}

// Generate realistic SMS content
function generateSMSContent(isPhishing: boolean): string {
  const legitimateSMS = [
    "Your verification code is: 123456",
    "You are all set to access your account",
    "Thank you for using our service",
    "Your delivery is on the way",
  ];

  const phishingSMS = [
    "URGENT: Verify now urgent-verify.tk",
    "Account suspended. Confirm identity immediately",
    "Claim your reward - limited time offer",
    "Update payment info urgently required",
  ];

  return isPhishing
    ? phishingSMS[Math.floor(Math.random() * phishingSMS.length)]
    : legitimateSMS[Math.floor(Math.random() * legitimateSMS.length)];
}

// Generate unique ID
function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Generate training records for a specific dataset
async function generateDatasetRecords(
  datasetId: string,
  count: number,
  scanType: string,
  phishingRatio: number = 0.4
): Promise<TrainingRecord[]> {
  const records: TrainingRecord[] = [];
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

// Create SQL insert statement for batch
function createBatchInsertSQL(records: TrainingRecord[]): string {
  const values = records
    .map(
      (r) =>
        `('${r.id}', '${r.dataset_id}', '${r.content.replace(/'/g, "''")}', '${r.scan_type}', ${r.is_phishing}, '${r.threat_level}', '${r.indicators.replace(/'/g, "''")}', '${r.created_at}')`
    )
    .join(",");

  return `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, created_at) VALUES ${values};`;
}

// Execute SQL via Blink Edge Function context
async function executeBatchSQL(sql: string): Promise<boolean> {
  try {
    // Using Deno's built-in fetch to call internal API
    const response = await fetch(
      "http://localhost:8000/api/internal/sql-execute",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${BLINK_SECRET_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!response.ok) {
      console.error(`SQL execution failed: ${response.statusText}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error executing SQL:", error);
    return false;
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const datasets = [
      { id: "ds_phishing_urls", count: 15000, type: "url", ratio: 0.4 },
      { id: "ds_phishing_emails", count: 8500, type: "email", ratio: 0.35 },
      { id: "ds_sms_phishing", count: 5200, type: "sms", ratio: 0.45 },
      { id: "ds_qr_phishing", count: 3800, type: "qr", ratio: 0.5 },
      { id: "ds_kaggle_urls", count: 11000, type: "url", ratio: 0.4 },
      { id: "ds_custom_training", count: 4200, type: "mixed", ratio: 0.42 },
    ];

    const results = [];
    let totalRecordsGenerated = 0;

    for (const dataset of datasets) {
      console.log(
        `Generating ${dataset.count} records for ${dataset.id}...`
      );

      const records = await generateDatasetRecords(
        dataset.id,
        dataset.count,
        dataset.type,
        dataset.ratio
      );

      console.log(`Generated ${records.length} records. Preparing to insert...`);

      // Process in smaller chunks to avoid SQL statement size limits
      const chunkSize = 50;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, Math.min(i + chunkSize, records.length));
        const sql = createBatchInsertSQL(chunk);

        console.log(`Inserting chunk ${Math.floor(i / chunkSize) + 1}`);
        // For now, just prepare the SQL
        totalRecordsGenerated += chunk.length;
      }

      results.push({
        dataset: dataset.id,
        recordsGenerated: records.length,
        status: "prepared",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Prepared ${totalRecordsGenerated} training records for population`,
        totalRecords: totalRecordsGenerated,
        results,
        note: "Records have been generated. Use database admin to insert or run SQL directly.",
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

serve(handler);
