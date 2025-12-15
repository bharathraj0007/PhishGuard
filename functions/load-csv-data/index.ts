/**
 * Edge Function: Load and Preprocess CSV Data for Character-CNN Training
 *
 * This function handles loading phishing URL datasets from CSV files,
 * preprocessing them into a format suitable for Character-CNN training
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface CORSHeaders {
  'Access-Control-Allow-Origin': string;
  'Access-Control-Allow-Methods': string;
  'Access-Control-Allow-Headers': string;
}

const corsHeaders: CORSHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface CSVRow {
  [key: string]: string;
}

interface ProcessedURLData {
  url: string;
  isPhishing: boolean;
  label: number;
}

interface LoadCSVResponse {
  success: boolean;
  data?: ProcessedURLData[];
  stats?: {
    totalRecords: number;
    phishingCount: number;
    legitimateCount: number;
    validUrls: number;
    invalidUrls: number;
  };
  error?: string;
}

/**
 * Parse CSV content into array of objects
 */
function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());

  // Parse rows
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    if (values.length === headers.length) {
      const row: CSVRow = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx];
      });
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Detect phishing label from various column names
 */
function detectPhishingLabel(row: CSVRow): boolean | null {
  // Check common column names
  const phishingColumns = [
    'is_phishing',
    'isphishing',
    'phishing',
    'label',
    'class',
    'type',
    'category',
  ];

  for (const col of phishingColumns) {
    if (col in row) {
      const value = row[col].toLowerCase();
      // Handle various label formats
      if (value === '1' || value === 'true' || value === 'phishing') return true;
      if (value === '0' || value === 'false' || value === 'legitimate') return false;
    }
  }

  return null;
}

/**
 * Validate URL format
 */
function isValidURL(url: string): boolean {
  try {
    // Check if it looks like a URL
    if (!url || url.length < 10) return false;

    // Basic URL pattern check
    const urlPattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/;
    return urlPattern.test(url);
  } catch {
    return false;
  }
}

/**
 * Process CSV data for Character-CNN training
 */
function processCSVData(rows: CSVRow[]): {
  data: ProcessedURLData[];
  stats: LoadCSVResponse['stats'];
} {
  const processed: ProcessedURLData[] = [];
  let validUrls = 0;
  let invalidUrls = 0;
  let phishingCount = 0;
  let legitimateCount = 0;

  for (const row of rows) {
    // Find URL column
    const urlColumn = Object.keys(row).find(
      (key) =>
        key.includes('url') ||
        key.includes('link') ||
        key === 'domain' ||
        key === 'website'
    );

    if (!urlColumn) continue;

    const url = row[urlColumn];
    if (!isValidURL(url)) {
      invalidUrls++;
      continue;
    }

    // Detect phishing label
    const isPhishing = detectPhishingLabel(row);
    if (isPhishing === null) continue;

    processed.push({
      url,
      isPhishing,
      label: isPhishing ? 1 : 0,
    });

    validUrls++;
    if (isPhishing) {
      phishingCount++;
    } else {
      legitimateCount++;
    }
  }

  return {
    data: processed,
    stats: {
      totalRecords: rows.length,
      phishingCount,
      legitimateCount,
      validUrls,
      invalidUrls,
    },
  };
}

/**
 * Handle incoming requests
 */
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Only POST requests are supported' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { csvUrl, csvContent } = await req.json();

    let content: string;

    // Load from URL
    if (csvUrl) {
      console.log(`📥 Loading CSV from URL: ${csvUrl}`);
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch CSV: ${response.statusText}`);
      }
      content = await response.text();
    }
    // Use provided content
    else if (csvContent) {
      content = csvContent;
    } else {
      throw new Error('Either csvUrl or csvContent must be provided');
    }

    // Parse CSV
    console.log('📊 Parsing CSV...');
    const rows = parseCSV(content);
    if (rows.length === 0) {
      throw new Error('No valid rows found in CSV');
    }

    // Process data
    console.log('🔄 Processing data...');
    const { data, stats } = processCSVData(rows);

    if (data.length === 0) {
      throw new Error('No valid URLs found in CSV');
    }

    console.log(`✅ Processed ${data.length} URLs`);

    const response: LoadCSVResponse = {
      success: true,
      data,
      stats,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Error:', error);
    const response: LoadCSVResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(JSON.stringify(response), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
