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
    const adminKey = url.searchParams.get("adminKey");

    // Simple admin authentication (in production, use proper auth)
    if (adminKey !== "phishguard_admin_2025") {
      return errorResponse("Unauthorized", 403);
    }

    // Initialize Blink SDK
    const blink = createClient({ projectId: PROJECT_ID });

    // Fetch all scans (global statistics)
    const allScans = await blink.db
      .from("phishing_scans")
      .orderBy("created_at", "desc")
      .list();

    // Calculate global metrics
    const totalScans = allScans.length;
    const uniqueUsers = new Set(allScans.map((s) => s.userId)).size;

    // Threat level distribution
    const threatCounts = {
      safe: allScans.filter((s) => s.threatLevel === "safe").length,
      suspicious: allScans.filter((s) => s.threatLevel === "suspicious").length,
      dangerous: allScans.filter((s) => s.threatLevel === "dangerous").length,
    };

    // Scan type distribution
    const scanTypeCounts = {
      link: allScans.filter((s) => s.scanType === "link").length,
      email: allScans.filter((s) => s.scanType === "email").length,
      sms: allScans.filter((s) => s.scanType === "sms").length,
      qr: allScans.filter((s) => s.scanType === "qr").length,
    };

    // Average confidence
    const avgConfidence =
      allScans.length > 0
        ? allScans.reduce((sum, s) => sum + Number(s.confidence), 0) / allScans.length
        : 0;

    // Daily statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentScans = allScans.filter(
      (s) => new Date(s.createdAt) >= thirtyDaysAgo
    );

    const dailyStats = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyStats.set(dateStr, 0);
    }

    recentScans.forEach((scan) => {
      const dateStr = scan.createdAt.split("T")[0];
      dailyStats.set(dateStr, (dailyStats.get(dateStr) || 0) + 1);
    });

    const trendData = Array.from(dailyStats.entries())
      .map(([date, count]) => ({ date, count }))
      .reverse();

    // Top users by scan count
    const userScanCounts = new Map<string, number>();
    allScans.forEach((scan) => {
      userScanCounts.set(
        scan.userId,
        (userScanCounts.get(scan.userId) || 0) + 1
      );
    });

    const topUsers = Array.from(userScanCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, scanCount: count }));

    // Most common threat indicators
    const indicatorCounts = new Map<string, number>();
    allScans.forEach((scan) => {
      const indicators = Array.isArray(scan.indicators)
        ? scan.indicators
        : JSON.parse(scan.indicators || "[]");
      indicators.forEach((indicator: string) => {
        indicatorCounts.set(
          indicator,
          (indicatorCounts.get(indicator) || 0) + 1
        );
      });
    });

    const topIndicators = Array.from(indicatorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([indicator, count]) => ({ indicator, count }));

    return jsonResponse({
      success: true,
      analytics: {
        overview: {
          totalScans,
          uniqueUsers,
          averageConfidence: parseFloat(avgConfidence.toFixed(2)),
          scansLast30Days: recentScans.length,
        },
        threatDistribution: {
          counts: threatCounts,
          percentages: {
            safe: ((threatCounts.safe / totalScans) * 100).toFixed(1),
            suspicious: ((threatCounts.suspicious / totalScans) * 100).toFixed(1),
            dangerous: ((threatCounts.dangerous / totalScans) * 100).toFixed(1),
          },
        },
        scanTypeDistribution: {
          counts: scanTypeCounts,
          percentages: {
            link: ((scanTypeCounts.link / totalScans) * 100).toFixed(1),
            email: ((scanTypeCounts.email / totalScans) * 100).toFixed(1),
            sms: ((scanTypeCounts.sms / totalScans) * 100).toFixed(1),
            qr: ((scanTypeCounts.qr / totalScans) * 100).toFixed(1),
          },
        },
        trendData,
        topUsers,
        topIndicators,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin analytics error:", error);
    return errorResponse(error.message || "Internal server error");
  }
});
