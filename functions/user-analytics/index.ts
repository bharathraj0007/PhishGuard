import { createClient } from "npm:@blinkdotnew/sdk";

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

// Initialize Blink client with secret key for server-side access
const projectId = Deno.env.get("BLINK_PROJECT_ID") || "phishguard-web-phishing-detector-eky2mdxr";
const secretKey = Deno.env.get("BLINK_SECRET_KEY");

const blink = createClient({
  projectId,
  secretKey,
});

interface ScanRow {
  id: string;
  user_id: string;
  scan_type: string;
  content: string;
  threat_level: string;
  confidence: number;
  indicators: string;
  analysis: string;
  created_at: string;
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "GET") {
      return errorResponse("Method not allowed. Use GET", 405);
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return errorResponse("userId parameter is required", 400);
    }

    // Fetch all user scans using SQL
    const scansResult = await blink.db.sql<ScanRow>(
      `SELECT * FROM phishing_scans WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );

    const allScans = scansResult.rows || [];

    // Calculate statistics
    const totalScans = allScans.length;
    
    const threatCounts = {
      safe: 0,
      suspicious: 0,
      dangerous: 0
    };

    const scanTypeCounts = {
      link: 0,
      email: 0,
      sms: 0,
      qr: 0
    };

    let totalConfidence = 0;
    const recentScans: any[] = [];

    for (const scan of allScans) {
      // Count threat levels
      if (scan.threat_level === 'safe') threatCounts.safe++;
      else if (scan.threat_level === 'suspicious') threatCounts.suspicious++;
      else if (scan.threat_level === 'dangerous') threatCounts.dangerous++;

      // Count scan types
      if (scan.scan_type === 'link') scanTypeCounts.link++;
      else if (scan.scan_type === 'email') scanTypeCounts.email++;
      else if (scan.scan_type === 'sms') scanTypeCounts.sms++;
      else if (scan.scan_type === 'qr') scanTypeCounts.qr++;

      // Sum confidence for average
      totalConfidence += Number(scan.confidence) || 0;

      // Collect recent scans (last 5)
      if (recentScans.length < 5) {
        recentScans.push({
          id: scan.id,
          scanType: scan.scan_type,
          threatLevel: scan.threat_level,
          confidence: scan.confidence,
          createdAt: scan.created_at
        });
      }
    }

    const averageConfidence = totalScans > 0 ? totalConfidence / totalScans : 0;

    // Calculate threat distribution percentages
    const threatDistribution = {
      safe: totalScans > 0 ? Math.round((threatCounts.safe / totalScans) * 100) : 0,
      suspicious: totalScans > 0 ? Math.round((threatCounts.suspicious / totalScans) * 100) : 0,
      dangerous: totalScans > 0 ? Math.round((threatCounts.dangerous / totalScans) * 100) : 0
    };

    // Get scans by date for trend analysis (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentScansForTrend = allScans.filter((scan) => {
      const scanDate = new Date(scan.created_at);
      return scanDate >= thirtyDaysAgo;
    });

    // Group by date
    const scansByDate: Record<string, number> = {};
    for (const scan of recentScansForTrend) {
      const date = new Date(scan.created_at).toISOString().split('T')[0];
      scansByDate[date] = (scansByDate[date] || 0) + 1;
    }

    // Convert to array for frontend
    const trendData = Object.entries(scansByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return jsonResponse({
      success: true,
      analytics: {
        totalScans,
        averageConfidence: Math.round(averageConfidence * 100) / 100,
        threatCounts,
        threatDistribution,
        scanTypeCounts,
        recentScans,
        trendData,
        lastScanDate: allScans[0]?.created_at || null
      }
    });

  } catch (error) {
    console.error("Analytics error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to fetch analytics",
      500
    );
  }
}

Deno.serve(handler);
