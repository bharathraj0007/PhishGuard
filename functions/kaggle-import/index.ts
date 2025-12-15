import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk@^0.19.2";

const blink = createClient({
  projectId: "phishguard-web-phishing-detector-eky2mdxr",
  authRequired: false,
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

// Dataset sources for each detection type
const KAGGLE_DATASETS = {
  url: [
    {
      name: "URL Phishing Dataset",
      source: "kaggle",
      url: "https://raw.githubusercontent.com/faizann24/Using-machine-learning-to-detect-malicious-URLs/master/data/data.csv",
      description: "Comprehensive URL phishing dataset with multiple features"
    }
  ],
  email: [
    {
      name: "Email Spam Dataset",
      source: "kaggle",
      url: "https://raw.githubusercontent.com/MWiechmann/enron_spam_data/master/enron_spam_data.csv",
      description: "Email phishing and spam detection dataset"
    }
  ],
  sms: [
    {
      name: "SMS Spam Collection",
      source: "kaggle",
      url: "https://raw.githubusercontent.com/mohitgupta-omg/Kaggle-SMS-Spam-Collection-Dataset-/master/spam.csv",
      description: "SMS spam and phishing messages dataset"
    }
  ],
  qr: [
    {
      name: "QR Code Phishing Dataset",
      source: "generated",
      description: "QR code phishing URLs and patterns"
    }
  ]
};

/**
 * Download and parse CSV data from URL
 */
async function downloadCSV(url: string): Promise<string[][]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    const lines = csvText.trim().split('\n');
    const data = lines.map(line => {
      // Simple CSV parser (handles quoted values)
      const matches = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g);
      return matches ? matches.map(m => m.replace(/^"|"$/g, '').trim()) : [];
    });
    
    return data;
  } catch (error) {
    console.error('Error downloading CSV:', error);
    throw error;
  }
}

/**
 * Process URL dataset
 */
async function processURLDataset(csvData: string[][]): Promise<any[]> {
  const headers = csvData[0];
  const records = [];
  
  for (let i = 1; i < csvData.length && i < 1001; i++) { // Limit to 1000 records
    const row = csvData[i];
    if (row.length < 2) continue;
    
    const url = row[0];
    const label = row[row.length - 1]; // Last column is usually the label
    const isPhishing = label === '1' || label === 'bad' || label === 'phishing';
    
    records.push({
      id: `url_${Date.now()}_${i}`,
      content: url,
      scanType: 'link',
      isPhishing: isPhishing ? 1 : 0,
      threatLevel: isPhishing ? 'dangerous' : 'safe',
      indicators: isPhishing ? ['suspicious-url', 'known-malicious'] : ['verified-safe'],
      notes: `Imported from Kaggle URL dataset`,
      createdAt: new Date().toISOString()
    });
  }
  
  return records;
}

/**
 * Process Email dataset
 */
async function processEmailDataset(csvData: string[][]): Promise<any[]> {
  const records = [];
  
  for (let i = 1; i < csvData.length && i < 1001; i++) {
    const row = csvData[i];
    if (row.length < 2) continue;
    
    const emailContent = row[1] || row[0]; // Email text
    const label = row[0]; // Label column
    const isPhishing = label === 'spam' || label === '1' || label === 'phishing';
    
    records.push({
      id: `email_${Date.now()}_${i}`,
      content: emailContent.substring(0, 1000), // Limit length
      scanType: 'email',
      isPhishing: isPhishing ? 1 : 0,
      threatLevel: isPhishing ? 'dangerous' : 'safe',
      indicators: isPhishing ? ['spam-keywords', 'suspicious-sender'] : ['legitimate-sender'],
      notes: `Imported from Kaggle Email dataset`,
      createdAt: new Date().toISOString()
    });
  }
  
  return records;
}

/**
 * Process SMS dataset
 */
async function processSMSDataset(csvData: string[][]): Promise<any[]> {
  const records = [];
  
  for (let i = 1; i < csvData.length && i < 1001; i++) {
    const row = csvData[i];
    if (row.length < 2) continue;
    
    const label = row[0]; // 'ham' or 'spam'
    const smsContent = row[1];
    const isPhishing = label === 'spam' || label === '1';
    
    records.push({
      id: `sms_${Date.now()}_${i}`,
      content: smsContent,
      scanType: 'sms',
      isPhishing: isPhishing ? 1 : 0,
      threatLevel: isPhishing ? 'dangerous' : 'safe',
      indicators: isPhishing ? ['spam-sms', 'suspicious-link'] : ['legitimate-message'],
      notes: `Imported from Kaggle SMS dataset`,
      createdAt: new Date().toISOString()
    });
  }
  
  return records;
}

/**
 * Generate QR dataset (synthetic for now)
 */
async function generateQRDataset(): Promise<any[]> {
  const phishingUrls = [
    'http://bit.ly/3xYz123',
    'http://tinyurl.com/fake-bank',
    'http://suspicious-site.tk/login',
    'http://paypal-verify.ml',
    'http://amazon-prize.ga'
  ];
  
  const safeUrls = [
    'https://www.google.com',
    'https://www.github.com',
    'https://www.wikipedia.org',
    'https://www.youtube.com',
    'https://www.reddit.com'
  ];
  
  const records = [];
  
  // Add phishing QR codes
  for (let i = 0; i < 100; i++) {
    const url = phishingUrls[i % phishingUrls.length] + `?id=${i}`;
    records.push({
      id: `qr_phishing_${Date.now()}_${i}`,
      content: url,
      scanType: 'qr',
      isPhishing: 1,
      threatLevel: 'dangerous',
      indicators: ['suspicious-qr-url', 'url-shortener', 'unknown-domain'],
      notes: `Generated QR phishing sample`,
      createdAt: new Date().toISOString()
    });
  }
  
  // Add safe QR codes
  for (let i = 0; i < 100; i++) {
    const url = safeUrls[i % safeUrls.length] + `?ref=qr${i}`;
    records.push({
      id: `qr_safe_${Date.now()}_${i}`,
      content: url,
      scanType: 'qr',
      isPhishing: 0,
      threatLevel: 'safe',
      indicators: ['verified-domain', 'https-secure'],
      notes: `Generated QR safe sample`,
      createdAt: new Date().toISOString()
    });
  }
  
  return records;
}

/**
 * Store records in database
 */
async function storeRecords(datasetId: string, records: any[]) {
  // Batch insert to training_records table
  const batchSize = 50;
  let totalStored = 0;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const sql = `
      INSERT INTO training_records (
        id, dataset_id, content, scan_type, is_phishing, 
        threat_level, indicators, notes, created_at
      ) VALUES ${batch.map((_, idx) => 
        `(?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).join(', ')}
    `;
    
    const args = batch.flatMap(r => [
      r.id,
      datasetId,
      r.content,
      r.scanType,
      r.isPhishing,
      r.threatLevel,
      JSON.stringify(r.indicators),
      r.notes,
      r.createdAt
    ]);
    
    await blink.db.sql(sql, args);
    totalStored += batch.length;
  }
  
  return totalStored;
}

/**
 * Main import handler
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method === "POST") {
      const { detectionType, datasetName } = await req.json();
      
      if (!detectionType || !['url', 'email', 'sms', 'qr'].includes(detectionType)) {
        return errorResponse('Invalid detection type. Must be: url, email, sms, or qr', 400);
      }
      
      console.log(`Starting import for ${detectionType} dataset...`);
      
      // Create dataset entry
      const datasetId = `dataset_${detectionType}_${Date.now()}`;
      const datasetInfo = KAGGLE_DATASETS[detectionType as keyof typeof KAGGLE_DATASETS][0];
      
      await blink.db.sql(`
        INSERT INTO training_datasets (
          id, name, description, dataset_type, status, uploaded_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        datasetId,
        datasetName || `${detectionType.toUpperCase()} Kaggle Dataset`,
        datasetInfo.description,
        detectionType,
        'importing',
        'system',
        new Date().toISOString(),
        new Date().toISOString()
      ]);
      
      let records: any[] = [];
      
      // Import based on detection type
      if (detectionType === 'url') {
        const csvData = await downloadCSV(datasetInfo.url);
        records = await processURLDataset(csvData);
      } else if (detectionType === 'email') {
        const csvData = await downloadCSV(datasetInfo.url);
        records = await processEmailDataset(csvData);
      } else if (detectionType === 'sms') {
        const csvData = await downloadCSV(datasetInfo.url);
        records = await processSMSDataset(csvData);
      } else if (detectionType === 'qr') {
        records = await generateQRDataset();
      }
      
      console.log(`Processed ${records.length} records for ${detectionType}`);
      
      // Store records
      const storedCount = await storeRecords(datasetId, records);
      
      // Update dataset status
      await blink.db.sql(`
        UPDATE training_datasets 
        SET status = ?, record_count = ?, updated_at = ?
        WHERE id = ?
      `, ['completed', storedCount, new Date().toISOString(), datasetId]);
      
      return jsonResponse({
        success: true,
        message: `Successfully imported ${storedCount} records for ${detectionType}`,
        datasetId,
        recordCount: storedCount,
        detectionType
      });
    }
    
    if (req.method === "GET") {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");
      
      if (action === "sources") {
        return jsonResponse({
          success: true,
          sources: KAGGLE_DATASETS
        });
      }
      
      if (action === "status") {
        const detectionType = url.searchParams.get("type");
        
        const result = await blink.db.sql(`
          SELECT 
            dataset_type,
            COUNT(*) as dataset_count,
            SUM(record_count) as total_records
          FROM training_datasets
          WHERE status = 'completed'
          ${detectionType ? "AND dataset_type = ?" : ""}
          GROUP BY dataset_type
        `, detectionType ? [detectionType] : []);
        
        return jsonResponse({
          success: true,
          datasets: result.rows
        });
      }
    }
    
    return errorResponse("Method not allowed", 405);
    
  } catch (error) {
    console.error("Error in kaggle-import:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Import failed",
      500
    );
  }
});
