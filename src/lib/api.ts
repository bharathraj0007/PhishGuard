// Backend API endpoints for PhishGuard
export const API_ENDPOINTS = {
  ANALYZE_PHISHING: 'https://eky2mdxr--analyze-phishing.functions.blink.new',
  SCAN_HISTORY: 'https://eky2mdxr--scan-history.functions.blink.new',
  USER_ANALYTICS: 'https://eky2mdxr--user-analytics.functions.blink.new',
  BATCH_ANALYSIS: 'https://eky2mdxr--batch-analysis.functions.blink.new',
  EXPORT_SCANS: 'https://eky2mdxr--export-scans.functions.blink.new',
  RATE_LIMITER: 'https://eky2mdxr--rate-limiter.functions.blink.new',
} as const;

export interface AnalyzePhishingRequest {
  content: string;
  scanType: 'url' | 'email' | 'sms' | 'qr';
  userId?: string;
  saveToHistory?: boolean;
}

export interface AnalyzePhishingResponse {
  success: boolean;
  result: {
    threatLevel: 'safe' | 'suspicious' | 'dangerous';
    confidence: number;
    indicators: string[];
    analysis: string;
    recommendations: string[];
  };
  timestamp: string;
}

export interface ScanHistoryResponse {
  success: boolean;
  scans: Array<{
    id: string;
    userId: string;
    scanType: 'url' | 'email' | 'sms' | 'qr';
    content: string;
    threatLevel: 'safe' | 'suspicious' | 'dangerous';
    confidence: number;
    indicators: string[];
    analysis: string;
    createdAt: string;
  }>;
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UserAnalyticsResponse {
  success: boolean;
  analytics: {
    totalScans: number;
    averageConfidence: number;
    threatCounts: {
      safe: number;
      suspicious: number;
      dangerous: number;
    };
    threatDistribution: {
      safe: number;
      suspicious: number;
      dangerous: number;
    };
    scanTypeCounts: {
      link: number;
      email: number;
      sms: number;
      qr: number;
    };
    recentScans: Array<{
      id: string;
      scanType: string;
      threatLevel: string;
      confidence: number;
      createdAt: string;
    }>;
    trendData: Array<{
      date: string;
      count: number;
    }>;
    lastScanDate: string | null;
  };
}

/**
 * Analyze content for phishing threats
 */
export async function analyzePhishing(
  request: AnalyzePhishingRequest
): Promise<AnalyzePhishingResponse> {
  try {
    const response = await fetch(API_ENDPOINTS.ANALYZE_PHISHING, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to analyze content (${response.status})`);
    }

    return response.json();
  } catch (error) {
    console.error('Error analyzing phishing content:', error);
    throw error instanceof Error ? error : new Error('Failed to analyze content');
  }
}

/**
 * Get user scan history with pagination
 */
export async function getScanHistory(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    scanType?: 'url' | 'email' | 'sms' | 'qr';
  }
): Promise<ScanHistoryResponse> {
  try {
    const params = new URLSearchParams({
      userId,
      ...(options?.limit && { limit: options.limit.toString() }),
      ...(options?.offset && { offset: options.offset.toString() }),
      ...(options?.scanType && { scanType: options.scanType }),
    });

    const response = await fetch(`${API_ENDPOINTS.SCAN_HISTORY}?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `Failed to fetch scan history (${response.status})`);
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching scan history:', error);
    throw error instanceof Error ? error : new Error('Failed to fetch scan history');
  }
}

/**
 * Delete a specific scan
 */
export async function deleteScan(scanId: string, userId: string): Promise<void> {
  const params = new URLSearchParams({ scanId, userId });
  
  const response = await fetch(`${API_ENDPOINTS.SCAN_HISTORY}?${params}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete scan');
  }
}

/**
 * Delete all scans for a user
 */
export async function deleteAllScans(userId: string): Promise<void> {
  const response = await fetch(API_ENDPOINTS.SCAN_HISTORY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      action: 'deleteAll',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete scans');
  }
}

/**
 * Delete multiple scans
 */
export async function deleteMultipleScans(
  userId: string,
  scanIds: string[]
): Promise<void> {
  const response = await fetch(API_ENDPOINTS.SCAN_HISTORY, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      action: 'deleteMultiple',
      scanIds,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete scans');
  }
}

/**
 * Get user analytics and statistics
 */
export async function getUserAnalytics(
  userId: string
): Promise<UserAnalyticsResponse> {
  const params = new URLSearchParams({ userId });

  const response = await fetch(`${API_ENDPOINTS.USER_ANALYTICS}?${params}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch analytics');
  }

  return response.json();
}

/**
 * Batch analyze multiple items at once
 */
export interface BatchAnalysisRequest {
  items: Array<{
    content: string;
    scanType: 'url' | 'email' | 'sms' | 'qr';
    id?: string;
  }>;
  userId?: string;
  saveToHistory?: boolean;
}

export interface BatchAnalysisResponse {
  success: boolean;
  summary: {
    total: number;
    successful: number;
    failed: number;
    threatCounts: {
      safe: number;
      suspicious: number;
      dangerous: number;
    };
  };
  results: Array<{
    id?: string;
    content: string;
    scanType: string;
    success: boolean;
    threatLevel?: 'safe' | 'suspicious' | 'dangerous';
    confidence?: number;
    indicators?: string[];
    analysis?: string;
    recommendations?: string[];
    error?: string;
  }>;
  timestamp: string;
}

export async function batchAnalyze(
  request: BatchAnalysisRequest
): Promise<BatchAnalysisResponse> {
  const response = await fetch(API_ENDPOINTS.BATCH_ANALYSIS, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze batch');
  }

  return response.json();
}

/**
 * Export scans to CSV or JSON
 */
export async function exportScans(
  userId: string,
  format: 'json' | 'csv' = 'json',
  scanType?: 'url' | 'email' | 'sms' | 'qr'
): Promise<Blob> {
  const params = new URLSearchParams({ userId, format });
  if (scanType) {
    params.append('scanType', scanType);
  }

  const response = await fetch(`${API_ENDPOINTS.EXPORT_SCANS}?${params}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to export scans');
  }

  return response.blob();
}

/**
 * Check rate limit for user action
 */
export interface RateLimitResponse {
  success: boolean;
  rateLimited: boolean;
  remaining?: number;
  resetAt?: string;
  resetIn?: number;
  message?: string;
}

export async function checkRateLimit(
  userId: string,
  action: 'analyze' | 'batchAnalyze' | 'export'
): Promise<RateLimitResponse> {
  const response = await fetch(API_ENDPOINTS.RATE_LIMITER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId, action }),
  });

  return response.json();
}

