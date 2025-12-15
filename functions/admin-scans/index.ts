import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@blinkdotnew/sdk@0.19.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

const PROJECT_ID = "phishguard-web-phishing-detector-eky2mdxr";

const blink = createClient({
  projectId: PROJECT_ID,
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Unauthorized - Missing token", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Decode token to get user ID (JWT structure: header.payload.signature)
    let userId: string | null = null;
    try {
      const payloadBase64 = token.split('.')[1];
      if (payloadBase64) {
        const payload = JSON.parse(atob(payloadBase64));
        userId = payload.sub || payload.userId || payload.user_id;
      }
    } catch {
      return errorResponse("Invalid token format", 401);
    }

    if (!userId) {
      return errorResponse("Invalid token - no user ID found", 401);
    }

    // Verify user is admin by checking the database directly
    const userResult = await blink.db.sql<{ id: string; role: string }>(
      `SELECT id, role FROM users WHERE id = ?`,
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return errorResponse("User not found", 404);
    }

    const user = userResult.rows[0];
    if (user.role !== "admin") {
      return errorResponse("Admin access required", 403);
    }

    switch (action) {
      case "list": {
        // List all scans with pagination and filters
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const threatLevel = url.searchParams.get("threatLevel");
        const scanType = url.searchParams.get("scanType");
        const filterUserId = url.searchParams.get("userId");

        let query = `SELECT 
          s.*, 
          u.email as user_email,
          u.display_name as user_name
          FROM phishing_scans s
          LEFT JOIN users u ON s.user_id = u.id
          WHERE 1=1`;
        
        const params: string[] = [];

        if (threatLevel) {
          query += ` AND s.threat_level = ?`;
          params.push(threatLevel);
        }
        if (scanType) {
          query += ` AND s.scan_type = ?`;
          params.push(scanType);
        }
        if (filterUserId) {
          query += ` AND s.user_id = ?`;
          params.push(filterUserId);
        }

        query += ` ORDER BY s.created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit.toString(), offset.toString());

        const scansResult = await blink.db.sql(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM phishing_scans WHERE 1=1`;
        const countParams: string[] = [];
        
        if (threatLevel) {
          countQuery += ` AND threat_level = ?`;
          countParams.push(threatLevel);
        }
        if (scanType) {
          countQuery += ` AND scan_type = ?`;
          countParams.push(scanType);
        }
        if (filterUserId) {
          countQuery += ` AND user_id = ?`;
          countParams.push(filterUserId);
        }

        const countResult = await blink.db.sql<{ total: number }>(countQuery, countParams);
        const total = countResult.rows?.[0]?.total || 0;

        // Convert snake_case to camelCase for frontend
        const formattedScans = (scansResult.rows || []).map((scan: any) => ({
          id: scan.id,
          userId: scan.user_id,
          scanType: scan.scan_type,
          content: scan.content,
          threatLevel: scan.threat_level,
          confidence: scan.confidence,
          indicators: scan.indicators,
          analysis: scan.analysis,
          createdAt: scan.created_at,
          userEmail: scan.user_email,
          userName: scan.user_name
        }));

        return jsonResponse({
          scans: formattedScans,
          total,
          limit,
          offset,
        });
      }

      case "stats": {
        // Get comprehensive scan statistics
        const statsResult = await blink.db.sql<{
          total_scans: number;
          dangerous_count: number;
          suspicious_count: number;
          safe_count: number;
          link_scans: number;
          email_scans: number;
          sms_scans: number;
          qr_scans: number;
          avg_confidence: number;
          scans_today: number;
          scans_7days: number;
          scans_30days: number;
        }>(`
          SELECT 
            COUNT(*) as total_scans,
            SUM(CASE WHEN threat_level = 'dangerous' THEN 1 ELSE 0 END) as dangerous_count,
            SUM(CASE WHEN threat_level = 'suspicious' THEN 1 ELSE 0 END) as suspicious_count,
            SUM(CASE WHEN threat_level = 'safe' THEN 1 ELSE 0 END) as safe_count,
            SUM(CASE WHEN scan_type = 'link' THEN 1 ELSE 0 END) as link_scans,
            SUM(CASE WHEN scan_type = 'email' THEN 1 ELSE 0 END) as email_scans,
            SUM(CASE WHEN scan_type = 'sms' THEN 1 ELSE 0 END) as sms_scans,
            SUM(CASE WHEN scan_type = 'qr' THEN 1 ELSE 0 END) as qr_scans,
            AVG(confidence) as avg_confidence,
            SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as scans_today,
            SUM(CASE WHEN date(created_at) >= date('now', '-7 days') THEN 1 ELSE 0 END) as scans_7days,
            SUM(CASE WHEN date(created_at) >= date('now', '-30 days') THEN 1 ELSE 0 END) as scans_30days
          FROM phishing_scans
        `);

        // Get daily scan trends (last 30 days)
        const trendsResult = await blink.db.sql<{
          date: string;
          count: number;
          dangerous: number;
        }>(`
          SELECT 
            date(created_at) as date,
            COUNT(*) as count,
            SUM(CASE WHEN threat_level = 'dangerous' THEN 1 ELSE 0 END) as dangerous
          FROM phishing_scans
          WHERE date(created_at) >= date('now', '-30 days')
          GROUP BY date(created_at)
          ORDER BY date(created_at) DESC
        `);

        return jsonResponse({
          stats: statsResult.rows?.[0] || {},
          trends: trendsResult.rows || [],
        });
      }

      case "delete": {
        const scanId = url.searchParams.get("scanId");
        if (!scanId) {
          return errorResponse("Scan ID is required", 400);
        }

        await blink.db.sql(`DELETE FROM phishing_scans WHERE id = ?`, [scanId]);

        return jsonResponse({ message: "Scan deleted successfully" });
      }

      case "bulk-delete": {
        const body = await req.json();
        const { scanIds } = body;

        if (!scanIds || !Array.isArray(scanIds) || scanIds.length === 0) {
          return errorResponse("Scan IDs array is required", 400);
        }

        const placeholders = scanIds.map(() => "?").join(",");
        await blink.db.sql(
          `DELETE FROM phishing_scans WHERE id IN (${placeholders})`,
          scanIds
        );

        return jsonResponse({
          message: `${scanIds.length} scans deleted successfully`,
        });
      }

      default:
        return errorResponse("Invalid action", 400);
    }
  } catch (error) {
    console.error("Admin scans error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error"
    );
  }
});
