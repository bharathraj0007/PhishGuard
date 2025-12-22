import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const PROJECT_ID = Deno.env.get("BLINK_PROJECT_ID")!;
const SECRET_KEY = Deno.env.get("BLINK_SECRET_KEY");

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Max-Age": "86400",
};

interface TrainingRecord {
  dataset_id: string;
  content: string;
  scan_type: "url" | "sms" | "email";
  is_phishing: 0 | 1;
  threat_level?: string;
  indicators?: string;
}

// Helper to make authenticated API calls to Blink
async function blinkApiCall(
  method: string,
  endpoint: string,
  body?: any
): Promise<any> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (SECRET_KEY) {
    headers["Authorization"] = `Bearer ${SECRET_KEY}`;
  }

  const url = `https://api.blink.new${endpoint}`;

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function processURLData(
  csvData: string,
  datasetId: string
): Promise<TrainingRecord[]> {
  const lines = csvData.trim().split("\n");
  const records: TrainingRecord[] = [];

  // Skip header and process URL data
  for (let i = 1; i < Math.min(i + 5000, lines.length); i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const parts = line.split("|");
    const url = parts[0]?.trim();
    const status = parts[parts.length - 1]?.trim();

    if (!url || !status) continue;

    records.push({
      dataset_id: datasetId,
      content: url.substring(0, 500), // Limit content length
      scan_type: "url",
      is_phishing: status === "phishing" ? 1 : 0,
      threat_level: status === "phishing" ? "high" : "none",
      indicators: status === "phishing" ? "suspicious_url_pattern" : "",
    });
  }

  return records;
}

async function processSMSData(
  csvData: string,
  datasetId: string
): Promise<TrainingRecord[]> {
  const lines = csvData.trim().split("\n");
  const records: TrainingRecord[] = [];

  // Skip header
  for (let i = 1; i < Math.min(i + 2000, lines.length); i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV: label | content
    const pipeIndex = line.indexOf("|");
    if (pipeIndex === -1) continue;

    const label = line.substring(0, pipeIndex).trim();
    const content = line.substring(pipeIndex + 1).trim();

    if (!content || content.length < 3) continue;

    records.push({
      dataset_id: datasetId,
      content: content.substring(0, 500),
      scan_type: "sms",
      is_phishing: label === "spam" ? 1 : 0,
      threat_level: label === "spam" ? "medium" : "none",
      indicators:
        label === "spam"
          ? "promotional_content,urgent_action_required"
          : "",
    });
  }

  return records;
}

async function populateTrainingRecords(
  records: TrainingRecord[],
  batchSize: number = 100
): Promise<{ inserted: number; errors: number }> {
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, Math.min(i + batchSize, records.length));

    try {
      // Insert batch via API
      await blinkApiCall(
        "POST",
        `/v1/projects/${PROJECT_ID}/databases/training_records/batch`,
        { records: batch }
      );

      inserted += batch.length;
      console.log(`Inserted ${inserted}/${records.length} records...`);
    } catch (error) {
      errors += batch.length;
      console.error(`Error inserting batch: ${error}`);
    }

    // Delay to prevent rate limiting
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return { inserted, errors };
}

async function createOrUpdateDataset(
  name: string,
  datasetType: "url" | "sms" | "email"
): Promise<string> {
  try {
    // Create new dataset
    const response = await blinkApiCall(
      "POST",
      `/v1/projects/${PROJECT_ID}/databases/training_datasets`,
      {
        name: name,
        description: `Training dataset for ${datasetType} phishing detection`,
        dataset_type: datasetType,
        record_count: 0,
        uploaded_by: "system",
        status: "active",
        is_active: 1,
      }
    );

    return response.id;
  } catch (error) {
    console.error(`Error creating dataset: ${error}`);
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const { dataset_type, csv_url, dataset_name } = body;

    if (!dataset_type || !csv_url) {
      return new Response(
        JSON.stringify({
          error: "Missing dataset_type or csv_url",
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch CSV data
    const response = await fetch(csv_url);
    const csvData = await response.text();

    // Create dataset
    const datasetId = await createOrUpdateDataset(
      dataset_name || `${dataset_type}_phishing_dataset`,
      dataset_type as "url" | "sms" | "email"
    );

    console.log(`Processing ${dataset_type} data...`);
    let records: TrainingRecord[] = [];

    if (dataset_type === "url") {
      records = await processURLData(csvData, datasetId);
    } else if (dataset_type === "sms") {
      records = await processSMSData(csvData, datasetId);
    } else if (dataset_type === "email") {
      // For email, treat CSV similarly to URL data
      const lines = csvData.trim().split("\n");

      for (let i = 1; i < Math.min(i + 5000, lines.length); i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const parts = line.split("|");
        const content = parts.slice(0, -1).join(" ");
        const label = parts[parts.length - 1]?.trim();

        if (!content || content.length < 3) continue;

        records.push({
          dataset_id: datasetId,
          content: content.substring(0, 500),
          scan_type: "email",
          is_phishing: label === "phishing" ? 1 : 0,
          threat_level: label === "phishing" ? "high" : "none",
          indicators:
            label === "phishing"
              ? "suspicious_sender,phishing_keywords"
              : "",
        });
      }
    }

    console.log(`Populated ${records.length} records from CSV`);

    // Insert records into database
    const result = await populateTrainingRecords(records);

    // Update dataset record count
    await blinkApiCall(
      "PATCH",
      `/v1/projects/${PROJECT_ID}/databases/training_datasets/${datasetId}`,
      {
        record_count: result.inserted,
        status: "active",
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        dataset_id: datasetId,
        dataset_type: dataset_type,
        records_inserted: result.inserted,
        errors: result.errors,
        message: `Successfully populated ${result.inserted} training records`,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in CSV loader:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
