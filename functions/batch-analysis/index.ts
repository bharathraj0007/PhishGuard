import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ═══════════════════════════════════════════════════════════════════
// CORS HELPERS - DO NOT MODIFY
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

const PROJECT_ID = "phishguard-web-phishing-detector-eky2mdxr";
const ANALYZE_URL = "https://eky2mdxr-0wvahpyjbcjz.deno.dev";

interface BatchItem {
  content: string;
  scanType: "link" | "email" | "sms" | "qr";
  id?: string; // Optional client-provided ID for tracking
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorResponse("Method not allowed", 405);
    }

    const body = await req.json();
    const { items, userId, saveToHistory = false } = body;

    // Validation
    if (!items || !Array.isArray(items)) {
      return errorResponse("items array is required", 400);
    }

    if (items.length === 0) {
      return errorResponse("At least one item is required", 400);
    }

    if (items.length > 50) {
      return errorResponse("Maximum 50 items allowed per batch", 400);
    }

    // Process batch items in parallel
    const results = await Promise.allSettled(
      items.map(async (item: BatchItem) => {
        try {
          const response = await fetch(ANALYZE_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              content: item.content,
              scanType: item.scanType,
              userId,
              saveToHistory,
            }),
          });

          if (!response.ok) {
            throw new Error(`Analysis failed: ${response.statusText}`);
          }

          const data = await response.json();
          return {
            id: item.id,
            content: item.content,
            scanType: item.scanType,
            ...data.result,
            success: true,
          };
        } catch (error) {
          return {
            id: item.id,
            content: item.content,
            scanType: item.scanType,
            success: false,
            error: error.message || "Analysis failed",
          };
        }
      })
    );

    // Process results
    const processedResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          id: items[index].id,
          content: items[index].content,
          scanType: items[index].scanType,
          success: false,
          error: result.reason?.message || "Unknown error",
        };
      }
    });

    // Calculate summary statistics
    const successful = processedResults.filter((r) => r.success);
    const failed = processedResults.filter((r) => !r.success);
    const threatCounts = {
      safe: successful.filter((r) => r.threatLevel === "safe").length,
      suspicious: successful.filter((r) => r.threatLevel === "suspicious").length,
      dangerous: successful.filter((r) => r.threatLevel === "dangerous").length,
    };

    return jsonResponse({
      success: true,
      summary: {
        total: items.length,
        successful: successful.length,
        failed: failed.length,
        threatCounts,
      },
      results: processedResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Batch analysis error:", error);
    return errorResponse(error.message || "Internal server error");
  }
});
