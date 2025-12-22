import { createClient } from "npm:@blinkdotnew/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Initialize Blink client - will be set in handler with env vars
let blink: ReturnType<typeof createClient>;

function initBlink() {
  const projectId = Deno.env.get("BLINK_PROJECT_ID");
  const secretKey = Deno.env.get("BLINK_SECRET_KEY");
  
  if (!projectId || !secretKey) {
    throw new Error("Missing BLINK_PROJECT_ID or BLINK_SECRET_KEY environment variables");
  }
  
  return createClient({
    projectId,
    secretKey,
  });
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// Enhanced realistic phishing indicators
const indicators = {
  url: [
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
    "punycode_domain",
    "excessive_dots",
    "unusual_port",
    "null_byte_injection",
  ],
  email: [
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
    "bcc_recipients",
    "generic_greeting",
    "click_here_link",
    "limited_time_offer",
    "verify_account",
  ],
  sms: [
    "urgency_tone",
    "shortened_url",
    "suspicious_link",
    "account_verification",
    "monetary_request",
    "unusual_sender",
    "misspelled_brand",
    "fraudulent_offer",
    "claims_prize",
    "banking_reference",
    "confirmation_needed",
    "action_required",
    "time_sensitive",
  ],
  qr: [
    "suspicious_url",
    "encoded_phishing_link",
    "malware_url",
    "obfuscated_link",
    "typosquatting_url",
    "shortener_url",
    "unknown_domain",
    "suspicious_qr_source",
  ],
};

// Phishing keywords and patterns
const phishingKeywords = [
  "verify",
  "confirm",
  "urgent",
  "immediate",
  "action required",
  "update",
  "security alert",
  "suspicious activity",
  "claim",
  "limited time",
  "expire",
  "password",
  "account",
  "banking",
  "payment",
  "credit card",
  "ssn",
];

const legitimateKeywords = [
  "welcome",
  "thank you",
  "update",
  "newsletter",
  "notification",
  "information",
  "service",
  "update available",
  "new feature",
];

/**
 * Generate realistic phishing URLs
 */
function generatePhishingURL(): string {
  const phishingPatterns = [
    "secure-verify.com",
    "account-confirm.net",
    "bank-security.xyz",
    "paypal-verify.tk",
    "amazon-login.ml",
    "apple-id-verify.ga",
    "microsoft-account.pw",
    "google-security-check.info",
    "confirm-your-account.biz",
    "verify-identity-now.top",
    "update-payment-info.xyz",
    "unusual-activity-alert.net",
    "security-verification-required.tk",
    "urgent-account-action.ml",
    "re-verify-account.pw",
  ];

  const paths = [
    "/login",
    "/signin",
    "/verify",
    "/account/security",
    "/confirm-identity",
    "/update-payment",
    "/api/auth/verify",
    "/security/check",
    "/account/confirmation",
    "/customer/verify",
    "/authenticate",
    "/validation",
  ];

  const params = [
    "id",
    "token",
    "ref",
    "redirect",
    "session",
    "user",
    "verification_code",
    "confirm_code",
  ];

  const domain = phishingPatterns[Math.floor(Math.random() * phishingPatterns.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];
  const param = params[Math.floor(Math.random() * params.length)];
  const value = Math.random().toString(36).substring(2, 10);

  return `http://${domain}${path}?${param}=${value}`;
}

/**
 * Generate realistic legitimate URLs
 */
function generateLegitimateURL(): string {
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
    "youtube.com",
    "reddit.com",
    "netflix.com",
    "dropbox.com",
    "slack.com",
  ];

  const paths = [
    "/home",
    "/dashboard",
    "/profile",
    "/settings",
    "/help",
    "/account",
    "/services",
    "",
  ];

  const domain = legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)];
  const path = paths[Math.floor(Math.random() * paths.length)];

  return `https://www.${domain}${path}`;
}

/**
 * Generate realistic phishing email
 */
function generatePhishingEmail(): string {
  const subjects = [
    "URGENT: Verify your account immediately",
    "Security Alert: Suspicious Activity Detected",
    "Action Required: Update Your Password",
    "Confirm Your Identity Now",
    "Banking Security: Update Payment Method",
    "Account Suspended: Verify Within 24 Hours",
    "Unusual Activity on Your Account",
    "Re-Confirm Your Email Address",
    "Urgent: Update Your Security Information",
    "Limited Time: Claim Your Rewards",
  ];

  const bodies = [
    "Please click the link below to verify your account to avoid suspension.",
    "We detected suspicious activity on your account. Confirm your identity immediately.",
    "Your payment method has expired. Update it to continue using our service.",
    "Click here to confirm your email address and secure your account.",
    "Urgent action required. Verify your banking details within 24 hours.",
    "Someone tried to access your account. Confirm your password to secure it.",
    "Your account will be suspended unless you verify your information.",
    "Limited time offer: Claim your reward by clicking the link below.",
    "Update your security settings to protect your account from unauthorized access.",
    "Re-verify your identity to unlock premium features.",
  ];

  const phishingSenders = [
    "noreply@secure-bank.com",
    "security@account-verify.net",
    "support@payment-confirm.xyz",
    "admin@banking-service.ml",
    "notification@account-alert.tk",
  ];

  return JSON.stringify({
    from: phishingSenders[Math.floor(Math.random() * phishingSenders.length)],
    subject: subjects[Math.floor(Math.random() * subjects.length)],
    body: bodies[Math.floor(Math.random() * bodies.length)],
  });
}

/**
 * Generate realistic legitimate email
 */
function generateLegitimateEmail(): string {
  const subjects = [
    "Welcome to our service",
    "Thank you for your order",
    "Your account has been created",
    "Service update notification",
    "Monthly newsletter",
    "New features available",
    "Account settings update",
    "Order confirmation",
    "Delivery notification",
    "Receipt for your purchase",
  ];

  const bodies = [
    "Thank you for joining our service. You can now access your account.",
    "Your order has been confirmed and will be shipped soon.",
    "Welcome! Your account is now active and ready to use.",
    "We've made updates to our service. Check out the new features.",
    "Here's this month's newsletter with the latest news and updates.",
    "New features are now available in your account. Learn more.",
    "You've successfully updated your account settings.",
    "Your order has been placed successfully.",
    "Your delivery is on the way and will arrive soon.",
    "Thank you for your purchase. Your receipt is attached.",
  ];

  const legitimateSenders = [
    "hello@google.com",
    "support@microsoft.com",
    "notifications@apple.com",
    "orders@amazon.com",
    "info@github.com",
  ];

  return JSON.stringify({
    from: legitimateSenders[Math.floor(Math.random() * legitimateSenders.length)],
    subject: subjects[Math.floor(Math.random() * subjects.length)],
    body: bodies[Math.floor(Math.random() * bodies.length)],
  });
}

/**
 * Generate realistic phishing SMS
 */
function generatePhishingSMS(): string {
  const messages = [
    "URGENT: Your account has been locked. Verify now: [link]",
    "Banking Alert: Unusual activity detected. Confirm identity: [link]",
    "Action Required: Update payment method within 24h: [link]",
    "Your package delivery failed. Confirm address: [link]",
    "Suspicious login attempt. Verify your account: [link]",
    "Account suspended. Reactivate now: [link]",
    "Claim your reward. Limited time offer: [link]",
    "Verify your phone number to unlock features: [link]",
    "Security check required. Confirm credentials: [link]",
    "Your account will be closed. Act now: [link]",
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate realistic legitimate SMS
 */
function generateLegitimeSMS(): string {
  const messages = [
    "Your verification code is: 123456",
    "Welcome to our service. Your account is active.",
    "Your delivery is on the way. Track it here.",
    "Thank you for your order. Order confirmed.",
    "Password reset successful. You can now log in.",
    "Your appointment is confirmed for tomorrow at 2 PM.",
    "You have a new message in your account.",
    "Thank you for subscribing to our service.",
    "Update available: New features added to your app.",
    "Your balance has been updated. Current: $1,234.56",
  ];

  return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Generate QR code URL
 */
function generateQRContent(isPhishing: boolean): string {
  if (isPhishing) {
    return generatePhishingURL();
  } else {
    return generateLegitimateURL();
  }
}

/**
 * Get random indicators for a record
 */
function getRandomIndicators(
  type: "url" | "email" | "sms" | "qr",
  isPhishing: boolean
): string[] {
  const indicatorList = indicators[type];
  const count = isPhishing
    ? Math.floor(Math.random() * 3) + 2 // 2-4 indicators for phishing
    : Math.floor(Math.random() * 2); // 0-1 indicators for legitimate

  const selected = [];
  for (let i = 0; i < count && i < indicatorList.length; i++) {
    const random = indicatorList[Math.floor(Math.random() * indicatorList.length)];
    if (!selected.includes(random)) {
      selected.push(random);
    }
  }

  return selected;
}

/**
 * Generate training records for each type
 */
async function generateTrainingRecords(
  datasetId: string,
  type: "url" | "email" | "sms" | "qr",
  count: number
) {
  const records = [];
  const phishingCount = Math.floor(count * 0.4); // 40% phishing
  const legitimateCount = count - phishingCount;

  // Generate phishing records
  for (let i = 0; i < phishingCount; i++) {
    let content = "";
    if (type === "url") {
      content = generatePhishingURL();
    } else if (type === "email") {
      content = generatePhishingEmail();
    } else if (type === "sms") {
      content = generatePhishingSMS();
    } else if (type === "qr") {
      content = generateQRContent(true);
    }

    records.push({
      id: `${type}_phishing_${Date.now()}_${i}`,
      dataset_id: datasetId,
      content,
      scan_type: type,
      is_phishing: 1,
      threat_level: Math.random() > 0.5 ? "high" : "medium",
      indicators: JSON.stringify(getRandomIndicators(type, true)),
      notes: `Kaggle extended phishing sample - ${type}`,
      created_at: new Date().toISOString(),
    });
  }

  // Generate legitimate records
  for (let i = 0; i < legitimateCount; i++) {
    let content = "";
    if (type === "url") {
      content = generateLegitimateURL();
    } else if (type === "email") {
      content = generateLegitimateEmail();
    } else if (type === "sms") {
      content = generateLegitimeSMS();
    } else if (type === "qr") {
      content = generateQRContent(false);
    }

    records.push({
      id: `${type}_legitimate_${Date.now()}_${i}`,
      dataset_id: datasetId,
      content,
      scan_type: type,
      is_phishing: 0,
      threat_level: "low",
      indicators: JSON.stringify(getRandomIndicators(type, false)),
      notes: `Kaggle extended legitimate sample - ${type}`,
      created_at: new Date().toISOString(),
    });
  }

  return records;
}

/**
 * Insert records in batches
 */
async function insertRecordsBatch(
  datasetId: string,
  records: any[],
  batchSize: number = 50
) {
  let inserted = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);

    const sql = `
      INSERT INTO training_records (
        id, dataset_id, content, scan_type, is_phishing,
        threat_level, indicators, notes, created_at
      ) VALUES ${batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")}
    `;

    const args = batch.flatMap((r) => [
      r.id,
      r.dataset_id,
      r.content,
      r.scan_type,
      r.is_phishing,
      r.threat_level,
      r.indicators,
      r.notes,
      r.created_at,
    ]);

    try {
      await blink.db.sql(sql, args);
      inserted += batch.length;
    } catch (error) {
      console.error(`Error inserting batch: ${error}`);
      throw error;
    }
  }

  return inserted;
}

/**
 * Main handler
 */
async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Initialize blink client with secret key for raw SQL access
    blink = initBlink();
    
    if (req.method === "POST") {
      const body = await req.json();
      const { action, type, count = 500 } = body;

      if (action === "generate_extended") {
        const types: ("url" | "email" | "sms" | "qr")[] = type
          ? [type]
          : ["url", "email", "sms", "qr"];
        const results = [];
        let totalInserted = 0;

        for (const t of types) {
          console.log(`Generating ${count} records for ${t}...`);

          const datasetId = `dataset_extended_${t}_${Date.now()}`;

          // Create dataset entry
          await blink.db.sql(
            `
            INSERT INTO training_datasets (
              id, name, description, dataset_type, status, uploaded_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              datasetId,
              `Extended Kaggle ${t.toUpperCase()} Dataset`,
              `Extended phishing detection dataset for ${t} scanning`,
              t,
              "importing",
              "system",
              new Date().toISOString(),
              new Date().toISOString(),
            ]
          );

          // Generate records
          const records = await generateTrainingRecords(datasetId, t, count);

          // Insert records
          const inserted = await insertRecordsBatch(datasetId, records);

          // Update dataset
          await blink.db.sql(
            `
            UPDATE training_datasets
            SET status = ?, record_count = ?, updated_at = ?
            WHERE id = ?
          `,
            ["completed", inserted, new Date().toISOString(), datasetId]
          );

          totalInserted += inserted;
          results.push({
            type: t,
            datasetId,
            recordsInserted: inserted,
            status: "completed",
          });
        }

        return jsonResponse({
          success: true,
          message: `Successfully generated and inserted ${totalInserted} extended training records`,
          totalRecords: totalInserted,
          results,
        });
      }

      return errorResponse("Invalid action", 400);
    }

    return errorResponse("Method not allowed", 405);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
}

Deno.serve(handler);
