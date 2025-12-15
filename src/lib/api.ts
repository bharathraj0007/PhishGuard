// Backend API endpoints for PhishGuard
export const API_ENDPOINTS = {
  ANALYZE_PHISHING: 'https://eky2mdxr-5nywshw2b4hj.deno.dev',
  SCAN_HISTORY: 'https://eky2mdxr-xgx5k3g6mqsv.deno.dev',
  USER_ANALYTICS: 'https://eky2mdxr-khnthk1wadsy.deno.dev',
  BATCH_ANALYSIS: 'https://eky2mdxr--batch-analysis.functions.blink.new',
  EXPORT_SCANS: 'https://eky2mdxr-mrrhy5qn3jj9.deno.dev',
  RATE_LIMITER: 'https://eky2mdxr--rate-limiter.functions.blink.new',
  ADMIN_ANALYTICS: 'https://eky2mdxr-d68aeg4r3y0h.deno.dev',
  ADMIN_USERS: 'https://eky2mdxr-dmtkmjajay4k.deno.dev',
  ADMIN_SCANS: 'https://eky2mdxr--admin-scans.functions.blink.new',
  ML_DATASETS: 'https://eky2mdxr-pc3138jybbfh.deno.dev',
  ML_TRAINING: 'https://eky2mdxr-r7kzprae1t00.deno.dev',
  ML_TESTING: 'https://eky2mdxr-dzvvqsy2100w.deno.dev',
} as const;

export interface AnalyzePhishingRequest {
  content: string;
  scanType: 'link' | 'email' | 'sms' | 'qr';
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
    scanType: 'link' | 'email' | 'sms' | 'qr';
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
    scanType?: 'link' | 'email' | 'sms' | 'qr';
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
    scanType: 'link' | 'email' | 'sms' | 'qr';
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
  scanType?: 'link' | 'email' | 'sms' | 'qr'
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

/**
 * Get admin analytics (requires admin key)
 */
export interface AdminAnalyticsResponse {
  success: boolean;
  analytics: {
    overview: {
      totalScans: number;
      uniqueUsers: number;
      averageConfidence: number;
      scansLast30Days: number;
    };
    threatDistribution: {
      counts: {
        safe: number;
        suspicious: number;
        dangerous: number;
      };
      percentages: {
        safe: string;
        suspicious: string;
        dangerous: string;
      };
    };
    scanTypeDistribution: {
      counts: {
        link: number;
        email: number;
        sms: number;
        qr: number;
      };
      percentages: {
        link: string;
        email: string;
        sms: string;
        qr: string;
      };
    };
    trendData: Array<{
      date: string;
      count: number;
    }>;
    topUsers: Array<{
      userId: string;
      scanCount: number;
    }>;
    topIndicators: Array<{
      indicator: string;
      count: number;
    }>;
  };
  timestamp: string;
}

export async function getAdminAnalytics(
  adminKey: string
): Promise<AdminAnalyticsResponse> {
  const params = new URLSearchParams({ adminKey });

  const response = await fetch(`${API_ENDPOINTS.ADMIN_ANALYTICS}?${params}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch admin analytics');
  }

  return response.json();
}

// Admin API functions - require admin token
import { blink } from './blink';
import { syncService } from './sync-service';

async function getAdminHeaders() {
  try {
    const user = await blink.auth.me();
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }
    
    const token = await blink.auth.getValidToken();
    if (!token) {
      throw new Error('No authentication token');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch (error) {
    console.error('Error getting admin headers:', error);
    throw new Error('Authentication failed. Please log in again.');
  }
}

export const adminAPI = {
  /**
   * List all users with pagination and search
   */
  async listUsers(options: {
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    try {
      const params = new URLSearchParams({
        action: 'list',
        ...(options.search && { search: options.search }),
        ...(options.limit && { limit: options.limit.toString() }),
        ...(options.offset && { offset: options.offset.toString() }),
      });

      const response = await fetch(`${API_ENDPOINTS.ADMIN_USERS}?${params}`, {
        headers: await getAdminHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to list users (${response.status})`);
      }

      return response.json();
    } catch (error) {
      console.error('Error listing users:', error);
      throw error instanceof Error ? error : new Error('Failed to list users');
    }
  },

  /**
   * Get user details by ID
   */
  async getUser(userId: string) {
    const params = new URLSearchParams({ action: 'get', userId });

    const response = await fetch(`${API_ENDPOINTS.ADMIN_USERS}?${params}`, {
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get user');
    }

    return response.json();
  },

  /**
   * Update user details
   */
  async updateUser(
    userId: string,
    updates: {
      email?: string;
      displayName?: string;
      role?: string;
      emailVerified?: boolean;
    }
  ) {
    const response = await fetch(`${API_ENDPOINTS.ADMIN_USERS}?action=update`, {
      method: 'POST',
      headers: await getAdminHeaders(),
      body: JSON.stringify({ userId, ...updates }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user');
    }

    return response.json();
  },

  /**
   * Delete a user
   */
  async deleteUser(userId: string) {
    const params = new URLSearchParams({ action: 'delete', userId });

    const response = await fetch(`${API_ENDPOINTS.ADMIN_USERS}?${params}`, {
      method: 'DELETE',
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete user');
    }

    // Create sync event for user deletion
    await syncService.createSyncEvent('users', userId, 'delete');

    return response.json();
  },

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      const params = new URLSearchParams({ action: 'stats' });

      const response = await fetch(`${API_ENDPOINTS.ADMIN_USERS}?${params}`, {
        headers: await getAdminHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to get user stats (${response.status})`);
      }

      return response.json();
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error instanceof Error ? error : new Error('Failed to get user stats');
    }
  },

  /**
   * List all scans with filters
   */
  async listScans(options: {
    limit?: number;
    offset?: number;
    threatLevel?: string;
    scanType?: string;
    userId?: string;
  }) {
    const params = new URLSearchParams({
      action: 'list',
      ...(options.limit && { limit: options.limit.toString() }),
      ...(options.offset && { offset: options.offset.toString() }),
      ...(options.threatLevel && { threatLevel: options.threatLevel }),
      ...(options.scanType && { scanType: options.scanType }),
      ...(options.userId && { userId: options.userId }),
    });

    const response = await fetch(`${API_ENDPOINTS.ADMIN_SCANS}?${params}`, {
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list scans');
    }

    return response.json();
  },

  /**
   * Get scan statistics
   */
  async getScanStats() {
    try {
      const params = new URLSearchParams({ action: 'stats' });

      const response = await fetch(`${API_ENDPOINTS.ADMIN_SCANS}?${params}`, {
        headers: await getAdminHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Failed to get scan stats (${response.status})`);
      }

      return response.json();
    } catch (error) {
      console.error('Error getting scan stats:', error);
      throw error instanceof Error ? error : new Error('Failed to get scan stats');
    }
  },

  /**
   * Delete a scan
   */
  async deleteScan(scanId: string) {
    const params = new URLSearchParams({ action: 'delete', scanId });

    const response = await fetch(`${API_ENDPOINTS.ADMIN_SCANS}?${params}`, {
      method: 'DELETE',
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete scan');
    }

    // Create sync event for scan deletion
    await syncService.createSyncEvent('phishingScans', scanId, 'delete');

    return response.json();
  },

  /**
   * Bulk delete scans
   */
  async bulkDeleteScans(scanIds: string[]) {
    const response = await fetch(`${API_ENDPOINTS.ADMIN_SCANS}?action=bulk-delete`, {
      method: 'POST',
      headers: await getAdminHeaders(),
      body: JSON.stringify({ scanIds }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to bulk delete scans');
    }

    return response.json();
  },

  // ═══════════════════════════════════════════════════════════════════
  // ML MODEL MANAGEMENT APIs
  // ═══════════════════════════════════════════════════════════════════

  /**
   * List all training datasets
   */
  async listDatasets() {
    try {
      // Ensure admin session is valid (same checks as other admin APIs)
      await getAdminHeaders();

      const result = await blink.db.sql<{
        id: string;
        name: string;
        description: string;
        datasetType: string;
        recordCount: number;
        status: string;
        uploadedBy: string;
        createdAt: string;
        updatedAt: string;
      }>(
        `SELECT
          id,
          name,
          description,
          dataset_type as datasetType,
          record_count as recordCount,
          status,
          uploaded_by as uploadedBy,
          created_at as createdAt,
          updated_at as updatedAt
        FROM training_datasets
        ORDER BY created_at DESC`
      );

      return { success: true, datasets: result.rows ?? [] };
    } catch (error) {
      console.error('Error listing datasets:', error);
      throw error instanceof Error ? error : new Error('Failed to list datasets');
    }
  },

  /**
   * Upload training dataset
   */
  async uploadDataset(data: {
    name: string;
    description: string;
    datasetType: 'phishing' | 'safe' | 'mixed';
    records: Array<{
      content: string;
      scanType: 'link' | 'email' | 'sms' | 'qr';
      isPhishing: boolean;
      threatLevel?: string;
      indicators?: string[];
      notes?: string;
    }>;
  }) {
    try {
      await getAdminHeaders();

      const user = await blink.auth.me();
      if (!user) throw new Error('Not authenticated');

      const datasetId = `dataset_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      await blink.db.sql(
        `INSERT INTO training_datasets (
          id, name, description, dataset_type, file_url, record_count, uploaded_by, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          datasetId,
          data.name,
          data.description || '',
          data.datasetType,
          null,
          0,
          user.id,
          'processing',
          now,
          now,
        ]
      );

      for (const record of data.records) {
        const recordId = `record_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        await blink.db.sql(
          `INSERT INTO training_records (
            id, dataset_id, content, scan_type, is_phishing, threat_level, indicators, notes, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            recordId,
            datasetId,
            record.content,
            record.scanType,
            record.isPhishing ? 1 : 0,
            record.threatLevel || (record.isPhishing ? 'dangerous' : 'safe'),
            JSON.stringify(record.indicators || []),
            record.notes || '',
            now,
          ]
        );
      }

      await blink.db.sql(
        `UPDATE training_datasets
         SET record_count = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        [data.records.length, 'ready', now, datasetId]
      );

      return {
        success: true,
        datasetId,
        recordCount: data.records.length,
        message: `Uploaded ${data.records.length} training records`,
      };
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error instanceof Error ? error : new Error('Failed to upload dataset');
    }
  },

  /**
   * Delete a dataset
   */
  async deleteDataset(datasetId: string) {
    try {
      await getAdminHeaders();

      await blink.db.sql(`DELETE FROM training_records WHERE dataset_id = ?`, [datasetId]);
      await blink.db.sql(`DELETE FROM training_datasets WHERE id = ?`, [datasetId]);

      return { success: true, message: 'Dataset deleted successfully' };
    } catch (error) {
      console.error('Error deleting dataset:', error);
      throw error instanceof Error ? error : new Error('Failed to delete dataset');
    }
  },

  /**
   * Train ML model with a dataset
   */
  async trainModel(data: {
    datasetId: string;
    versionNumber: string;
    description?: string;
    config?: {
      epochs?: number;
      batchSize?: number;
      learningRate?: number;
    };
  }) {
    const user = await blink.auth.me();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_ENDPOINTS.ML_TRAINING}/train`, {
      method: 'POST',
      headers: await getAdminHeaders(),
      body: JSON.stringify({
        ...data,
        userId: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start training');
    }

    return response.json();
  },

  /**
   * List all model versions
   */
  async listModels() {
    const response = await fetch(`${API_ENDPOINTS.ML_TRAINING}/models`, {
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list models');
    }

    return response.json();
  },

  /**
   * Get specific model version
   */
  async getModel(modelId: string) {
    const response = await fetch(`${API_ENDPOINTS.ML_TRAINING}/models/${modelId}`, {
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get model');
    }

    return response.json();
  },

  /**
   * Deploy a model version (set as active)
   */
  async deployModel(modelId: string) {
    const response = await fetch(`${API_ENDPOINTS.ML_TRAINING}/deploy/${modelId}`, {
      method: 'POST',
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to deploy model');
    }

    return response.json();
  },

  /**
   * Test ML model
   */
  async testModel(data: {
    modelVersionId: string;
    testName: string;
    testDatasetId?: string;
    testType: 'validation' | 'performance' | 'accuracy' | 'custom';
  }) {
    const user = await blink.auth.me();
    if (!user) throw new Error('Not authenticated');

    const response = await fetch(`${API_ENDPOINTS.ML_TESTING}/test`, {
      method: 'POST',
      headers: await getAdminHeaders(),
      body: JSON.stringify({
        ...data,
        userId: user.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start test');
    }

    return response.json();
  },

  /**
   * List all model tests
   */
  async listTests(modelId?: string) {
    const url = modelId 
      ? `${API_ENDPOINTS.ML_TESTING}/tests?modelId=${modelId}`
      : `${API_ENDPOINTS.ML_TESTING}/tests`;

    const response = await fetch(url, {
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to list tests');
    }

    return response.json();
  },

  /**
   * Get specific test results
   */
  async getTest(testId: string) {
    const response = await fetch(`${API_ENDPOINTS.ML_TESTING}/tests/${testId}`, {
      headers: await getAdminHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get test');
    }

    return response.json();
  },
};