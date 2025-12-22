/**
 * Real-time Synchronization Service
 * Handles data synchronization and event processing
 */

import { blink } from './blink';

function isNetworkLikeError(error: unknown): boolean {
  const e = error as any;
  return (
    e?.name === 'BlinkNetworkError' ||
    e?.code === 'NETWORK_ERROR' ||
    e?.status === 0 ||
    e?.message === 'Failed to fetch' ||
    String(e?.message ?? '').includes('Failed to fetch')
  );
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export interface SyncEvent {
  id: string;
  eventType: 'create' | 'update' | 'delete';
  tableName: string;
  recordId: string;
  operation: string;
  data?: string;
  userId?: string;
  processed: number;
  createdAt: string;
}

export interface SyncOptions {
  interval?: number;
  autoSync?: boolean;
  tables?: string[];
}

class SyncService {
  private syncInterval: number = 5000; // 5 seconds default
  private autoSync: boolean = true;
  private syncTimer: number | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private lastSyncTime: Map<string, string> = new Map();
  private isInitialized: boolean = false;
  private isSyncing: boolean = false;
  private consecutiveFailures: number = 0;
  private pausedUntilMs: number = 0;

  /**
   * Initialize the sync service
   */
  async initialize(options: SyncOptions = {}) {
    if (this.isInitialized) return;

    // Default: never start background sync for anonymous/offline users.
    const isAuthenticated = blink.auth.isAuthenticated?.() ?? false;
    if (!isAuthenticated || !isOnline()) {
      this.autoSync = options.autoSync ?? false;
      this.syncInterval = options.interval ?? 5000;
      this.isInitialized = true;
      return;
    }

    // Load settings from database (only when authenticated + online)
    try {
      const settings = await blink.db.systemSettings.list();
      
      const realtimeSetting = settings.find(s => s.settingKey === 'enable_realtime_sync');
      const intervalSetting = settings.find(s => s.settingKey === 'sync_interval');

      // Keep settings-driven toggle, but require authentication.
      this.autoSync = realtimeSetting
        ? realtimeSetting.settingValue === 'true'
        : (options.autoSync ?? true);
      this.syncInterval = intervalSetting ? parseInt(intervalSetting.settingValue) : (options.interval ?? 5000);
    } catch (error) {
      console.warn('Failed to load sync settings, using defaults:', error);
      this.autoSync = options.autoSync ?? true;
      this.syncInterval = options.interval ?? 5000;
    }

    this.isInitialized = true;

    if (this.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Start automatic synchronization
   */
  startAutoSync() {
    if (this.syncTimer) return;

    this.syncTimer = window.setInterval(() => {
      void this.safeSyncAll();
    }, this.syncInterval);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private async safeSyncAll() {
    const now = Date.now();
    if (now < this.pausedUntilMs) return;
    if (this.isSyncing) return;

    // Only sync for authenticated sessions.
    const isAuthenticated = blink.auth.isAuthenticated?.() ?? false;
    if (!isAuthenticated || !isOnline()) return;

    this.isSyncing = true;
    try {
      await this.syncAll();
      this.consecutiveFailures = 0;
    } catch (error) {
      // syncAll should be resilient, but keep a safety net.
      if (isNetworkLikeError(error)) {
        this.consecutiveFailures += 1;
        const backoffMs = Math.min(60_000, 2_000 * Math.pow(2, this.consecutiveFailures));
        this.pausedUntilMs = Date.now() + backoffMs;
        console.warn(`Sync paused for ${Math.round(backoffMs / 1000)}s due to network errors.`);
        return;
      }
      console.error('Unexpected sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync all tables
   */
  async syncAll() {
    const tables = ['phishingScans', 'trainingDatasets', 'trainingRecords', 'modelVersions', 'modelTests'];
    
    for (const table of tables) {
      try {
        await this.syncTable(table);
      } catch (error) {
        if (isNetworkLikeError(error)) {
          // Avoid noisy console errors for transient network failures.
          console.warn(`Sync skipped for ${table} (network unavailable).`);
          continue;
        }
        console.error(`Failed to sync table ${table}:`, error);
      }
    }
  }

  /**
   * Sync a specific table
   */
  async syncTable(tableName: string) {
    try {
      // Fast exits: no background sync for anonymous/offline sessions.
      const isAuthenticated = blink.auth.isAuthenticated?.() ?? false;
      if (!isAuthenticated || !isOnline()) return;

      const lastSync = this.lastSyncTime.get(tableName);
      
      // Get unprocessed sync events
      const events = await blink.db.syncEvents.list({
        where: {
          tableName,
          processed: "0",
          ...(lastSync ? { createdAt: lastSync } : {})
        },
        orderBy: { createdAt: 'asc' },
        limit: 100
      });

      if (events.length === 0) return;

      // Process events
      for (const event of events) {
        await this.processEvent(event);
      }

      // Update last sync time
      if (events.length > 0) {
        this.lastSyncTime.set(tableName, events[events.length - 1].createdAt);
      }
    } catch (error) {
      if (isNetworkLikeError(error)) {
        // Let caller decide whether to retry; don't spam errors.
        throw error;
      }
      console.error(`Failed to sync table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Process a sync event
   */
  private async processEvent(event: SyncEvent) {
    try {
      const listeners = this.listeners.get(event.tableName);
      if (listeners) {
        const data = event.data ? JSON.parse(event.data) : null;
        listeners.forEach(callback => {
          try {
            callback({ event: event.eventType, data, recordId: event.recordId });
          } catch (error) {
            console.error('Listener callback error:', error);
          }
        });
      }

      // Mark event as processed
      await blink.db.syncEvents.update(event.id, { processed: 1 });
    } catch (error) {
      console.error('Failed to process event:', error);
      throw error;
    }
  }

  /**
   * Create a sync event
   */
  async createSyncEvent(
    tableName: string,
    recordId: string,
    eventType: 'create' | 'update' | 'delete',
    data?: any
  ) {
    try {
      const user = await blink.auth.me();
      
      await blink.db.syncEvents.create({
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        tableName,
        recordId,
        operation: eventType,
        data: data ? JSON.stringify(data) : null,
        userId: user?.id,
        processed: 0,
        createdAt: new Date().toISOString()
      });

      // Trigger immediate sync if auto-sync is enabled
      if (this.autoSync) {
        setTimeout(() => {
          void this.safeSyncAll();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to create sync event:', error);
      throw error;
    }
  }

  /**
   * Subscribe to table changes
   */
  subscribe(tableName: string, callback: (data: any) => void) {
    if (!this.listeners.has(tableName)) {
      this.listeners.set(tableName, new Set());
    }
    this.listeners.get(tableName)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(tableName);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Unsubscribe from table changes
   */
  unsubscribe(tableName: string, callback?: (data: any) => void) {
    if (!callback) {
      this.listeners.delete(tableName);
      return;
    }

    const listeners = this.listeners.get(tableName);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Force sync a specific table now
   */
  async forceSyncTable(tableName: string) {
    await this.syncTable(tableName);
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isInitialized: this.isInitialized,
      autoSync: this.autoSync,
      syncInterval: this.syncInterval,
      activeTables: Array.from(this.listeners.keys()),
      lastSyncTimes: Object.fromEntries(this.lastSyncTime)
    };
  }

  /**
   * Update sync settings
   */
  async updateSettings(settings: { autoSync?: boolean; syncInterval?: number }) {
    if (settings.autoSync !== undefined) {
      this.autoSync = settings.autoSync;
      
      if (this.autoSync) {
        this.startAutoSync();
      } else {
        this.stopAutoSync();
      }

      // Update in database
      try {
        const existing = await blink.db.systemSettings.list({
          where: { settingKey: 'enable_realtime_sync' }
        });
        
        if (existing.length > 0) {
          await blink.db.systemSettings.update(existing[0].id, {
            settingValue: settings.autoSync.toString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Failed to update autoSync setting:', error);
      }
    }

    if (settings.syncInterval !== undefined) {
      this.syncInterval = settings.syncInterval;
      
      // Restart auto-sync with new interval
      if (this.autoSync) {
        this.stopAutoSync();
        this.startAutoSync();
      }

      // Update in database
      try {
        const existing = await blink.db.systemSettings.list({
          where: { settingKey: 'sync_interval' }
        });
        
        if (existing.length > 0) {
          await blink.db.systemSettings.update(existing[0].id, {
            settingValue: settings.syncInterval.toString(),
            updatedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Failed to update syncInterval setting:', error);
      }
    }
  }

  /**
   * Clean up old sync events
   */
  async cleanupOldEvents(daysToKeep: number = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      await blink.db.sql(`
        DELETE FROM sync_events 
        WHERE processed = 1 
        AND created_at < ?
      `, [cutoffDate.toISOString()]);
    } catch (error) {
      console.error('Failed to cleanup old events:', error);
    }
  }

  /**
   * Shutdown the sync service
   */
  shutdown() {
    this.stopAutoSync();
    this.listeners.clear();
    this.lastSyncTime.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const syncService = new SyncService();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  syncService.initialize();
}
