# PhishGuard Backend - Quick Start Guide

## 🎯 Overview

PhishGuard has a complete serverless backend built with **Blink Edge Functions**. No server setup required!

---

## 🚀 Live App

**URL**: https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new

---

## 🔌 API Endpoints

### 1. Analyze Phishing
**URL**: `https://eky2mdxr-0wvahpyjbcjz.deno.dev`
**Method**: POST
**Purpose**: Detect phishing threats using AI

```bash
curl -X POST https://eky2mdxr-0wvahpyjbcjz.deno.dev \
  -H "Content-Type: application/json" \
  -d '{
    "content": "https://suspicious-site.com",
    "scanType": "link",
    "userId": "optional_user_id",
    "saveToHistory": true
  }'
```

**Scan Types**: `link`, `email`, `sms`, `qr`

---

### 2. Scan History
**URL**: `https://eky2mdxr-vyqfj0cnccac.deno.dev`
**Methods**: GET, DELETE, POST

**Get History**:
```bash
curl "https://eky2mdxr-vyqfj0cnccac.deno.dev?userId=user123&limit=20"
```

**Delete Scan**:
```bash
curl -X DELETE "https://eky2mdxr-vyqfj0cnccac.deno.dev?scanId=scan_xyz&userId=user123"
```

**Delete All**:
```bash
curl -X POST https://eky2mdxr-vyqfj0cnccac.deno.dev \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","action":"deleteAll"}'
```

---

### 3. User Analytics
**URL**: `https://eky2mdxr-nhn8p6v6prbh.deno.dev`
**Method**: GET

```bash
curl "https://eky2mdxr-nhn8p6v6prbh.deno.dev?userId=user123"
```

**Returns**: Total scans, threat distribution, scan type breakdown, trends

---

## 📁 File Structure

```
src/
├── lib/
│   ├── api.ts              # API client (USE THIS in frontend)
│   ├── blink.ts            # Blink SDK initialization
│   └── phishing-detector.ts # Legacy (not used anymore)
├── components/
│   ├── Scanner.tsx         # Uses backend API
│   ├── History.tsx         # Uses backend API
│   └── AnalyticsDashboard.tsx # NEW - Uses backend API
└── pages/
    └── DashboardPage.tsx   # Includes Analytics tab

functions/
├── analyze-phishing/
│   └── index.ts            # AI threat detection
├── scan-history/
│   └── index.ts            # CRUD operations
└── user-analytics/
    └── index.ts            # Statistics & metrics
```

---

## 💻 Frontend Usage

### Import API Client
```typescript
import { analyzePhishing, getScanHistory, getUserAnalytics } from '../lib/api'
```

### Analyze Content
```typescript
const result = await analyzePhishing({
  content: "https://suspicious.com",
  scanType: "link",
  userId: user.id,
  saveToHistory: true
})

console.log(result.result.threatLevel) // safe, suspicious, or dangerous
console.log(result.result.confidence)  // 0-100
console.log(result.result.indicators)  // Array of threats found
```

### Get Scan History
```typescript
const history = await getScanHistory(userId, {
  limit: 20,
  offset: 0,
  scanType: "email" // optional filter
})

console.log(history.scans)              // Array of past scans
console.log(history.pagination.total)    // Total count
```

### Get Analytics
```typescript
const analytics = await getUserAnalytics(userId)

console.log(analytics.analytics.totalScans)
console.log(analytics.analytics.threatCounts)
console.log(analytics.analytics.scanTypeCounts)
console.log(analytics.analytics.trendData)
```

---

## 🔧 Development

### Deploy Edge Functions
```bash
# Deploy all functions
blink_deploy_function --function-name analyze-phishing
blink_deploy_function --function-name scan-history
blink_deploy_function --function-name user-analytics
```

### View Logs
```bash
blink_function_logs --function-name=analyze-phishing --limit=10
blink_function_logs --function-name=scan-history --limit=10
blink_function_logs --function-name=user-analytics --limit=10
```

### Run Frontend
```bash
npm run dev
```

---

## 📊 Database

**Table**: `phishing_scans`

```sql
CREATE TABLE phishing_scans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  content TEXT NOT NULL,
  threat_level TEXT NOT NULL,
  confidence REAL NOT NULL,
  indicators TEXT NOT NULL,
  analysis TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

**Note**: Blink SDK auto-converts camelCase ↔ snake_case

---

## 🔐 Security

- ✅ CORS enabled for all endpoints
- ✅ User-scoped data (no cross-user access)
- ✅ Authorization checks on deletions
- ✅ Content truncation (500 char limit)
- ✅ Proper error handling

---

## 📖 Full Documentation

- **API Reference**: See `BACKEND_API.md`
- **Architecture**: See `BACKEND_SUMMARY.md`

---

## ✨ Features

### AI-Powered Detection
- Multi-type analysis (links, emails, SMS, QR codes)
- Custom prompts per scan type
- Confidence scoring (0-100%)
- Threat classification (safe/suspicious/dangerous)
- Detailed recommendations

### Scan Management
- Automatic history saving
- Pagination support
- Filter by scan type
- Bulk delete operations
- Owner verification

### Analytics Dashboard
- Total scans counter
- Threat distribution metrics
- Scan type breakdown
- Recent activity feed
- 30-day trend analysis
- Average confidence gauge

---

## 🧪 Test It Out

1. Visit: https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new
2. Click "Get Started" → Sign up
3. Navigate to Dashboard
4. Try Scanner → Analyze a URL
5. Check History → View saved scans
6. Visit Analytics → See your statistics

---

## 🎉 That's It!

Your backend is **fully deployed and production-ready**. No servers, no config, no hassle! 🚀

For questions or issues, refer to:
- `BACKEND_API.md` - Complete API documentation
- `BACKEND_SUMMARY.md` - Implementation details
- Edge function logs via `blink_function_logs`
