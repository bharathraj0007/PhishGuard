import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@blinkdotnew/sdk@0.19.2";

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

    const currentUser = userResult.rows[0];
    if (currentUser.role !== "admin") {
      return errorResponse("Admin access required", 403);
    }

    switch (action) {
      case "list": {
        // List all users with pagination
        const limit = parseInt(url.searchParams.get("limit") || "20");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const search = url.searchParams.get("search") || "";

        let query = `SELECT id, email, email_verified, display_name, avatar_url, role, created_at, updated_at, last_sign_in FROM users`;
        const params: string[] = [];

        if (search) {
          query += ` WHERE email LIKE ? OR display_name LIKE ?`;
          params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        params.push(limit.toString(), offset.toString());

        const usersResult = await blink.db.sql(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) as total FROM users`;
        const countParams: string[] = [];
        if (search) {
          countQuery += ` WHERE email LIKE ? OR display_name LIKE ?`;
          countParams.push(`%${search}%`, `%${search}%`);
        }

        const countResult = await blink.db.sql<{ total: number }>(countQuery, countParams);
        const total = countResult.rows?.[0]?.total || 0;

        // Convert snake_case to camelCase for frontend
        const formattedUsers = (usersResult.rows || []).map((user: any) => ({
          id: user.id,
          email: user.email,
          emailVerified: user.email_verified,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          role: user.role,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastSignIn: user.last_sign_in
        }));

        return jsonResponse({
          users: formattedUsers,
          total,
          limit,
          offset,
        });
      }

      case "get": {
        const targetUserId = url.searchParams.get("userId");
        if (!targetUserId) {
          return errorResponse("User ID is required", 400);
        }

        const result = await blink.db.sql(
          `SELECT * FROM users WHERE id = ?`,
          [targetUserId]
        );
        
        if (!result.rows || result.rows.length === 0) {
          return errorResponse("User not found", 404);
        }

        return jsonResponse({ user: result.rows[0] });
      }

      case "update": {
        const body = await req.json();
        const { userId: targetUserId, email, displayName, role, emailVerified } = body;

        if (!targetUserId) {
          return errorResponse("User ID is required", 400);
        }

        const updates: string[] = [];
        const params: string[] = [];

        if (email) {
          updates.push("email = ?");
          params.push(email);
        }
        if (displayName !== undefined) {
          updates.push("display_name = ?");
          params.push(displayName);
        }
        if (role) {
          updates.push("role = ?");
          params.push(role);
        }
        if (emailVerified !== undefined) {
          updates.push("email_verified = ?");
          params.push(emailVerified ? "1" : "0");
        }

        if (updates.length === 0) {
          return errorResponse("No fields to update", 400);
        }

        updates.push("updated_at = ?");
        params.push(new Date().toISOString());
        params.push(targetUserId);

        await blink.db.sql(
          `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
          params
        );

        return jsonResponse({ message: "User updated successfully" });
      }

      case "delete": {
        const targetUserId = url.searchParams.get("userId");
        if (!targetUserId) {
          return errorResponse("User ID is required", 400);
        }

        // Delete user's scans first
        await blink.db.sql(
          `DELETE FROM phishing_scans WHERE user_id = ?`,
          [targetUserId]
        );

        // Delete user
        await blink.db.sql(
          `DELETE FROM users WHERE id = ?`,
          [targetUserId]
        );

        return jsonResponse({ message: "User deleted successfully" });
      }

      case "stats": {
        // Get user statistics
        const statsResult = await blink.db.sql<{
          total_users: number;
          verified_users: number;
          admin_count: number;
          new_today: number;
          active_7days: number;
        }>(`
          SELECT 
            COUNT(*) as total_users,
            SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) as verified_users,
            SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_count,
            SUM(CASE WHEN date(created_at) = date('now') THEN 1 ELSE 0 END) as new_today,
            SUM(CASE WHEN date(last_sign_in) >= date('now', '-7 days') THEN 1 ELSE 0 END) as active_7days
          FROM users
        `);

        return jsonResponse({ stats: statsResult.rows?.[0] || {} });
      }

      default:
        return errorResponse("Invalid action", 400);
    }
  } catch (error) {
    console.error("Admin users error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error"
    );
  }
});
