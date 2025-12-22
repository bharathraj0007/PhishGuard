import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

interface DatasetInfo {
  id: string;
  name: string;
  expected_count: number;
  scan_type: string;
  phishing_ratio: number;
}

const DATASETS: DatasetInfo[] = [
  {
    id: "ds_phishing_urls",
    name: "Phishing URLs Dataset",
    expected_count: 15000,
    scan_type: "url",
    phishing_ratio: 0.4,
  },
  {
    id: "ds_phishing_emails",
    name: "Email Phishing Dataset",
    expected_count: 8500,
    scan_type: "email",
    phishing_ratio: 0.35,
  },
  {
    id: "ds_sms_phishing",
    name: "SMS Phishing Dataset",
    expected_count: 5200,
    scan_type: "sms",
    phishing_ratio: 0.45,
  },
  {
    id: "ds_qr_phishing",
    name: "QR Code Phishing Dataset",
    expected_count: 3800,
    scan_type: "qr",
    phishing_ratio: 0.5,
  },
  {
    id: "ds_kaggle_urls",
    name: "Kaggle Phishing URLs",
    expected_count: 11000,
    scan_type: "url",
    phishing_ratio: 0.4,
  },
  {
    id: "ds_custom_training",
    name: "Custom Training Set",
    expected_count: 4200,
    scan_type: "mixed",
    phishing_ratio: 0.42,
  },
];

// Generate realistic data
const urlPhishingDomains = [
  "gogle-verify.com",
  "micros0ft-account.net",
  "appl-security.xyz",
  "amaz0n-login.tk",
  "faceb00k-confirm.ml",
];

const legitimateDomains = [
  "google.com",
  "microsoft.com",
  "apple.com",
  "amazon.com",
  "facebook.com",
];

const indicators = {
  url: [
    "suspicious_tld",
    "ip_address_domain",
    "url_obfuscation",
    "typosquatting",
  ],
  email: [
    "sender_spoofing",
    "suspicious_links",
    "urgent_language",
    "spelling_errors",
  ],
  sms: ["urgency_tone", "shortened_url", "suspicious_link"],
  qr: ["suspicious_url", "encoded_phishing_link", "malware_url"],
};

function generateURL(isPhishing: boolean): string {
  const domain = isPhishing
    ? urlPhishingDomains[
        Math.floor(Math.random() * urlPhishingDomains.length)
      ]
    : legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)];
  return `https://${domain}/path?id=${Math.random().toString(36).substring(7)}`;
}

function generateID(): string {
  return `rec_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

async function handleStatus(req: Request): Promise<Response> {
  // This would normally query the database
  // For now, return mock status
  const status = DATASETS.map((dataset) => ({
    id: dataset.id,
    name: dataset.name,
    expected_count: dataset.expected_count,
    actual_count: Math.floor(Math.random() * dataset.expected_count), // Would query DB
    populated: true,
  }));

  return new Response(JSON.stringify({ success: true, datasets: status }), {
    headers: CORS_HEADERS,
    status: 200,
  });
}

async function handlePopulate(req: Request): Promise<Response> {
  try {
    const { force } = await req.json().catch(() => ({}));

    // Generate records for each dataset
    const results = [];

    for (const dataset of DATASETS) {
      const phishingCount = Math.floor(
        dataset.expected_count * dataset.phishing_ratio
      );
      const legitimateCount = dataset.expected_count - phishingCount;

      // In a real implementation, we would insert these into the database
      // For now, we just generate the structure

      const batchSize = 100;
      const batches = Math.ceil(dataset.expected_count / batchSize);

      results.push({
        dataset_id: dataset.id,
        name: dataset.name,
        total_records: dataset.expected_count,
        phishing_count: phishingCount,
        legitimate_count: legitimateCount,
        batches: batches,
        status: "prepared",
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Datasets prepared for population",
        results,
      }),
      {
        headers: CORS_HEADERS,
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: CORS_HEADERS,
        status: 500,
      }
    );
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS, status: 200 });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  if (path.includes("/status")) {
    return handleStatus(req);
  } else if (path.includes("/populate")) {
    return handlePopulate(req);
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    headers: CORS_HEADERS,
    status: 404,
  });
}

serve(handler);
