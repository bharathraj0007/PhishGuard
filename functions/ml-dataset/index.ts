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

interface DatasetRequest {
  name: string;
  description?: string;
  datasetType: 'url' | 'email' | 'sms' | 'qr' | 'mixed';
  userId: string;
}

interface TrainingRecordRequest {
  datasetId: string;
  content: string;
  scanType: 'url' | 'email' | 'sms' | 'qr';
  isPhishing: boolean;
  threatLevel?: 'safe' | 'suspicious' | 'dangerous';
  indicators?: string[];
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // POST /datasets - Create new dataset
    if (req.method === "POST" && path === "/datasets") {
      const body: DatasetRequest = await req.json();
      
      if (!body.name || !body.datasetType || !body.userId) {
        return errorResponse("name, datasetType, and userId are required", 400);
      }

      const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const timestamp = new Date().toISOString();

      await blink.db.sql(
        `INSERT INTO training_datasets (id, name, description, dataset_type, uploaded_by, status, created_at, updated_at, record_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datasetId,
          body.name,
          body.description || '',
          body.datasetType,
          body.userId,
          'pending',
          timestamp,
          timestamp,
          0
        ]
      );

      return jsonResponse({ success: true, datasetId });
    }

    // GET /datasets - List all datasets
    if (req.method === "GET" && path === "/datasets") {
      const datasets = await blink.db.sql(
        `SELECT * FROM training_datasets ORDER BY created_at DESC`
      );
      return jsonResponse({ success: true, datasets: datasets.rows });
    }

    // GET /datasets/:id - Get specific dataset with records
    if (req.method === "GET" && path.startsWith("/datasets/") && !path.includes("/records")) {
      const datasetId = path.split("/")[2];
      
      const dataset = await blink.db.sql(
        `SELECT * FROM training_datasets WHERE id = ?`,
        [datasetId]
      );
      
      if (!dataset.rows || dataset.rows.length === 0) {
        return errorResponse("Dataset not found", 404);
      }

      const records = await blink.db.sql(
        `SELECT * FROM training_records WHERE dataset_id = ? ORDER BY created_at DESC`,
        [datasetId]
      );

      return jsonResponse({ 
        success: true, 
        dataset: dataset.rows[0],
        records: records.rows 
      });
    }

    // POST /datasets/:id/records - Add training record
    if (req.method === "POST" && path.includes("/records")) {
      const datasetId = path.split("/")[2];
      const body: TrainingRecordRequest = await req.json();

      if (!body.content || !body.scanType) {
        return errorResponse("content and scanType are required", 400);
      }

      const recordId = `record_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const timestamp = new Date().toISOString();

      await blink.db.sql(
        `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          recordId,
          datasetId,
          body.content,
          body.scanType,
          body.isPhishing ? 1 : 0,
          body.threatLevel || 'safe',
          JSON.stringify(body.indicators || []),
          body.notes || '',
          timestamp
        ]
      );

      // Update record count
      await blink.db.sql(
        `UPDATE training_datasets 
         SET record_count = (SELECT COUNT(*) FROM training_records WHERE dataset_id = ?),
             updated_at = ?,
             status = 'ready'
         WHERE id = ?`,
        [datasetId, timestamp, datasetId]
      );

      return jsonResponse({ success: true, recordId });
    }

    // POST /datasets/:id/bulk - Bulk add training records
    if (req.method === "POST" && path.includes("/bulk")) {
      const datasetId = path.split("/")[2];
      const { records }: { records: TrainingRecordRequest[] } = await req.json();

      if (!Array.isArray(records) || records.length === 0) {
        return errorResponse("records array is required", 400);
      }

      const timestamp = new Date().toISOString();
      const recordIds: string[] = [];

      for (const record of records) {
        const recordId = `record_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        await blink.db.sql(
          `INSERT INTO training_records (id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recordId,
            datasetId,
            record.content,
            record.scanType,
            record.isPhishing ? 1 : 0,
            record.threatLevel || 'safe',
            JSON.stringify(record.indicators || []),
            record.notes || '',
            timestamp
          ]
        );

        recordIds.push(recordId);
      }

      // Update record count
      await blink.db.sql(
        `UPDATE training_datasets 
         SET record_count = (SELECT COUNT(*) FROM training_records WHERE dataset_id = ?),
             updated_at = ?,
             status = 'ready'
         WHERE id = ?`,
        [datasetId, timestamp, datasetId]
      );

      return jsonResponse({ success: true, count: recordIds.length, recordIds });
    }

    // DELETE /datasets/:id - Delete dataset
    if (req.method === "DELETE" && path.startsWith("/datasets/")) {
      const datasetId = path.split("/")[2];
      
      // Delete all records first
      await blink.db.sql(
        `DELETE FROM training_records WHERE dataset_id = ?`,
        [datasetId]
      );

      // Delete dataset
      await blink.db.sql(
        `DELETE FROM training_datasets WHERE id = ?`,
        [datasetId]
      );

      return jsonResponse({ success: true, message: "Dataset deleted" });
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
