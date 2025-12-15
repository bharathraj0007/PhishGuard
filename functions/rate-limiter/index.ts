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

// In-memory rate limiter (for demo - production should use Redis)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const LIMITS = {
  analyze: { max: 100, window: 3600000 }, // 100 per hour
  batchAnalyze: { max: 10, window: 3600000 }, // 10 batch requests per hour
  export: { max: 20, window: 3600000 }, // 20 exports per hour
};

function checkRateLimit(userId: string, action: keyof typeof LIMITS): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const limit = LIMITS[action];

  let entry = rateLimits.get(key);

  // Reset if window expired
  if (!entry || now > entry.resetAt) {
    entry = {
      count: 0,
      resetAt: now + limit.window,
    };
    rateLimits.set(key, entry);
  }

  // Check if limit exceeded
  if (entry.count >= limit.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  rateLimits.set(key, entry);

  return {
    allowed: true,
    remaining: limit.max - entry.count,
    resetAt: entry.resetAt,
  };
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
    const { userId, action } = body;

    if (!userId) {
      return errorResponse("userId is required", 400);
    }

    if (!action || !LIMITS[action as keyof typeof LIMITS]) {
      return errorResponse("Invalid action. Must be: analyze, batchAnalyze, or export", 400);
    }

    const result = checkRateLimit(userId, action as keyof typeof LIMITS);

    if (!result.allowed) {
      const resetIn = Math.ceil((result.resetAt - Date.now()) / 1000 / 60); // minutes
      return jsonResponse(
        {
          success: false,
          rateLimited: true,
          message: `Rate limit exceeded. Try again in ${resetIn} minutes.`,
          resetAt: new Date(result.resetAt).toISOString(),
          resetIn,
        },
        429
      );
    }

    return jsonResponse({
      success: true,
      rateLimited: false,
      remaining: result.remaining,
      resetAt: new Date(result.resetAt).toISOString(),
    });
  } catch (error) {
    console.error("Rate limiter error:", error);
    return errorResponse(error.message || "Internal server error");
  }
});
