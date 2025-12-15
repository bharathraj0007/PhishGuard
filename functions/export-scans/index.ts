import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@blinkdotnew/sdk@0.19.2";

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

function csvResponse(data: string, filename: string) {
  return new Response(data, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...corsHeaders,
    },
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return errorResponse("Method not allowed", 405);
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const format = url.searchParams.get("format") || "json"; // json or csv
    const scanType = url.searchParams.get("scanType");

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    if (!["json", "csv"].includes(format)) {
      return errorResponse("format must be 'json' or 'csv'", 400);
    }

    // Initialize Blink SDK
    const blink = createClient({ projectId: PROJECT_ID });

    // Fetch all scans for user
    let query = blink.db
      .from("phishing_scans")
      .where("user_id", "=", userId)
      .orderBy("created_at", "desc");

    if (scanType) {
      query = query.where("scan_type", "=", scanType);
    }

    const scans = await query.list();

    if (scans.length === 0) {
      return errorResponse("No scans found for this user", 404);
    }

    // Convert to export format
    const exportData = scans.map((scan) => ({
      id: scan.id,
      scanType: scan.scanType,
      content: scan.content,
      threatLevel: scan.threatLevel,
      confidence: scan.confidence,
      indicators: Array.isArray(scan.indicators) 
        ? scan.indicators 
        : JSON.parse(scan.indicators || "[]"),
      analysis: scan.analysis,
      createdAt: scan.createdAt,
    }));

    if (format === "json") {
      return jsonResponse({
        success: true,
        userId,
        totalScans: exportData.length,
        exportedAt: new Date().toISOString(),
        scans: exportData,
      });
    } else {
      // CSV format
      const csvRows = [
        // Header
        "ID,Scan Type,Content,Threat Level,Confidence,Indicators,Analysis,Created At",
        // Data rows
        ...exportData.map((scan) => {
          const indicators = Array.isArray(scan.indicators)
            ? scan.indicators.join("; ")
            : "";
          const content = scan.content.replace(/"/g, '""'); // Escape quotes
          const analysis = scan.analysis.replace(/"/g, '""');
          
          return `"${scan.id}","${scan.scanType}","${content}","${scan.threatLevel}",${scan.confidence},"${indicators}","${analysis}","${scan.createdAt}"`;
        }),
      ];

      const csvContent = csvRows.join("\n");
      const filename = `phishguard-scans-${userId}-${new Date().toISOString().split('T')[0]}.csv`;
      
      return csvResponse(csvContent, filename);
    }
  } catch (error) {
    console.error("Export error:", error);
    return errorResponse(error.message || "Internal server error");
  }
});
