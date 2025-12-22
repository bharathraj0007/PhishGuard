import { createClient } from "npm:@blinkdotnew/sdk@^0.19.2";

const secretKey = Deno.env.get("BLINK_SECRET_KEY");
const projectId = Deno.env.get("BLINK_PROJECT_ID") || "phishguard-web-phishing-detector-eky2mdxr";

const blink = createClient({
  projectId,
  secretKey,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

/**
 * Detect CSV delimiter (comma or pipe)
 */
function detectDelimiter(csvText: string): string {
  const firstLines = csvText.split("\n").slice(0, 5).join("\n");
  const pipeCount = (firstLines.match(/\|/g) || []).length;
  const commaCount = (firstLines.match(/,/g) || []).length;
  return pipeCount > commaCount ? "|" : ",";
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(current.trim().replace(/^"|"$/g, ''));
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim().replace(/^"|"$/g, ''));
  return cells;
}

/**
 * Parse URL phishing dataset
 */
function parseURLDataset(csvText: string): any[] {
  const lines = csvText.trim().split("\n");
  const delimiter = detectDelimiter(csvText);
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());
  const records: any[] = [];

  console.log(`URL dataset - delimiter: ${delimiter}, headers: ${headers.join(", ")}`);

  // Find URL and status/label columns
  let urlIndex = headers.findIndex((h) => 
    h === "url" || h.includes("url") || h === "link" || h.includes("website")
  );
  let statusIndex = headers.findIndex((h) => 
    h === "status" || h === "label" || h === "type" || h.includes("phishing") || h.includes("class")
  );

  // Fallback: if no explicit headers, assume first column is URL and second/last is label
  if (urlIndex < 0) urlIndex = 0;
  if (statusIndex < 0) statusIndex = headers.length > 1 ? headers.length - 1 : 1;

  console.log(`URL parsing - urlIndex: ${urlIndex}, statusIndex: ${statusIndex}`);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = parseCSVLine(line, delimiter);
    if (cells.length < 2) continue;

    const url = cells[urlIndex] || "";
    const status = cells[statusIndex] || "";

    if (!url || url.length < 5) continue;

    // Determine if phishing
    const statusLower = status.toLowerCase();
    const isPhishing = statusLower === "phishing" || 
                       statusLower === "1" || 
                       statusLower === "bad" ||
                       statusLower === "malicious" ||
                       statusLower === "spam" ||
                       statusLower.includes("phish");

    records.push({
      content: url,
      isPhishing: isPhishing ? 1 : 0,
      threatLevel: isPhishing ? "high" : "low",
      indicators: JSON.stringify({
        urlLength: url.length,
        hasHttp: url.includes("http"),
        hasSubdomains: (url.match(/\./g) || []).length > 2,
        hasIp: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url),
      }),
    });
  }

  return records;
}

/**
 * Parse SMS phishing dataset
 */
function parseSMSDataset(csvText: string): any[] {
  const lines = csvText.trim().split("\n");
  const delimiter = detectDelimiter(csvText);
  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().trim());
  const records: any[] = [];

  console.log(`SMS dataset - delimiter: ${delimiter}, headers: ${headers.join(", ")}`);

  // Find label and text columns (common formats: v1/v2, label/text, class/message)
  let labelIndex = headers.findIndex((h) => 
    h === "v1" || h === "label" || h === "class" || h === "type" || h.includes("spam")
  );
  let textIndex = headers.findIndex((h) => 
    h === "v2" || h === "text" || h === "message" || h === "sms" || h.includes("content")
  );

  // Fallback: first column is label, second is text
  if (labelIndex < 0) labelIndex = 0;
  if (textIndex < 0) textIndex = headers.length > 1 ? 1 : 0;

  console.log(`SMS parsing - labelIndex: ${labelIndex}, textIndex: ${textIndex}`);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = parseCSVLine(line, delimiter);
    if (cells.length < 2) continue;

    const label = cells[labelIndex] || "";
    const text = cells[textIndex] || "";

    if (!text || text.length < 5) continue;

    const labelLower = label.toLowerCase();
    const isPhishing = labelLower === "spam" || 
                       labelLower === "1" || 
                       labelLower === "phishing" ||
                       labelLower === "scam" ||
                       labelLower.includes("spam");

    records.push({
      content: text,
      isPhishing: isPhishing ? 1 : 0,
      threatLevel: isPhishing ? "high" : "low",
      indicators: JSON.stringify({
        textLength: text.length,
        hasURL: /http|www|bit\.ly|tinyurl/i.test(text),
        hasSuspiciousWords: /claim|free|verify|urgent|confirm|security|click|now|winner|prize|congratulations/i.test(text),
        allCaps: /[A-Z]{5,}/.test(text),
      }),
    });
  }

  return records;
}

/**
 * Parse email phishing dataset (CSV)
 */
function parseEmailDataset(csvText: string): any[] {
  const lines = csvText.trim().split("\n");
  const delimiter = detectDelimiter(csvText);
  const records: any[] = [];

  // Find header row
  let headers: string[] = [];
  let dataStartIndex = 0;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const cells = parseCSVLine(lines[i], delimiter);
    if (cells.length > 2) {
      headers = cells.map((h) => h.toLowerCase().trim());
      dataStartIndex = i + 1;
      break;
    }
  }

  console.log(`Email dataset - delimiter: ${delimiter}, headers: ${headers.join(", ")}`);

  const bodyIndex = Math.max(
    headers.findIndex((h) => h.includes("body") || h.includes("text") || h.includes("message") || h.includes("content")),
    headers.length > 3 ? 3 : 0
  );
  const isPhishingIndex = headers.findIndex((h) =>
    h.includes("phishing") || h.includes("label") || h.includes("class") || h.includes("spam")
  );

  console.log(`Email parsing - bodyIndex: ${bodyIndex}, isPhishingIndex: ${isPhishingIndex}`);

  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const cells = parseCSVLine(line, delimiter);
    if (cells.length < 2) continue;

    const content = cells[Math.min(bodyIndex, cells.length - 1)] || "";
    if (!content || content.length < 5) continue;

    // Determine if phishing
    let isPhishing = 0;
    if (isPhishingIndex >= 0 && cells[isPhishingIndex]) {
      const label = cells[isPhishingIndex].toLowerCase();
      isPhishing =
        label.includes("phishing") || label === "1" || label === "spam" || label.includes("malicious")
          ? 1
          : 0;
    } else {
      // Heuristic detection
      const text = content.toLowerCase();
      isPhishing = /verify|confirm|urgent|click|security|account|login|update|password|suspend|claim|free|prize|winner/.test(
        text
      ) ? 1 : 0;
    }

    records.push({
      content: content.substring(0, 1000), // Limit length
      isPhishing,
      threatLevel: isPhishing ? "high" : "low",
      indicators: JSON.stringify({
        textLength: content.length,
        hasLinks: /http|www|\.com/.test(content),
        hasUrgency: /urgent|immediate|now|asap|immediately/.test(
          content.toLowerCase()
        ),
        hasCapitalization: /[A-Z]{5,}/.test(content),
      }),
    });
  }

  return records;
}

/**
 * Import datasets into training_records table
 */
async function importDataset(
  csvUrl: string,
  scanType: "url" | "email" | "sms"
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // Fetch CSV data
    console.log(`Fetching ${scanType} dataset from ${csvUrl}`);
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log(`CSV size: ${csvText.length} bytes, first 200 chars: ${csvText.substring(0, 200)}`);

    // Parse based on type
    let records: any[] = [];
    
    if (scanType === "url") {
      records = parseURLDataset(csvText);
    } else if (scanType === "sms") {
      records = parseSMSDataset(csvText);
    } else if (scanType === "email") {
      records = parseEmailDataset(csvText);
    }

    console.log(`Parsed ${records.length} records from ${scanType} dataset`);

    if (records.length === 0) {
      throw new Error("No valid records parsed from dataset");
    }

    // Create dataset ID for this import
    const datasetId = `${scanType}_dataset_${Date.now()}`;

    // Insert into database in batches - limit to first 500 records to avoid timeout
    const maxRecords = Math.min(records.length, 500);
    const batchSize = 50;
    let insertedCount = 0;
    let errors = 0;

    for (let i = 0; i < maxRecords; i += batchSize) {
      const batch = records.slice(i, Math.min(i + batchSize, maxRecords));

      for (const record of batch) {
        try {
          await blink.db.trainingRecords.create({
            datasetId,
            content: record.content,
            scanType,
            isPhishing: record.isPhishing,
            threatLevel: record.threatLevel,
            indicators: record.indicators,
            notes: `Imported from ${scanType} dataset`,
          });
          insertedCount++;
        } catch (error) {
          errors++;
          if (errors < 5) {
            console.error(`Error inserting record:`, error);
          }
        }
      }

      console.log(`Inserted ${Math.min(i + batchSize, maxRecords)}/${maxRecords} records`);
    }

    // Create dataset metadata
    try {
      await blink.db.trainingDatasets.create({
        name: `${scanType.toUpperCase()} Dataset - ${new Date().toISOString().split("T")[0]}`,
        description: `Imported phishing detection dataset for ${scanType}. Total records in file: ${records.length}, imported: ${insertedCount}`,
        datasetType: scanType,
        fileUrl: csvUrl,
        recordCount: insertedCount,
        uploadedBy: "system",
        status: "completed",
        isActive: 1,
      });
    } catch (error) {
      console.error("Error creating dataset metadata:", error);
    }

    return { success: true, count: insertedCount };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`Error importing dataset:`, message);
    return { success: false, count: 0, error: message };
  }
}

/**
 * Handle requests
 */
async function handler(req: Request): Promise<Response> {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const body = await req.json();
    const { csvUrl, scanType } = body;

    if (!csvUrl || !scanType) {
      return errorResponse(
        "Missing required fields: csvUrl, scanType",
        400
      );
    }

    if (!["url", "email", "sms"].includes(scanType)) {
      return errorResponse(
        "Invalid scanType. Must be: url, email, or sms",
        400
      );
    }

    console.log(`Starting import for ${scanType} dataset`);
    const result = await importDataset(csvUrl, scanType);

    if (!result.success) {
      return jsonResponse({ error: result.error }, 400);
    }

    return jsonResponse({
      success: true,
      message: `Successfully imported ${result.count} training records`,
      count: result.count,
      scanType,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Request error:", message);
    return errorResponse(message, 500);
  }
}

Deno.serve(handler);
