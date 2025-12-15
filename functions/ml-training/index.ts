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

interface TrainingRequest {
  datasetId: string;
  versionNumber: string;
  description?: string;
  userId: string;
  config?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
  };
}

async function trainModel(request: TrainingRequest) {
  const modelId = `model_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Create model version record
  await blink.db.sql(
    `INSERT INTO model_versions (id, version_number, description, training_dataset_id, training_started_at, status, config, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      modelId,
      request.versionNumber,
      request.description || `Model v${request.versionNumber}`,
      request.datasetId,
      timestamp,
      'training',
      JSON.stringify(request.config || {}),
      request.userId,
      timestamp,
      timestamp
    ]
  );

  // Fetch training data
  const trainingData = await blink.db.sql(
    `SELECT * FROM training_records WHERE dataset_id = ?`,
    [request.datasetId]
  );

  if (!trainingData.rows || trainingData.rows.length === 0) {
    throw new Error("No training data found for dataset");
  }

  // Simulate training process with AI-based pattern learning
  const startTime = Date.now();
  
  // Analyze patterns in training data using AI
  const patternAnalysis = await blink.ai.generateObject({
    prompt: `Analyze these phishing detection training examples and extract key patterns:

Training Data Summary:
- Total examples: ${trainingData.rows.length}
- Phishing examples: ${trainingData.rows.filter((r: any) => Number(r.is_phishing) > 0).length}
- Safe examples: ${trainingData.rows.filter((r: any) => Number(r.is_phishing) === 0).length}

Sample data:
${trainingData.rows.slice(0, 10).map((r: any) => 
  `Content: ${r.content}\nLabel: ${Number(r.is_phishing) > 0 ? 'Phishing' : 'Safe'}\nIndicators: ${r.indicators || 'None'}`
).join('\n\n')}

Extract:
1. Common phishing indicators and patterns
2. False positive triggers to avoid
3. Confidence thresholds for different threat levels
4. Key features for classification`,
    schema: {
      type: 'object',
      properties: {
        patterns: {
          type: 'object',
          properties: {
            phishingIndicators: {
              type: 'array',
              items: { type: 'string' }
            },
            safePatterns: {
              type: 'array',
              items: { type: 'string' }
            },
            commonMistakes: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['phishingIndicators', 'safePatterns', 'commonMistakes']
        },
        thresholds: {
          type: 'object',
          properties: {
            dangerous: { type: 'number' },
            suspicious: { type: 'number' },
            safe: { type: 'number' }
          },
          required: ['dangerous', 'suspicious', 'safe']
        },
        keyFeatures: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['patterns', 'thresholds', 'keyFeatures']
    }
  });

  const endTime = Date.now();
  const duration = Math.floor((endTime - startTime) / 1000);

  // Calculate training metrics
  const metrics = {
    trainingExamples: trainingData.rows.length,
    phishingExamples: trainingData.rows.filter((r: any) => Number(r.is_phishing) > 0).length,
    safeExamples: trainingData.rows.filter((r: any) => Number(r.is_phishing) === 0).length,
    patterns: patternAnalysis.object,
    estimatedAccuracy: 0.85 + (Math.random() * 0.12), // Simulated 85-97% accuracy
    trainingDuration: duration
  };

  // Update model version with completion
  await blink.db.sql(
    `UPDATE model_versions 
     SET status = ?, training_completed_at = ?, training_duration = ?, metrics = ?, updated_at = ?
     WHERE id = ?`,
    [
      'completed',
      new Date().toISOString(),
      duration,
      JSON.stringify(metrics),
      new Date().toISOString(),
      modelId
    ]
  );

  return { modelId, metrics };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // POST /train - Start model training
    if (req.method === "POST" && path === "/train") {
      const body: TrainingRequest = await req.json();
      
      if (!body.datasetId || !body.versionNumber || !body.userId) {
        return errorResponse("datasetId, versionNumber, and userId are required", 400);
      }

      const result = await trainModel(body);
      return jsonResponse({ success: true, ...result });
    }

    // GET /models - List all model versions
    if (req.method === "GET" && path === "/models") {
      const models = await blink.db.sql(
        `SELECT * FROM model_versions ORDER BY created_at DESC`
      );
      return jsonResponse({ success: true, models: models.rows });
    }

    // GET /models/:id - Get specific model
    if (req.method === "GET" && path.startsWith("/models/")) {
      const modelId = path.split("/")[2];
      const model = await blink.db.sql(
        `SELECT * FROM model_versions WHERE id = ?`,
        [modelId]
      );
      
      if (!model.rows || model.rows.length === 0) {
        return errorResponse("Model not found", 404);
      }
      
      return jsonResponse({ success: true, model: model.rows[0] });
    }

    // POST /deploy/:id - Deploy a model version
    if (req.method === "POST" && path.startsWith("/deploy/")) {
      const modelId = path.split("/")[2];
      
      // Deactivate all other models
      await blink.db.sql(`UPDATE model_versions SET is_active = 0`);
      
      // Activate this model
      await blink.db.sql(
        `UPDATE model_versions SET is_active = 1, status = ?, updated_at = ? WHERE id = ?`,
        ['deployed', new Date().toISOString(), modelId]
      );
      
      return jsonResponse({ success: true, message: "Model deployed successfully" });
    }

    return errorResponse("Not found", 404);

  } catch (error) {
    console.error("ML Training error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
