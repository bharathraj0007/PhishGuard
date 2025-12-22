# End-to-End ML Inference Testing Guide

## Overview

This guide provides comprehensive testing procedures for PhishGuard's ML-based phishing detection system. The system includes:

- **Backend ML API** (`ml-phishing-scan` edge function)
- **Frontend Scanner UI** (Scanner.tsx component)
- **Database Integration** (Scan history storage)
- **Fallback Mechanisms** (Client-side analysis when backend fails)
- **Rate Limiting** (API protection)

---

## Architecture

### Data Flow

```
User Input (URL, Email, SMS, QR)
    ↓
Scanner Component (Frontend)
    ↓
Backend ML API (ml-phishing-scan)
    ↓
ML Model Inference
    ↓
Result + Analysis
    ↓
Display & Save to DB
```

### Key Components

1. **Frontend**: `src/components/Scanner.tsx`
   - User input interface
   - Image upload for QR codes
   - Result display and recommendations

2. **API Client**: `src/lib/api-client.ts`
   - `scanContentML()` - Send scan request to backend
   - `fileToBase64()` - Convert QR images to base64

3. **Backend Function**: `functions/ml-phishing-scan/index.ts`
   - Request validation
   - Rate limiting
   - ML inference (email, SMS, URL, QR)
   - Database storage
   - CORS support

4. **Database**: `phishing_scans` table
   - `id`: Unique scan identifier
   - `userId`: User who performed the scan
   - `scanType`: Type of scan (email/sms/url/qr)
   - `content`: Original input content
   - `threatLevel`: safe/suspicious/dangerous
   - `confidence`: 0-100 confidence score
   - `indicators`: JSON array of threat indicators
   - `analysis`: Detailed analysis text
   - `createdAt`: Timestamp

---

## Testing Checklist

### 1. URL Scanning Tests

#### Test 1.1: Safe URL Detection
**Objective**: Verify safe URLs are correctly identified

```
Input: https://www.google.com
Expected:
- threatLevel: "safe"
- confidence: > 90
- isPhishing: false
- indicators: ["legitimate domain", "HTTPS protocol"]

Steps:
1. Navigate to Dashboard
2. Go to Scanner > Link tab
3. Enter: https://www.google.com
4. Click "Analyze"
5. Verify result shows "Safe" with confidence > 90%
6. Check console logs for "✅ Used backend ML inference"
```

#### Test 1.2: Suspicious URL Detection
**Objective**: Verify suspicious URLs are flagged

```
Input: http://suspicious-paypa1-verify.com/login
Expected:
- threatLevel: "suspicious"
- confidence: 60-80
- isPhishing: true (possibly)
- indicators: ["domain typosquatting", "HTTP protocol", "login path"]

Steps:
1. Enter: http://suspicious-paypa1-verify.com/login
2. Click "Analyze"
3. Verify result shows "Suspicious" with confidence 60-80%
4. Check indicators for domain issues
```

#### Test 1.3: Dangerous URL Detection
**Objective**: Verify malicious URLs are detected

```
Input: http://malware-download-site.tk/exe
Expected:
- threatLevel: "dangerous"
- confidence: > 85
- isPhishing: true
- indicators: ["suspicious domain extension", "malware keywords", "executable download"]

Steps:
1. Enter: http://malware-download-site.tk/exe
2. Click "Analyze"
3. Verify result shows "Dangerous" with high confidence
4. Check recommendations for threat avoidance
```

---

### 2. Email Scanning Tests

#### Test 2.1: Legitimate Email Detection
**Objective**: Verify legitimate emails are not flagged

```
Input: (Sample legitimate email)
Subject: Meeting Tomorrow
From: john@company.com
Body: Hi, let's schedule a meeting tomorrow at 2 PM. Please confirm your availability.

Expected:
- threatLevel: "safe"
- confidence: > 85
- indicators: ["professional tone", "known company domain", "legitimate request"]

Steps:
1. Navigate to Scanner > Email tab
2. Paste the email content
3. Click "Analyze"
4. Verify result shows "Safe"
5. Check analysis for positive indicators
```

#### Test 2.2: Phishing Email Detection (Password Reset)
**Objective**: Verify phishing emails are detected

```
Input: (Sample phishing email)
Subject: URGENT: Verify Your Account Immediately!
Body: Your account has been compromised. Click here to reset your password.
IMPORTANT: https://paypa1-verify.com/login/update-info

Expected:
- threatLevel: "dangerous"
- confidence: > 85
- isPhishing: true
- indicators: ["urgency language", "suspicious domain", "phishing keywords"]

Steps:
1. Paste phishing email content
2. Click "Analyze"
3. Verify result shows "Dangerous"
4. Check indicators identify phishing tactics
```

#### Test 2.3: Suspicious Email Detection
**Objective**: Verify borderline emails are marked suspicious

```
Input: (Sample suspicious email)
Subject: Congratulations! You've won a prize!
Body: Click here to claim your free gift card worth $500.

Expected:
- threatLevel: "suspicious"
- confidence: 60-75
- indicators: ["excessive urgency", "unrealistic offer", "call-to-action link"]

Steps:
1. Paste suspicious email content
2. Click "Analyze"
3. Verify result shows "Suspicious"
4. Review recommendations
```

---

### 3. SMS Scanning Tests

#### Test 3.1: Legitimate SMS Detection
**Objective**: Verify legitimate SMS messages pass through

```
Input: Hi John, your parcel will arrive tomorrow between 2-4 PM. Track: example.com/track/abc123

Expected:
- threatLevel: "safe"
- confidence: > 85
- indicators: ["legitimate notification", "tracking reference"]

Steps:
1. Navigate to Scanner > SMS tab
2. Enter SMS content
3. Click "Analyze"
4. Verify result shows "Safe"
```

#### Test 3.2: Phishing SMS Detection
**Objective**: Verify phishing SMS are caught

```
Input: ⚠️ VERIFY YOUR BANK ACCOUNT! Your account has been locked. Update now: http://bank-verify-secure.com/login

Expected:
- threatLevel: "dangerous"
- confidence: > 85
- isPhishing: true
- indicators: ["urgency markers", "account verification", "suspicious domain"]

Steps:
1. Enter phishing SMS
2. Click "Analyze"
3. Verify result shows "Dangerous"
4. Check indicators identify SMS tactics
```

#### Test 3.3: Suspicious SMS Detection
**Objective**: Verify borderline SMS are marked suspicious

```
Input: Click here to confirm your delivery: shorturl.co/abc123

Expected:
- threatLevel: "suspicious"
- confidence: 65-75
- indicators: ["shortened URL", "vague confirmation request"]

Steps:
1. Enter SMS content
2. Click "Analyze"
3. Verify result shows "Suspicious"
```

---

### 4. QR Code Scanning Tests

#### Test 4.1: Safe QR Code Detection
**Objective**: Verify safe QR codes (HTTPS legitimate URL)

```
QR Code Content: https://www.github.com

Steps:
1. Generate a QR code containing: https://www.github.com
2. Navigate to Scanner > QR tab
3. Click "Upload QR Code Image"
4. Select the QR image
5. Click "Analyze"
6. Verify:
   - Result shows "Safe"
   - Decoded URL is displayed
   - Confidence > 90%
```

**Generate QR codes online:**
- https://www.qr-code-generator.com/
- https://www.qrcode-monkey.com/

#### Test 4.2: Suspicious QR Code Detection
**Objective**: Verify suspicious QR codes are flagged

```
QR Code Content: http://suspicious-domain-typo.com/login

Steps:
1. Generate QR with: http://suspicious-domain-typo.com/login
2. Upload QR image
3. Click "Analyze"
4. Verify:
   - Result shows "Suspicious"
   - Decoded URL matches input
   - Confidence 60-80%
   - Indicators mention domain issues
```

#### Test 4.3: Malicious QR Code Detection
**Objective**: Verify malicious QR codes are caught

```
QR Code Content: http://malware-c2.ru/download

Steps:
1. Generate QR with: http://malware-c2.ru/download
2. Upload QR image
3. Click "Analyze"
4. Verify:
   - Result shows "Dangerous"
   - Threat level matches backend analysis
   - High confidence score
```

#### Test 4.4: QR Decode Fallback
**Objective**: Test fallback when backend fails

```
Steps:
1. Temporarily disable backend (close ml-phishing-scan function)
2. Upload a QR image
3. Click "Analyze"
4. Verify:
   - Backend error is caught
   - Fallback to client-side analysis
   - Console shows "Backend QR API failed, falling back to client-side"
   - Result is still displayed (from client-side)
   - No white screen/error
```

---

### 5. Database Integration Tests

#### Test 5.1: Authenticated User Scan History
**Objective**: Verify scans are saved for logged-in users

```
Steps:
1. Log in to application
2. Perform a URL scan
3. Open another tab
4. Go to Dashboard > History tab
5. Verify:
   - Scan appears in history
   - Content matches what was scanned
   - Timestamp is correct
   - Threat level is saved
   - Confidence score is displayed
```

**Check Database:**
```sql
SELECT * FROM phishing_scans WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 5;
```

#### Test 5.2: Guest Mode (No Authentication)
**Objective**: Verify guest scans work without login

```
Steps:
1. Log out (or use incognito window)
2. Perform URL scan
3. Perform Email scan
4. Open Browser DevTools > Application > LocalStorage
5. Verify:
   - `phishguard_guest_scans` key exists
   - Contains JSON array with scans
   - All scan details are preserved
   - Scans persist on page reload
```

---

### 6. Error Handling & Validation Tests

#### Test 6.1: Empty Input Validation
**Objective**: Verify empty inputs are rejected

```
Steps:
1. Leave URL field empty
2. Click "Analyze"
3. Verify: Toast error "Please enter content to scan"

Repeat for Email, SMS tabs
```

#### Test 6.2: Invalid Input Size
**Objective**: Verify oversized inputs are rejected

```
Steps:
1. Generate text > 50,000 characters
2. Paste in Email tab
3. Click "Analyze"
4. Verify: Backend returns error about content size
5. Check console for error handling
```

#### Test 6.3: Invalid QR Image Format
**Objective**: Verify non-image uploads are rejected

```
Steps:
1. Try uploading a text file (.txt) as QR image
2. Verify: File input rejects it (browser validation)
3. Try uploading a very large image (>10MB)
4. Verify: Error message about file size

Alternative (manual backend test):
POST to https://eky2mdxr-6hp0hwbsc5d2.deno.dev
{
  "scanType": "qr",
  "imageData": "invalid-base64"
}
Expected: 400 error "imageData must be a valid base64 image"
```

---

### 7. Rate Limiting Tests

#### Test 7.1: Rate Limit Enforcement
**Objective**: Verify rate limiting protects the API

```
Steps:
1. Open Browser Console
2. Run rapid scans in quick succession (10+ in 10 seconds)
3. Verify: After threshold, API returns 429 "Rate limit exceeded"
4. Wait 1 minute
5. Verify: API accepts requests again

Manual testing (using curl):
for i in {1..20}; do
  curl -X POST https://eky2mdxr-6hp0hwbsc5d2.deno.dev \
    -H "Content-Type: application/json" \
    -d '{"scanType":"url","content":"https://example.com"}'
done

Expected: After N requests, get 429 response
```

---

### 8. Fallback Mechanism Tests

#### Test 8.1: Backend Failure Graceful Fallback
**Objective**: Verify system gracefully handles backend failure

```
Steps:
1. Simulate backend down:
   - In Browser DevTools > Network tab, disable network
   - OR in API client, change endpoint to wrong URL
   
2. Perform a URL scan
3. Verify:
   - Console shows "Backend ML API failed, falling back..."
   - Scan still completes with client-side result
   - User sees result (no white screen)
   - Toast shows success (scan completed)
```

---

### 9. CORS & Security Tests

#### Test 9.1: CORS Preflight
**Objective**: Verify CORS headers are correct

```
Steps:
1. Open Browser DevTools > Network tab
2. Perform a scan
3. Find the scan request to ml-phishing-scan
4. Verify response headers include:
   - Access-Control-Allow-Origin: *
   - Access-Control-Allow-Methods: POST, OPTIONS
   - Access-Control-Allow-Headers: authorization, content-type
```

---

## Manual API Testing (Postman/Curl)

### Test Safe URL
```bash
curl -X POST https://eky2mdxr-6hp0hwbsc5d2.deno.dev \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "url",
    "content": "https://www.google.com",
    "userId": "test-user-123"
  }'
```

### Test Phishing Email
```bash
curl -X POST https://eky2mdxr-6hp0hwbsc5d2.deno.dev \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "email",
    "content": "Your account has been compromised. Click here to reset password: http://paypa1-verify.com",
    "userId": "test-user-123"
  }'
```

### Test SMS
```bash
curl -X POST https://eky2mdxr-6hp0hwbsc5d2.deno.dev \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "sms",
    "content": "Click to verify your account: http://bank-secure.com/login",
    "userId": "test-user-123"
  }'
```

### Test QR (with base64 image data)
```bash
# First, encode an image to base64
base64 -i qr-code.png > qr-base64.txt

# Then use in request
curl -X POST https://eky2mdxr-6hp0hwbsc5d2.deno.dev \
  -H "Content-Type: application/json" \
  -d '{
    "scanType": "qr",
    "imageData": "data:image/png;base64,iVBORw0KGgo...",
    "userId": "test-user-123"
  }'
```

---

## Performance & Load Testing

### Test 10.1: Response Time
**Objective**: Verify acceptable response times

```
Expected Response Times:
- URL scan: < 500ms
- Email scan: < 600ms
- SMS scan: < 400ms
- QR scan: < 800ms

Measure:
1. Open DevTools > Performance
2. Perform scan
3. Note request duration
4. Repeat 5 times, calculate average
5. Compare with expected
```

### Test 10.2: Concurrent Requests
**Objective**: Test multiple simultaneous scans

```
Steps:
1. Open 3 browser tabs with Scanner
2. Simultaneously perform different scans in each
3. Verify:
   - All complete successfully
   - No race conditions
   - All results correct
   - Database contains all scans
```

---

## Browser Console Testing

Monitor console during all tests:

```javascript
// Clear logs
console.clear()

// Scan with monitoring
// ✅ Used backend ML inference          (Success)
// ❌ Backend ML API failed, falling back... (Fallback)
// Network errors in Network tab
```

---

## Test Results Summary

Create a test results document:

```markdown
# Test Results - [Date]

## URL Scanning
- [ ] Safe URL Detection: PASS/FAIL
- [ ] Suspicious URL Detection: PASS/FAIL
- [ ] Dangerous URL Detection: PASS/FAIL

## Email Scanning
- [ ] Legitimate Email: PASS/FAIL
- [ ] Phishing Email: PASS/FAIL
- [ ] Suspicious Email: PASS/FAIL

## SMS Scanning
- [ ] Legitimate SMS: PASS/FAIL
- [ ] Phishing SMS: PASS/FAIL
- [ ] Suspicious SMS: PASS/FAIL

## QR Scanning
- [ ] Safe QR Code: PASS/FAIL
- [ ] Suspicious QR Code: PASS/FAIL
- [ ] Malicious QR Code: PASS/FAIL
- [ ] Decode Fallback: PASS/FAIL

## Database Integration
- [ ] Authenticated Scan History: PASS/FAIL
- [ ] Guest Mode Storage: PASS/FAIL

## Error Handling
- [ ] Empty Input Validation: PASS/FAIL
- [ ] Invalid Input Size: PASS/FAIL
- [ ] Invalid QR Format: PASS/FAIL

## Rate Limiting
- [ ] Rate Limit Enforcement: PASS/FAIL

## Fallback Mechanism
- [ ] Backend Failure Graceful: PASS/FAIL

## CORS & Security
- [ ] CORS Preflight: PASS/FAIL

## Performance
- [ ] Response Time (URL): PASS/FAIL
- [ ] Response Time (Email): PASS/FAIL
- [ ] Response Time (SMS): PASS/FAIL
- [ ] Response Time (QR): PASS/FAIL
- [ ] Concurrent Requests: PASS/FAIL

## Overall Status: PASS/FAIL
Notes: [Any issues or observations]
```

---

## Troubleshooting

### Issue: Backend API returns 500 error
**Solution:**
1. Check backend function logs: `blink_function_logs --function-name ml-phishing-scan`
2. Verify environment variables are set
3. Check TensorFlow initialization logs
4. Ensure database connection works

### Issue: QR Code doesn't decode
**Solution:**
1. Ensure image quality is good (high resolution)
2. Check QR code is properly generated
3. Try different QR code generator
4. Check console for decode errors
5. Verify fallback is working

### Issue: Scans not saving to database
**Solution:**
1. Verify user is authenticated
2. Check database connection
3. Verify phishing_scans table exists
4. Check user_id is correct
5. Review database error logs

### Issue: Rate limiting blocks legitimate requests
**Solution:**
1. Wait 1 minute for rate limit to reset
2. Adjust rate limit threshold in backend (if needed)
3. Check IP address in headers
4. Verify request is coming from expected source

---

## Continuous Testing

For ongoing quality assurance:

1. **Nightly Tests**: Run full test suite daily
2. **Sample Data**: Create library of known phishing/safe URLs
3. **Regression Tests**: Add new tests for bugs found
4. **Performance Monitoring**: Track response times over time
5. **User Testing**: Beta test with real users, collect feedback

---

## Next Steps

After passing all tests:

1. ✅ Update project version
2. ✅ Document any findings
3. ✅ Deploy to production
4. ✅ Monitor error rates in production
5. ✅ Gather user feedback
6. ✅ Plan improvements for next version
