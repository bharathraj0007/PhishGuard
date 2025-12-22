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

const blink = createClient({
  projectId: "phishguard-web-phishing-detector-eky2mdxr",
});

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    // GET - Retrieve user scan history
    if (req.method === "GET") {
      if (!userId) {
        return errorResponse("userId parameter is required", 400);
      }

      const limit = parseInt(url.searchParams.get("limit") || "20");
      const offset = parseInt(url.searchParams.get("offset") || "0");
      const scanType = url.searchParams.get("scanType");

      // Build query with filters
      let query = `SELECT * FROM phishing_scans WHERE user_id = ?`;
      const params: string[] = [userId];
      
      if (scanType && ["link", "email", "sms", "qr"].includes(scanType)) {
        query += ` AND scan_type = ?`;
        params.push(scanType);
      }
      
      query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      params.push(limit.toString(), offset.toString());

      // Fetch scans
      const scansResult = await blink.db.sql(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM phishing_scans WHERE user_id = ?`;
      const countParams: string[] = [userId];
      
      if (scanType && ["link", "email", "sms", "qr"].includes(scanType)) {
        countQuery += ` AND scan_type = ?`;
        countParams.push(scanType);
      }
      
      const countResult = await blink.db.sql<{ total: number }>(countQuery, countParams);
      const totalCount = countResult.rows?.[0]?.total || 0;

      // Parse indicators JSON and convert snake_case to camelCase
      const parsedScans = (scansResult.rows || []).map((scan: any) => ({
        id: scan.id,
        userId: scan.user_id,
        scanType: scan.scan_type,
        content: scan.content,
        threatLevel: scan.threat_level,
        confidence: scan.confidence,
        indicators: JSON.parse(scan.indicators || '[]'),
        analysis: scan.analysis,
        createdAt: scan.created_at
      }));

      return jsonResponse({
        success: true,
        scans: parsedScans,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount
        }
      });
    }

    // DELETE - Delete a specific scan
    if (req.method === "DELETE") {
      const scanId = url.searchParams.get("scanId");
      
      if (!scanId || !userId) {
        return errorResponse("scanId and userId parameters are required", 400);
      }

      // Verify ownership before deleting
      const scanResult = await blink.db.sql(
        `SELECT * FROM phishing_scans WHERE id = ?`,
        [scanId]
      );
      
      if (!scanResult.rows || scanResult.rows.length === 0) {
        return errorResponse("Scan not found", 404);
      }

      const scan = scanResult.rows[0];
      if (scan.user_id !== userId) {
        return errorResponse("Unauthorized to delete this scan", 403);
      }

      await blink.db.sql(`DELETE FROM phishing_scans WHERE id = ?`, [scanId]);

      return jsonResponse({
        success: true,
        message: "Scan deleted successfully"
      });
    }

    // POST - Bulk delete scans
    if (req.method === "POST") {
      const body = await req.json();
      
      if (!body.userId) {
        return errorResponse("userId is required", 400);
      }

      if (body.action === "deleteAll") {
        // Delete all scans for user
        await blink.db.sql(
          `DELETE FROM phishing_scans WHERE user_id = ?`,
          [body.userId]
        );

        return jsonResponse({
          success: true,
          message: "All scans deleted successfully"
        });
      }

      if (body.action === "deleteMultiple" && Array.isArray(body.scanIds)) {
        // Delete multiple specific scans
        for (const scanId of body.scanIds) {
          const scanResult = await blink.db.sql(
            `SELECT * FROM phishing_scans WHERE id = ?`,
            [scanId]
          );
          
          if (scanResult.rows && scanResult.rows.length > 0) {
            const scan = scanResult.rows[0];
            if (scan.user_id === body.userId) {
              await blink.db.sql(`DELETE FROM phishing_scans WHERE id = ?`, [scanId]);
            }
          }
        }

        return jsonResponse({
          success: true,
          message: `Deleted ${body.scanIds.length} scans`
        });
      }

      return errorResponse("Invalid action. Use 'deleteAll' or 'deleteMultiple'", 400);
    }

    return errorResponse("Method not allowed", 405);

  } catch (error) {
    console.error("Scan history error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Failed to process request",
      500
    );
  }
}

Deno.serve(handler);
