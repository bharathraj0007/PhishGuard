import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@blinkdotnew/sdk@0.19.2";

// ═══════════════════════════════════════════════════════════════════
// CORS HELPERS
// ═══════════════════════════════════════════════════════════════════
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
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
// ═══════════════════════════════════════════════════════════════════

const blink = createClient({
  projectId: "phishguard-web-phishing-detector-eky2mdxr",
});

interface DatasetCreateRequest {
  name: string;
  description?: string;
  datasetType: 'link' | 'email' | 'sms' | 'qr' | 'mixed';
  userId: string;
}

interface RecordUploadRequest {
  datasetId: string;
  records: Array<{
    content: string;
    scanType: 'link' | 'email' | 'sms' | 'qr';
    isPhishing: boolean;
    threatLevel?: 'safe' | 'suspicious' | 'dangerous';
    indicators?: string[];
    notes?: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // POST /create - Create new dataset
    if (req.method === "POST" && path === "/create") {
      const body: DatasetCreateRequest = await req.json();
      
      if (!body.name || !body.datasetType || !body.userId) {
        return errorResponse("name, datasetType, and userId are required", 400);
      }

      const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const timestamp = new Date().toISOString();

      await blink.db.sql(
        `INSERT INTO training_datasets (id, name, description, dataset_type, uploaded_by, status, record_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datasetId,
          body.name,
          body.description || '',
          body.datasetType,
          body.userId,
          'pending',
          0,
          timestamp,
          timestamp
        ]
      );

      return jsonResponse({ 
        success: true, 
        datasetId,
        message: "Dataset created successfully" 
      });
    }

    // POST /upload - Upload training records
    if (req.method === "POST" && path === "/upload") {
      const body: RecordUploadRequest = await req.json();
      
      if (!body.datasetId || !body.records || body.records.length === 0) {
        return errorResponse("datasetId and records are required", 400);
      }

      // Update dataset status to processing
      await blink.db.sql(
        `UPDATE training_datasets SET status = ?, updated_at = ? WHERE id = ?`,
        ['processing', new Date().toISOString(), body.datasetId]
      );

      try {
        // Insert all records
        for (const record of body.records) {
          const recordId = `record_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          
          await blink.db.sql(
            `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, notes, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              recordId,
              body.datasetId,
              record.content,
              record.scanType,
              record.isPhishing ? 1 : 0,
              record.threatLevel || (record.isPhishing ? 'dangerous' : 'safe'),
              JSON.stringify(record.indicators || []),
              record.notes || '',
              new Date().toISOString()
            ]
          );
        }

        // Update dataset with record count and status
        await blink.db.sql(
          `UPDATE training_datasets 
           SET record_count = ?, status = ?, updated_at = ? 
           WHERE id = ?`,
          [
            body.records.length,
            'ready',
            new Date().toISOString(),
            body.datasetId
          ]
        );

        return jsonResponse({ 
          success: true, 
          message: `Uploaded ${body.records.length} training records`,
          recordCount: body.records.length
        });

      } catch (error) {
        // Mark dataset as error
        await blink.db.sql(
          `UPDATE training_datasets SET status = ?, updated_at = ? WHERE id = ?`,
          ['error', new Date().toISOString(), body.datasetId]
        );
        throw error;
      }
    }

    // GET /datasets - List all datasets
    if (req.method === "GET" && path === "/datasets") {
      const datasets = await blink.db.sql(
        `SELECT * FROM training_datasets ORDER BY created_at DESC`
      );
      return jsonResponse({ success: true, datasets: datasets.rows });
    }

    // GET /dataset/:id - Get specific dataset with records
    if (req.method === "GET" && path.startsWith("/dataset/")) {
      const datasetId = path.split("/")[2];
      
      const dataset = await blink.db.sql(
        `SELECT * FROM training_datasets WHERE id = ?`,
        [datasetId]
      );
      
      if (!dataset.rows || dataset.rows.length === 0) {
        return errorResponse("Dataset not found", 404);
      }

      const records = await blink.db.sql(
        `SELECT * FROM training_records WHERE dataset_id = ? ORDER BY created_at DESC LIMIT 100`,
        [datasetId]
      );

      return jsonResponse({ 
        success: true, 
        dataset: dataset.rows[0],
        records: records.rows,
        totalRecords: (dataset.rows[0] as any).record_count
      });
    }

    // DELETE /dataset/:id - Delete dataset
    if (req.method === "DELETE" && path.startsWith("/dataset/")) {
      const datasetId = path.split("/")[2];
      
      // Delete records first (cascade should handle this, but explicit is better)
      await blink.db.sql(
        `DELETE FROM training_records WHERE dataset_id = ?`,
        [datasetId]
      );
      
      // Delete dataset
      await blink.db.sql(
        `DELETE FROM training_datasets WHERE id = ?`,
        [datasetId]
      );

      return jsonResponse({ 
        success: true, 
        message: "Dataset deleted successfully" 
      });
    }

    // POST /parse-csv - Parse CSV data
    if (req.method === "POST" && path === "/parse-csv") {
      const body = await req.json();
      
      if (!body.csvData) {
        return errorResponse("csvData is required", 400);
      }

      try {
        // Parse CSV (simple parsing, assumes: content,scanType,isPhishing,threatLevel)
        const lines = body.csvData.split('\n').filter((line: string) => line.trim());
        const headers = lines[0].toLowerCase().split(',').map((h: string) => h.trim());
        
        const records = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v: string) => v.trim());
          if (values.length < 3) continue;
          
          const record: any = {};
          headers.forEach((header, index) => {
            record[header] = values[index];
          });
          
          records.push({
            content: record.content || record.text || record.url,
            scanType: record.scantype || record.type || 'link',
            isPhishing: ['true', '1', 'yes', 'phishing'].includes(
              (record.isphishing || record.label || '').toLowerCase()
            ),
            threatLevel: record.threatlevel || record.threat,
            indicators: record.indicators ? JSON.parse(record.indicators) : undefined
          });
        }

        return jsonResponse({ 
          success: true, 
          records,
          count: records.length
        });

      } catch (error) {
        return errorResponse(
          `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
          400
        );
      }
    }

    return errorResponse("Not found", 404);

  } catch (error) {
    console.error("Dataset management error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
