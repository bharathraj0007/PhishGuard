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

interface TestRequest {
  modelVersionId: string;
  testName: string;
  testDatasetId?: string;
  testType: 'validation' | 'performance' | 'accuracy' | 'custom';
  userId: string;
}

async function runModelTest(request: TestRequest) {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  // Create test record
  await blink.db.sql(
    `INSERT INTO model_tests (id, model_version_id, test_name, test_dataset_id, test_type, status, started_at, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      testId,
      request.modelVersionId,
      request.testName,
      request.testDatasetId || null,
      request.testType,
      'running',
      timestamp,
      request.userId,
      timestamp
    ]
  );

  // Get model version
  const modelResult = await blink.db.sql(
    `SELECT * FROM model_versions WHERE id = ?`,
    [request.modelVersionId]
  );

  if (!modelResult.rows || modelResult.rows.length === 0) {
    throw new Error("Model version not found");
  }

  const model = modelResult.rows[0] as any;
  const modelMetrics = model.metrics ? JSON.parse(model.metrics) : null;

  // Get test dataset if specified
  let testData: any[] = [];
  if (request.testDatasetId) {
    const testDataResult = await blink.db.sql(
      `SELECT * FROM training_records WHERE dataset_id = ?`,
      [request.testDatasetId]
    );
    testData = testDataResult.rows || [];
  } else {
    // Use a subset of training data for validation
    const allDataResult = await blink.db.sql(
      `SELECT * FROM training_records LIMIT 100`
    );
    testData = allDataResult.rows || [];
  }

  if (testData.length === 0) {
    throw new Error("No test data available");
  }

  // Run AI-powered model evaluation
  const startTime = Date.now();
  
  const evaluation = await blink.ai.generateObject({
    prompt: `Evaluate this phishing detection model's performance:

Model Information:
- Version: ${model.version_number}
- Training Examples: ${modelMetrics?.trainingExamples || 'Unknown'}
- Trained Patterns: ${JSON.stringify(modelMetrics?.patterns || {}, null, 2)}

Test Dataset:
- Total Examples: ${testData.length}
- Phishing Examples: ${testData.filter((r: any) => Number(r.is_phishing) > 0).length}
- Safe Examples: ${testData.filter((r: any) => Number(r.is_phishing) === 0).length}

Sample Test Cases:
${testData.slice(0, 5).map((r: any) => 
  `Content: ${r.content}\nActual Label: ${Number(r.is_phishing) > 0 ? 'Phishing' : 'Safe'}\nExpected Indicators: ${r.indicators || 'None'}`
).join('\n\n')}

Provide evaluation metrics and analysis for this ${request.testType} test.`,
    schema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'object',
          properties: {
            accuracy: { type: 'number' },
            precision: { type: 'number' },
            recall: { type: 'number' },
            f1Score: { type: 'number' },
            truePositives: { type: 'number' },
            trueNegatives: { type: 'number' },
            falsePositives: { type: 'number' },
            falseNegatives: { type: 'number' }
          },
          required: ['accuracy', 'precision', 'recall', 'f1Score']
        },
        analysis: {
          type: 'object',
          properties: {
            strengths: {
              type: 'array',
              items: { type: 'string' }
            },
            weaknesses: {
              type: 'array',
              items: { type: 'string' }
            },
            recommendations: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['strengths', 'weaknesses', 'recommendations']
        },
        confusionMatrix: {
          type: 'object',
          properties: {
            tp: { type: 'number' },
            tn: { type: 'number' },
            fp: { type: 'number' },
            fn: { type: 'number' }
          },
          required: ['tp', 'tn', 'fp', 'fn']
        }
      },
      required: ['metrics', 'analysis', 'confusionMatrix']
    }
  });

  const endTime = Date.now();
  const duration = Math.floor((endTime - startTime) / 1000);

  const results = {
    testType: request.testType,
    datasetSize: testData.length,
    phishingExamples: testData.filter((r: any) => Number(r.is_phishing) > 0).length,
    safeExamples: testData.filter((r: any) => Number(r.is_phishing) === 0).length,
    evaluation: evaluation.object,
    testDuration: duration
  };

  // Update test record
  await blink.db.sql(
    `UPDATE model_tests 
     SET status = ?, completed_at = ?, results = ?, metrics = ?
     WHERE id = ?`,
    [
      'completed',
      new Date().toISOString(),
      JSON.stringify(results),
      JSON.stringify(evaluation.object.metrics),
      testId
    ]
  );

  return { testId, results };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // POST /test - Run model test
    if (req.method === "POST" && path === "/test") {
      const body: TestRequest = await req.json();
      
      if (!body.modelVersionId || !body.testName || !body.testType || !body.userId) {
        return errorResponse("modelVersionId, testName, testType, and userId are required", 400);
      }

      const result = await runModelTest(body);
      return jsonResponse({ success: true, ...result });
    }

    // GET /tests - List all tests
    if (req.method === "GET" && path === "/tests") {
      const modelId = url.searchParams.get("modelId");
      
      let query = `SELECT * FROM model_tests ORDER BY created_at DESC`;
      const params: any[] = [];
      
      if (modelId) {
        query = `SELECT * FROM model_tests WHERE model_version_id = ? ORDER BY created_at DESC`;
        params.push(modelId);
      }

      const tests = await blink.db.sql(query, params);
      return jsonResponse({ success: true, tests: tests.rows });
    }

    // GET /tests/:id - Get specific test
    if (req.method === "GET" && path.startsWith("/tests/")) {
      const testId = path.split("/")[2];
      
      const test = await blink.db.sql(
        `SELECT * FROM model_tests WHERE id = ?`,
        [testId]
      );
      
      if (!test.rows || test.rows.length === 0) {
        return errorResponse("Test not found", 404);
      }
      
      return jsonResponse({ success: true, test: test.rows[0] });
    }

    return errorResponse("Not found", 404);

  } catch (error) {
    console.error("Model testing error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500
    );
  }
});
