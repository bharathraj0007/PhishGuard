# PhishGuard Backend API Documentation

## Overview

PhishGuard's backend is built using **Blink Edge Functions** (Deno runtime) with three main API endpoints for phishing detection, scan history management, and user analytics.

## Architecture

```
Frontend (React)
    ↓
API Layer (src/lib/api.ts)
    ↓
Edge Functions (Deno)
    ↓
Blink SDK (Database + AI)
```

## Edge Functions

### 1. Analyze Phishing (`/analyze-phishing`)

**URL**: `https://eky2mdxr-0wvahpyjbcjz.deno.dev`

**Method**: `POST`

**Purpose**: Analyzes content (links, emails, SMS, QR codes) for phishing threats using AI

**Request Body**:
```json
{
  "content": "https://suspicious-link.com",
  "scanType": "link",
  "userId": "user_12345",
  "saveToHistory": true
}
```

**Parameters**:
- `content` (string, required): The content to analyze
- `scanType` (string, required): One of: `link`, `email`, `sms`, `qr`
- `userId` (string, optional): User ID for attribution
- `saveToHistory` (boolean, optional): Whether to save scan to database

**Response**:
```json
{
  "success": true,
  "result": {
    "threatLevel": "dangerous",
    "confidence": 92.5,
    "indicators": [
      "Suspicious domain",
      "No HTTPS",
      "Typosquatting detected"
    ],
    "analysis": "This URL exhibits multiple phishing indicators...",
    "recommendations": [
      "Do not click the link",
      "Verify sender authenticity",
      "Report to security team"
    ]
  },
  "timestamp": "2025-12-07T16:00:00.000Z"
}
```

**Threat Levels**:
- `safe`: No phishing indicators detected
- `suspicious`: Some concerning patterns found
- `dangerous`: High confidence phishing attempt

**AI Analysis**: Uses Blink AI SDK with custom prompts for each scan type to detect:
- URL obfuscation, typosquatting, suspicious domains
- Email spoofing, urgent language, credential harvesting
- SMS scams, fake delivery notifications
- QR code fraud, malicious redirects

---

### 2. Scan History (`/scan-history`)

**URL**: `https://eky2mdxr-vyqfj0cnccac.deno.dev`

**Methods**: `GET`, `DELETE`, `POST`

**Purpose**: Manage user scan history with CRUD operations

#### GET - Retrieve Scan History

**Query Parameters**:
- `userId` (string, required): User identifier
- `limit` (number, optional): Max results (default: 20)
- `offset` (number, optional): Pagination offset (default: 0)
- `scanType` (string, optional): Filter by type (`link`, `email`, `sms`, `qr`)

**Response**:
```json
{
  "success": true,
  "scans": [
    {
      "id": "scan_1733587200_abc123",
      "userId": "user_12345",
      "scanType": "email",
      "content": "Dear customer, your account...",
      "threatLevel": "dangerous",
      "confidence": 95.0,
      "indicators": ["Spoofed sender", "Urgent language"],
      "analysis": "Email contains multiple phishing indicators...",
      "createdAt": "2025-12-07T16:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

#### DELETE - Delete Single Scan

**Query Parameters**:
- `scanId` (string, required): ID of scan to delete
- `userId` (string, required): User ID for authorization

**Response**:
```json
{
  "success": true,
  "message": "Scan deleted successfully"
}
```

**Authorization**: Only the scan owner can delete their scans (verified via `userId` match)

#### POST - Bulk Delete Operations

**Request Body**:
```json
{
  "userId": "user_12345",
  "action": "deleteAll"
}
```

**Actions**:
- `deleteAll`: Delete all scans for the user
- `deleteMultiple`: Delete specific scans (requires `scanIds` array)

**Example - Delete Multiple**:
```json
{
  "userId": "user_12345",
  "action": "deleteMultiple",
  "scanIds": ["scan_1", "scan_2", "scan_3"]
}
```

**Response**:
```json
{
  "success": true,
  "message": "All scans deleted successfully"
}
```

---

### 3. User Analytics (`/user-analytics`)

**URL**: `https://eky2mdxr-nhn8p6v6prbh.deno.dev`

**Method**: `GET`

**Purpose**: Retrieve comprehensive analytics and statistics for a user

**Query Parameters**:
- `userId` (string, required): User identifier

**Response**:
```json
{
  "success": true,
  "analytics": {
    "totalScans": 150,
    "averageConfidence": 87.3,
    "threatCounts": {
      "safe": 80,
      "suspicious": 45,
      "dangerous": 25
    },
    "threatDistribution": {
      "safe": 53,
      "suspicious": 30,
      "dangerous": 17
    },
    "scanTypeCounts": {
      "link": 60,
      "email": 50,
      "sms": 25,
      "qr": 15
    },
    "recentScans": [
      {
        "id": "scan_xyz",
        "scanType": "email",
        "threatLevel": "dangerous",
        "confidence": 95,
        "createdAt": "2025-12-07T16:00:00.000Z"
      }
    ],
    "trendData": [
      { "date": "2025-12-01", "count": 8 },
      { "date": "2025-12-02", "count": 12 }
    ],
    "lastScanDate": "2025-12-07T16:00:00.000Z"
  }
}
```

**Metrics Provided**:
- **Total Scans**: Lifetime scan count
- **Average Confidence**: Mean AI confidence score across all scans
- **Threat Counts**: Number of scans per threat level
- **Threat Distribution**: Percentage breakdown of threat levels
- **Scan Type Counts**: Number of scans per content type
- **Recent Scans**: Last 5 scan results
- **Trend Data**: Daily scan counts for last 30 days
- **Last Scan Date**: Most recent scan timestamp

---

## Frontend Integration

### API Client (`src/lib/api.ts`)

The frontend uses a centralized API client with TypeScript interfaces:

```typescript
import { analyzePhishing, getScanHistory, getUserAnalytics } from '../lib/api'

// Analyze content
const result = await analyzePhishing({
  content: "https://suspicious.com",
  scanType: "link",
  userId: user.id,
  saveToHistory: true
})

// Get scan history
const history = await getScanHistory(userId, {
  limit: 20,
  offset: 0,
  scanType: "email"
})

// Get analytics
const analytics = await getUserAnalytics(userId)
```

### Components Using Backend

1. **Scanner** (`src/components/Scanner.tsx`)
   - Calls `analyzePhishing()` for threat detection
   - Automatically saves to history if user is authenticated

2. **History** (`src/components/History.tsx`)
   - Calls `getScanHistory()` to display past scans
   - Pagination support

3. **AnalyticsDashboard** (`src/components/AnalyticsDashboard.tsx`)
   - Calls `getUserAnalytics()` for statistics
   - Real-time metrics and charts

---

## Database Schema

**Table**: `phishing_scans`

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (PK) | Unique scan identifier |
| `user_id` | TEXT | User who performed scan |
| `scan_type` | TEXT | Type: link, email, sms, qr |
| `content` | TEXT | Analyzed content (truncated) |
| `threat_level` | TEXT | safe, suspicious, dangerous |
| `confidence` | REAL | AI confidence score (0-100) |
| `indicators` | TEXT | JSON array of threat indicators |
| `analysis` | TEXT | Detailed AI analysis |
| `created_at` | TEXT | ISO timestamp |

**Indexes**: `user_id`, `created_at`

---

## Security Features

### CORS
- All endpoints include proper CORS headers
- Supports preflight OPTIONS requests
- Allows requests from any origin (public API)

### Authentication
- User ID-based authorization for scan history
- Only scan owners can delete their scans
- Analytics restricted to user's own data

### Rate Limiting
- Implemented via edge function runtime
- Default Deno limits apply

### Data Privacy
- Scans are user-isolated (filtered by `user_id`)
- Content is truncated in storage (500 char limit)
- No cross-user data leakage

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes**:
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `403` - Forbidden (unauthorized access)
- `404` - Not found
- `405` - Method not allowed
- `500` - Internal server error

**Common Errors**:
- Missing required parameters
- Invalid scan type
- Unauthorized deletion attempt
- AI analysis failure
- Database connection error

---

## Deployment

**Platform**: Blink Edge Functions (Deno runtime)

**Environment Variables**: None required (project ID is hardcoded)

**Deployment Command**:
```bash
blink_deploy_function --function-name analyze-phishing
blink_deploy_function --function-name scan-history
blink_deploy_function --function-name user-analytics
```

**URLs are automatically generated** by Blink and should be extracted from deployment response.

---

## Performance

- **Average Response Time**: 2-5 seconds (AI analysis)
- **Database Queries**: Optimized with filters and indexes
- **Concurrent Requests**: Handled by Deno runtime
- **Caching**: Not implemented (real-time analysis)

---

## Future Enhancements

1. **Rate Limiting**: Per-user API throttling
2. **Webhooks**: Real-time notifications for dangerous threats
3. **Batch Analysis**: Analyze multiple items in one request
4. **Export**: CSV/PDF report generation
5. **API Keys**: Optional authentication for external integrations
6. **Caching**: Cache analysis results for identical content
7. **ML Training**: Improve AI models with user feedback
8. **Real-time Scanning**: WebSocket support for live analysis

---

## Testing

### Manual Testing

```bash
# Test analyze-phishing
curl -X POST https://eky2mdxr-0wvahpyjbcjz.deno.dev \
  -H "Content-Type: application/json" \
  -d '{
    "content": "https://google.com",
    "scanType": "link",
    "saveToHistory": false
  }'

# Test scan-history
curl "https://eky2mdxr-vyqfj0cnccac.deno.dev?userId=test_user&limit=5"

# Test user-analytics
curl "https://eky2mdxr-nhn8p6v6prbh.deno.dev?userId=test_user"
```

### Integration Testing

Frontend components automatically test backend integration:
1. Navigate to Dashboard → Scanner
2. Perform a scan (tests analyze-phishing)
3. View History tab (tests scan-history GET)
4. View Analytics tab (tests user-analytics)

---

## Support

For backend issues:
1. Check function logs: `blink_function_logs`
2. Verify CORS headers in browser console
3. Test endpoints with curl
4. Review error messages in frontend console

For questions or issues, contact the PhishGuard development team.
