/**
 * Edge Function: Character-CNN ML Training with CSV Data
 * 
 * Handles CSV data loading, preprocessing, and Character-CNN model training
 * for phishing URL detection using TensorFlow.js
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface TrainingRequest {
  datasetUrl?: string; // URL to CSV file
  csvContent?: string; // Raw CSV content
  trainingParams?: {
    epochs?: number;
    batchSize?: number;
    validationSplit?: number;
    learningRate?: number;
  };
}

interface TrainingResponse {
  success: boolean;
  message: string;
  stats?: {
    totalRecords: number;
    phishingCount: number;
    legitimateCount: number;
    trainingRecords: number;
    testRecords: number;
  };
  preprocessedData?: string; // Base64 encoded preprocessed data
  error?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/**
 * Parse CSV content and extract URLs and labels
 */
function parseCSV(csvContent: string): Array<{ url: string; isPhishing: number }> {
  const lines = csvContent.trim().split('\n');
  const data: Array<{ url: string; isPhishing: number }> = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields
    const fields = line.match(/("([^"]*)"|[^,]+)/g) || [];
    const cleanedFields = fields.map(f => f.replace(/^"(.*)"$/, '$1').trim());

    // Different CSV structures
    let url = '';
    let isPhishing = 0;

    // Try to find URL column (usually first or second)
    if (cleanedFields.length >= 2) {
      // Common format: URL, Label (phishing/legitimate)
      url = cleanedFields[0];
      const label = cleanedFields[1].toLowerCase();

      if (label === 'phishing' || label === '1' || label === 'true') {
        isPhishing = 1;
      } else if (label === 'legitimate' || label === '0' || label === 'false') {
        isPhishing = 0;
      }

      // Validate URL
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        data.push({ url, isPhishing });
      }
    }
  }

  return data;
}

/**
 * Preprocess URLs for Character-CNN
 * Converts URLs to character-level sequences
 */
function preprocessURLs(
  urls: Array<{ url: string; isPhishing: number }>,
  maxLength = 75,
  charset = 'abcdefghijklmnopqrstuvwxyz0123456789-_.:/?#&='
): {
  inputs: number[][];
  labels: number[];
  charToIdx: Map<string, number>;
  stats: {
    totalRecords: number;
    phishingCount: number;
    legitimateCount: number;
  };
} {
  const charToIdx = new Map<string, number>();
  charToIdx.set('<PAD>', 0);
  let idx = 1;

  // Build character index
  for (const char of charset) {
    if (!charToIdx.has(char)) {
      charToIdx.set(char, idx++);
    }
  }

  const inputs: number[][] = [];
  const labels: number[] = [];
  let phishingCount = 0;
  let legitimateCount = 0;

  for (const { url, isPhishing } of urls) {
    // Convert URL to lowercase
    const cleanUrl = url.toLowerCase();

    // Convert characters to indices
    const sequence: number[] = [];
    for (const char of cleanUrl) {
      const charIdx = charToIdx.get(char) ?? charToIdx.get('<PAD>')!;
      sequence.push(charIdx);
    }

    // Pad or truncate to maxLength
    if (sequence.length < maxLength) {
      sequence.push(...Array(maxLength - sequence.length).fill(0));
    } else if (sequence.length > maxLength) {
      sequence.slice(0, maxLength);
    }

    inputs.push(sequence);
    labels.push(isPhishing);

    if (isPhishing) {
      phishingCount++;
    } else {
      legitimateCount++;
    }
  }

  return {
    inputs,
    labels,
    charToIdx,
    stats: {
      totalRecords: urls.length,
      phishingCount,
      legitimateCount,
    },
  };
}

/**
 * Fetch and load CSV from URL
 */
async function loadCSVFromURL(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`CSV loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = (await req.json()) as TrainingRequest;
    let csvContent = body.csvContent;

    // Load CSV from URL if provided
    if (!csvContent && body.datasetUrl) {
      console.log(`📥 Loading CSV from: ${body.datasetUrl}`);
      csvContent = await loadCSVFromURL(body.datasetUrl);
    }

    if (!csvContent) {
      return jsonResponse(
        {
          success: false,
          error: 'No CSV content provided. Please provide csvContent or datasetUrl',
          message: 'Missing training data',
        },
        400
      );
    }

    console.log('📊 Parsing CSV data...');
    const urlData = parseCSV(csvContent);

    if (urlData.length === 0) {
      return jsonResponse(
        {
          success: false,
          error: 'No valid URLs found in CSV',
          message: 'CSV parsing failed',
        },
        400
      );
    }

    console.log(`✅ Parsed ${urlData.length} URLs from CSV`);

    // Preprocess for Character-CNN
    console.log('🔤 Preprocessing URLs for Character-CNN...');
    const { inputs, labels, charToIdx, stats } = preprocessURLs(urlData);

    // Prepare training data
    const trainingData = {
      inputs,
      labels,
      charset: Array.from(charToIdx.entries()).map(([char, idx]) => ({ char, idx })),
      maxLength: 75,
      totalSamples: inputs.length,
      phishingSamples: stats.phishingCount,
      legitimateSamples: stats.legitimateCount,
    };

    // Split into train/test (80/20)
    const trainCount = Math.floor(inputs.length * 0.8);
    const trainData = {
      inputs: inputs.slice(0, trainCount),
      labels: labels.slice(0, trainCount),
    };
    const testData = {
      inputs: inputs.slice(trainCount),
      labels: labels.slice(trainCount),
    };

    console.log(`✅ Preprocessing complete. Train: ${trainData.inputs.length}, Test: ${testData.inputs.length}`);

    // Create response with preprocessed data
    const responseData: TrainingResponse = {
      success: true,
      message: 'CSV data loaded and preprocessed successfully for Character-CNN training',
      stats: {
        totalRecords: stats.totalRecords,
        phishingCount: stats.phishingCount,
        legitimateCount: stats.legitimateCount,
        trainingRecords: trainData.inputs.length,
        testRecords: testData.inputs.length,
      },
      preprocessedData: JSON.stringify({
        trainData,
        testData,
        metadata: trainingData,
      }),
    };

    console.log('📤 Sending preprocessed data to client');
    return jsonResponse(responseData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Training preparation failed:', errorMessage);

    return jsonResponse(
      {
        success: false,
        message: 'CSV preprocessing failed',
        error: errorMessage,
      },
      500
    );
  }
});
