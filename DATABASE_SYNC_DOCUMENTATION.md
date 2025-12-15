# PhishGuard Database Synchronization System

## Overview

The PhishGuard database has been completely recreated with a comprehensive synchronization system that ensures **real-time bidirectional sync between admin and client sides**. This document explains the architecture, implementation, and usage.

---

## 🔄 Synchronization Mechanism

### Core Concept

The synchronization system uses an **event-driven architecture** with the following components:

1. **Sync Events Table** - Tracks all data changes
2. **Sync Service** - Manages real-time synchronization
3. **Event Listeners** - React to database changes
4. **Auto-sync** - Periodic polling (5-second default interval)

### How It Works

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Admin     │         │  Sync Events │         │   Client    │
│   Action    │────────>│    Table     │────────>│   Update    │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              ▼
                        Auto-polling
                        (5 seconds)
```

**Step-by-step:**

1. **Admin creates/updates/deletes** data (e.g., scan, dataset, user)
2. **Sync event created** in `sync_events` table with operation type
3. **Sync service polls** the table every 5 seconds
4. **Unprocessed events** are fetched and broadcast to listeners
5. **Client components** receive updates and refresh UI
6. **Event marked as processed** to avoid re-processing

---

## 📊 New Database Schema

### Core Tables with Sync Support

#### 1. **phishing_scans**
- **New fields:** `is_deleted`, `synced`, `updated_at`
- **Indexes:** `user_id`, `created_at`, `synced`
- **Purpose:** User scan history with soft delete support

#### 2. **training_datasets**
- **New fields:** `is_active`, `synced`
- **Indexes:** `status`, `dataset_type`, `synced`
- **Purpose:** ML training datasets with activation control

#### 3. **training_records**
- **New field:** `synced`
- **Indexes:** `dataset_id`, `synced`
- **Purpose:** Individual training samples

#### 4. **model_versions**
- **New fields:** `model_type`, `synced`
- **Indexes:** `status`, `synced`
- **Purpose:** ML model versions with deployment tracking

#### 5. **model_tests**
- **New field:** `synced`
- **Purpose:** Model test results and metrics

#### 6. **users**
- **New field:** `is_active`
- **Indexes:** `email`, `role`
- **Purpose:** User accounts with role-based access

#### 7. **system_settings** (NEW)
- **Fields:** `setting_key`, `setting_value`, `setting_type`, `description`
- **Purpose:** Configurable system parameters
- **Default settings:**
  - `max_scan_per_day`: 100
  - `enable_realtime_sync`: true
  - `sync_interval`: 5000ms
  - `max_dataset_size`: 10MB

#### 8. **sync_events** (NEW)
- **Fields:** `event_type`, `table_name`, `record_id`, `operation`, `data`, `processed`
- **Indexes:** `processed`, `created_at`
- **Purpose:** Central sync event log

---

## 🔧 Sync Service API

### Initialization

```typescript
import { syncService } from './lib/sync-service';

// Initialize with custom options
await syncService.initialize({
  interval: 5000,        // Sync every 5 seconds
  autoSync: true,        // Enable automatic polling
  tables: ['phishingScans', 'trainingDatasets']
});
```

### Subscribe to Changes

```typescript
// Subscribe to specific table changes
const unsubscribe = syncService.subscribe('phishingScans', (data) => {
  console.log('Event:', data.event); // 'create' | 'update' | 'delete'
  console.log('Data:', data.data);
  console.log('Record ID:', data.recordId);
  
  // Refresh UI component
  refreshScans();
});

// Cleanup on component unmount
return () => unsubscribe();
```

### Create Sync Events

```typescript
// When admin deletes a scan
await syncService.createSyncEvent(
  'phishingScans',    // Table name
  scanId,             // Record ID
  'delete',           // Operation type
  { reason: 'spam' }  // Optional metadata
);

// When admin creates a dataset
await syncService.createSyncEvent(
  'trainingDatasets',
  datasetId,
  'create',
  { name: 'Phishing URLs 2024', recordCount: 1000 }
);
```

### Force Sync

```typescript
// Manually trigger sync for specific table
await syncService.forceSyncTable('phishingScans');

// Sync all tables
await syncService.syncAll();
```

### Configure Settings

```typescript
// Update sync interval
await syncService.updateSettings({
  autoSync: true,
  syncInterval: 3000  // 3 seconds
});

// Check sync status
const status = syncService.getSyncStatus();
console.log(status);
// {
//   isInitialized: true,
//   autoSync: true,
//   syncInterval: 5000,
//   activeTables: ['phishingScans', 'trainingDatasets'],
//   lastSyncTimes: { phishingScans: '2024-01-15T10:30:00Z' }
// }
```

---

## 🎯 Usage Examples

### Admin Side: Delete Scan with Sync

```typescript
import { adminAPI } from './lib/api';

// Delete scan (sync event created automatically)
await adminAPI.deleteScan(scanId);

// Sync event is created internally:
// - Table: 'phishingScans'
// - Operation: 'delete'
// - Record ID: scanId
// - Processed: false
```

### Client Side: React to Deletion

```typescript
import { syncService } from './lib/sync-service';
import { useState, useEffect } from 'react';

function ScanHistory() {
  const [scans, setScans] = useState([]);

  useEffect(() => {
    // Subscribe to scan changes
    const unsubscribe = syncService.subscribe('phishingScans', (event) => {
      if (event.event === 'delete') {
        // Remove deleted scan from UI
        setScans(prev => prev.filter(s => s.id !== event.recordId));
      } else if (event.event === 'create') {
        // Add new scan to UI
        fetchScans();  // Or append event.data
      } else if (event.event === 'update') {
        // Update existing scan
        fetchScans();
      }
    });

    return () => unsubscribe();
  }, []);

  return <div>{/* Render scans */}</div>;
}
```

### Admin Side: Upload Dataset with Sync

```typescript
import { adminAPI } from './lib/api';

const result = await adminAPI.uploadDataset({
  name: 'Phishing URLs 2024',
  description: 'Latest phishing URLs from Kaggle',
  datasetType: 'phishing',
  records: [
    { content: 'http://evil.com', scanType: 'link', isPhishing: true },
    // ... more records
  ]
});

// Sync event created automatically when dataset is ready
```

### Client Side: React to New Dataset

```typescript
import { syncService } from './lib/sync-service';

useEffect(() => {
  const unsubscribe = syncService.subscribe('trainingDatasets', (event) => {
    if (event.event === 'create') {
      toast.success('New training dataset available!');
      refreshDatasets();
    }
  });

  return () => unsubscribe();
}, []);
```

---

## 🔐 Security

### Admin Authentication

All sync operations respect admin authentication:

```typescript
// Admin API calls verify role and token
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// Only users with role='admin' can:
// - Create sync events
// - Delete datasets
// - Modify model versions
```

### Sync Event Isolation

- Each sync event includes `user_id` (who triggered it)
- Clients filter events based on their access level
- Processed events are marked to prevent replay attacks

---

## ⚡ Performance

### Optimization Features

1. **Indexed Tables** - Fast queries on synced flag, created_at
2. **Batch Processing** - Process up to 100 events per sync cycle
3. **Incremental Sync** - Only fetch events since last sync time
4. **Auto Cleanup** - Old processed events deleted after 7 days

### Cleanup Old Events

```typescript
// Manually cleanup old events (older than 7 days)
await syncService.cleanupOldEvents(7);

// Or configure auto-cleanup
setInterval(async () => {
  await syncService.cleanupOldEvents(7);
}, 24 * 60 * 60 * 1000);  // Daily
```

---

## 📱 Client-Side Integration

### React Component Pattern

```typescript
import { syncService } from '@/lib/sync-service';
import { useEffect, useState } from 'react';

export function SyncedComponent() {
  const [data, setData] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle');

  useEffect(() => {
    // Initialize sync service
    syncService.initialize({ autoSync: true });

    // Subscribe to changes
    const unsubscribe = syncService.subscribe('phishingScans', (event) => {
      setSyncStatus('syncing');
      
      // Handle event
      if (event.event === 'delete') {
        setData(prev => prev.filter(item => item.id !== event.recordId));
      }
      
      setSyncStatus('synced');
    });

    return () => {
      unsubscribe();
      syncService.shutdown();
    };
  }, []);

  return (
    <div>
      <span>Sync Status: {syncStatus}</span>
      {/* Render data */}
    </div>
  );
}
```

---

## 🛠️ Troubleshooting

### Sync Not Working

**Problem:** Changes not appearing on client side

**Solutions:**
1. Check sync service is initialized:
   ```typescript
   const status = syncService.getSyncStatus();
   console.log(status.isInitialized);  // Should be true
   ```

2. Verify auto-sync is enabled:
   ```typescript
   await syncService.updateSettings({ autoSync: true });
   ```

3. Check for errors in browser console:
   ```typescript
   // Enable debug logging
   localStorage.setItem('DEBUG_SYNC', 'true');
   ```

### Events Not Processing

**Problem:** Sync events stuck in unprocessed state

**Solutions:**
1. Manually process events:
   ```typescript
   await syncService.forceSyncTable('phishingScans');
   ```

2. Check database connectivity:
   ```typescript
   const events = await blink.db.syncEvents.list({ 
     where: { processed: "0" } 
   });
   console.log('Unprocessed events:', events.length);
   ```

3. Reset sync state:
   ```typescript
   // Mark all old events as processed
   await blink.db.sql(`
     UPDATE sync_events 
     SET processed = 1 
     WHERE created_at < datetime('now', '-1 hour')
   `);
   ```

---

## 📋 Monitoring

### Check Sync Health

```typescript
const status = syncService.getSyncStatus();

console.log({
  initialized: status.isInitialized,
  autoSync: status.autoSync,
  interval: status.syncInterval,
  activeTables: status.activeTables,
  lastSyncTimes: status.lastSyncTimes
});
```

### Count Unprocessed Events

```typescript
const unprocessed = await blink.db.syncEvents.count({
  where: { processed: "0" }
});

console.log(`Pending sync events: ${unprocessed}`);
```

### View Recent Events

```typescript
const recentEvents = await blink.db.syncEvents.list({
  orderBy: { createdAt: 'desc' },
  limit: 20
});

console.table(recentEvents);
```

---

## 🎓 Best Practices

### 1. Always Create Sync Events for Admin Actions

```typescript
// ❌ Bad: Direct database update without sync event
await blink.db.phishingScans.delete(scanId);

// ✅ Good: Use admin API (creates sync event automatically)
await adminAPI.deleteScan(scanId);
```

### 2. Subscribe Early, Unsubscribe on Cleanup

```typescript
// ✅ Good: Subscribe in useEffect
useEffect(() => {
  const unsubscribe = syncService.subscribe('table', handler);
  return () => unsubscribe();  // Cleanup
}, []);

// ❌ Bad: Subscribe without cleanup
syncService.subscribe('table', handler);  // Memory leak!
```

### 3. Handle All Event Types

```typescript
syncService.subscribe('phishingScans', (event) => {
  switch (event.event) {
    case 'create':
      // Handle creation
      break;
    case 'update':
      // Handle update
      break;
    case 'delete':
      // Handle deletion
      break;
  }
});
```

### 4. Use Force Sync Sparingly

```typescript
// ❌ Bad: Force sync on every render
useEffect(() => {
  syncService.forceSyncTable('phishingScans');  // Expensive!
});

// ✅ Good: Rely on auto-sync, force only when needed
const handleRefreshClick = () => {
  syncService.forceSyncTable('phishingScans');
};
```

---

## 🚀 Summary

The PhishGuard synchronization system provides:

✅ **Real-time updates** - Changes appear within 5 seconds  
✅ **Bidirectional sync** - Admin → Client and Client → Admin  
✅ **Event-driven** - Subscribe to specific table changes  
✅ **Automatic polling** - No manual refresh needed  
✅ **Scalable** - Indexed tables, batch processing  
✅ **Secure** - Role-based access, authenticated operations  
✅ **Resilient** - Auto-retry, cleanup, error handling  

The database is now fully synchronized between admin and client sides, ensuring data consistency across the entire PhishGuard application.
