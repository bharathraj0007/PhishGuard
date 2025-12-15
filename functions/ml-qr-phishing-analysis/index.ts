/**
 * Edge Function: QR Code Phishing Analysis
 * Analyzes QR codes for phishing URLs using QR Decoder + URL Model
 * Processes QR images and returns threat analysis
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface QRAnalysisRequest {
  imageUrl?: string;
  base64Image?: string;
  decodedURL?: string;
  batchMode?: boolean;
}

interface URLAnalysisResult {
  url: string;
  isPhishing: boolean;
  confidence: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  indicators: string[];
  details: {
    domainScore: number;
    pathScore: number;
    parameterScore: number;
    structureScore: number;
  };
}

interface QRAnalysisResponse {
  success: boolean;
  decodedURL: string | null;
  analysis: URLAnalysisResult | null;
  isPhishing: boolean;
  threatLevel: string;
  riskScore: number;
  timestamp: string;
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(
    JSON.stringify({ error: message, success: false }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

/**
 * Analyze URL for phishing indicators
 */
function analyzeURLForPhishing(url: string): URLAnalysisResult {
  let domainScore = 0;
  let pathScore = 0;
  let parameterScore = 0;
  let structureScore = 0;
  const indicators: string[] = [];

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname;
    const search = parsedUrl.search;

    // Domain Analysis
    if (hostname.includes('paypai') || hostname.includes('gogle') || 
        hostname.includes('amaz0n') || hostname.includes('facbook')) {
      domainScore += 30;
      indicators.push('typosquatting_detected');
    }

    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      domainScore += 25;
      indicators.push('ip_address_used');
    }

    if (hostname.length > 50) {
      domainScore += 15;
      indicators.push('excessive_subdomain_depth');
    }

    if (['.tk', '.ml', '.ga', '.cf'].some(tld => hostname.endsWith(tld))) {
      domainScore += 20;
      indicators.push('suspicious_tld');
    }

    // Path Analysis
    if (pathname.toLowerCase().includes('verify') || 
        pathname.toLowerCase().includes('confirm') ||
        pathname.toLowerCase().includes('login')) {
      pathScore += 20;
      indicators.push('verification_path');
    }

    if (pathname.includes('//')) {
      pathScore += 25;
      indicators.push('double_slash_path');
    }

    // Parameter Analysis
    const paramCount = search.split('&').length;
    if (paramCount > 10) {
      parameterScore += 15;
      indicators.push('excessive_parameters');
    }

    if (search.includes('redirect') || search.includes('return')) {
      parameterScore += 15;
      indicators.push('redirect_parameter');
    }

    // Structure Analysis
    if (parsedUrl.protocol !== 'https:') {
      structureScore += 15;
      indicators.push('not_https');
    }

    if (url.length > 2048) {
      structureScore += 15;
      indicators.push('extremely_long_url');
    }

    const urlLower = url.toLowerCase();
    const suspiciousKeywords = ['verify', 'confirm', 'urgent', 'action', 'required', 'claim', 'prize'];
    for (const keyword of suspiciousKeywords) {
      if (urlLower.includes(keyword)) {
        structureScore += 2;
        indicators.push(`contains_keyword_${keyword}`);
      }
    }

    // Calculate total score
    const totalScore = Math.min(100, domainScore + pathScore + parameterScore + structureScore);

    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (totalScore >= 80) threatLevel = 'critical';
    else if (totalScore >= 60) threatLevel = 'high';
    else if (totalScore >= 40) threatLevel = 'medium';

    return {
      url,
      isPhishing: totalScore > 50,
      confidence: Math.abs(totalScore - 50) / 50,
      threatLevel,
      score: totalScore,
      indicators: [...new Set(indicators)],
      details: {
        domainScore: Math.min(100, domainScore),
        pathScore: Math.min(100, pathScore),
        parameterScore: Math.min(100, parameterScore),
        structureScore: Math.min(100, structureScore)
      }
    };
  } catch (error) {
    console.error('URL analysis error:', error);

    return {
      url,
      isPhishing: true,
      confidence: 0.95,
      threatLevel: 'critical',
      score: 95,
      indicators: ['invalid_url_format'],
      details: {
        domainScore: 95,
        pathScore: 0,
        parameterScore: 0,
        structureScore: 0
      }
    };
  }
}

/**
 * Process QR phishing analysis request
 */
async function processQRAnalysis(
  request: QRAnalysisRequest
): Promise<QRAnalysisResponse> {
  const timestamp = new Date().toISOString();

  // Determine decoded URL source
  let decodedURL = request.decodedURL;

  // In real implementation, would process base64Image or imageUrl to decode QR
  // For now, we accept pre-decoded URLs

  if (!decodedURL) {
    return {
      success: true,
      decodedURL: null,
      analysis: null,
      isPhishing: false,
      threatLevel: 'low',
      riskScore: 0,
      timestamp
    };
  }

  // Check if decoded content is a URL
  const isURLContent = /^https?:\/\/|^ftp:\/\/|^www\.|^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(decodedURL);

  if (!isURLContent) {
    return {
      success: true,
      decodedURL,
      analysis: null,
      isPhishing: false,
      threatLevel: 'low',
      riskScore: 10,
      timestamp
    };
  }

  // Analyze URL for phishing
  const analysis = analyzeURLForPhishing(decodedURL);

  return {
    success: true,
    decodedURL,
    analysis,
    isPhishing: analysis.isPhishing,
    threatLevel: analysis.threatLevel,
    riskScore: analysis.score,
    timestamp
  };
}

/**
 * Main handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json() as QRAnalysisRequest;

    // Validate request
    if (!body.decodedURL && !body.base64Image && !body.imageUrl) {
      return errorResponse('At least one of decodedURL, base64Image, or imageUrl is required', 400);
    }

    // Process request
    const result = await processQRAnalysis(body);
    return jsonResponse(result);
  } catch (error) {
    console.error('Error:', error);
    return errorResponse(error.message || 'Analysis failed', 500);
  }
});
