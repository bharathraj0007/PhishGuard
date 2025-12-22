# Expected Test Results Reference

This document shows what successful test results should look like for each scan type.

---

## 1. URL Scanning Results

### Test 1.1: Safe URL (https://www.google.com)

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": false,
    "confidenceScore": 95,
    "threatLevel": "safe",
    "indicators": [
      "legitimate domain (google.com)",
      "HTTPS protocol (secure)",
      "known company (Google)",
      "legitimate TLD (.com)",
      "no suspicious patterns"
    ],
    "analysis": "This URL appears to be safe. Google.com is a legitimate, well-known domain. The HTTPS protocol indicates a secure connection. No phishing indicators detected.",
    "recommendations": [
      "Safe to visit",
      "This is a legitimate website"
    ],
    "scanType": "url",
    "mlModel": "character-cnn-url-model"
  },
  "timestamp": "2025-12-21T14:30:00Z"
}
```

**UI Display:**
```
Threat Level: SAFE (green badge)
Confidence: 95%
Indicators:
  ✓ legitimate domain (google.com)
  ✓ HTTPS protocol (secure)
  ✓ known company (Google)
Recommendations:
  • Safe to visit
  • This is a legitimate website
```

---

### Test 1.2: Suspicious URL (http://suspicious-paypa1-verify.com)

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 78,
    "threatLevel": "suspicious",
    "indicators": [
      "domain typosquatting (paypa1 vs paypal)",
      "HTTP protocol (insecure)",
      "suspicious keywords (verify, confirm)",
      "unfamiliar domain",
      "phishing pattern match"
    ],
    "analysis": "This URL shows suspicious characteristics. The domain 'paypa1' appears to be a typosquat of 'PayPal', commonly used in phishing attacks. The HTTP protocol is insecure, and the path includes verification-related terms typical of phishing pages.",
    "recommendations": [
      "Do not click this link",
      "Verify the sender before accessing",
      "Check for official PayPal URL instead"
    ],
    "scanType": "url",
    "mlModel": "character-cnn-url-model"
  },
  "timestamp": "2025-12-21T14:31:00Z"
}
```

**UI Display:**
```
Threat Level: SUSPICIOUS (yellow badge)
Confidence: 78%
Indicators:
  ⚠ domain typosquatting (paypa1 vs paypal)
  ⚠ HTTP protocol (insecure)
  ⚠ suspicious keywords (verify, confirm)
Recommendations:
  • Do not click this link
  • Verify the sender before accessing
```

---

### Test 1.3: Dangerous URL (http://malware-kit.tk/exe)

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 96,
    "threatLevel": "dangerous",
    "indicators": [
      "malware keywords (malware, kit, exe)",
      "suspicious TLD (.tk - high-risk)",
      "executable download path (/exe)",
      "HTTP protocol (insecure)",
      "high-risk domain pattern",
      "known malware signature match"
    ],
    "analysis": "CRITICAL THREAT: This URL shows severe malicious indicators. The domain contains malware keywords, uses a high-risk TLD (.tk), and includes an executable download path. This is likely distributing malicious software. DO NOT VISIT.",
    "recommendations": [
      "Do NOT visit this URL",
      "Do NOT download any files",
      "Block this domain in your firewall",
      "Report to security team"
    ],
    "scanType": "url",
    "mlModel": "character-cnn-url-model"
  },
  "timestamp": "2025-12-21T14:32:00Z"
}
```

**UI Display:**
```
Threat Level: DANGEROUS (red badge with alert icon)
Confidence: 96%
Indicators:
  🚫 malware keywords (malware, kit, exe)
  🚫 suspicious TLD (.tk - high-risk)
  🚫 executable download path (/exe)
Recommendations:
  • Do NOT visit this URL
  • Block this domain immediately
  • Report to security team
```

---

## 2. Email Scanning Results

### Test 2.1: Legitimate Email

**Input:**
```
Subject: Meeting Tomorrow
From: john@company.com
Body: Hi, let's schedule a meeting tomorrow at 2 PM. Please confirm your availability.
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": false,
    "confidenceScore": 92,
    "threatLevel": "safe",
    "indicators": [
      "professional tone",
      "known company domain (@company.com)",
      "legitimate business request",
      "no urgency or threats",
      "clear sender identity",
      "no suspicious links or attachments"
    ],
    "analysis": "This email appears legitimate. It comes from a known company domain, uses professional language, and contains a straightforward business request. No phishing characteristics detected.",
    "recommendations": [
      "Safe to respond",
      "Email appears genuine"
    ],
    "scanType": "email",
    "mlModel": "bilstm-email-model"
  },
  "timestamp": "2025-12-21T14:33:00Z"
}
```

**UI Display:**
```
Threat Level: SAFE (green)
Confidence: 92%
Status: ✅ Legitimate email
```

---

### Test 2.2: Phishing Email

**Input:**
```
Subject: URGENT: Verify Your Account Immediately!
Body: Your account has been compromised. Click here to reset your password.
IMPORTANT: https://paypa1-verify.com/login/update-info
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 94,
    "threatLevel": "dangerous",
    "indicators": [
      "urgency language (URGENT, Immediately)",
      "account compromise threat",
      "suspicious click-to-action",
      "typosquatted domain (paypa1)",
      "credential harvesting pattern",
      "phishing signature match",
      "HTML markup inconsistent with official emails"
    ],
    "analysis": "CRITICAL: This is a phishing email. It uses classic phishing tactics including urgency, account compromise threats, and a malicious link to a typosquatted domain. Attackers are attempting to harvest login credentials.",
    "recommendations": [
      "Do NOT click the link",
      "Do NOT enter your credentials",
      "Verify directly with PayPal via their official website",
      "Report email as phishing to your email provider",
      "Delete the email"
    ],
    "scanType": "email",
    "mlModel": "bilstm-email-model"
  },
  "timestamp": "2025-12-21T14:34:00Z"
}
```

**UI Display:**
```
Threat Level: DANGEROUS (red with alert)
Confidence: 94%
Status: 🚫 PHISHING DETECTED

Indicators:
  ⚠ urgency language (URGENT, Immediately)
  ⚠ account compromise threat
  ⚠ typosquatted domain (paypa1)

Recommendations:
  ❌ Do NOT click the link
  ❌ Do NOT enter credentials
  ✓ Report as phishing
  ✓ Delete immediately
```

---

### Test 2.3: Suspicious Email

**Input:**
```
Subject: Congratulations! You've won a prize!
Body: Click here to claim your free gift card worth $500.
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 71,
    "threatLevel": "suspicious",
    "indicators": [
      "unrealistic offer (free $500)",
      "urgency/excitement language",
      "call-to-action link",
      "prize/reward scam pattern",
      "vague sender information",
      "suspicious formatting"
    ],
    "analysis": "This email shows suspicious characteristics typical of spam/scam emails. The unrealistic offer of a free $500 prize, combined with urgency language and a call-to-action link, matches spam and social engineering patterns.",
    "recommendations": [
      "Be skeptical of unsolicited prizes",
      "Do not click the link",
      "Verify legitimacy before engaging",
      "Mark as spam"
    ],
    "scanType": "email",
    "mlModel": "bilstm-email-model"
  },
  "timestamp": "2025-12-21T14:35:00Z"
}
```

**UI Display:**
```
Threat Level: SUSPICIOUS (yellow)
Confidence: 71%
Status: ⚠ Suspicious email detected

Indicators:
  • unrealistic offer (free $500)
  • urgency language
  • call-to-action link
  
Recommendations:
  • Be skeptical of unsolicited prizes
  • Do not click links
  • Mark as spam
```

---

## 3. SMS Scanning Results

### Test 3.1: Legitimate SMS

**Input:**
```
Hi John, your parcel will arrive tomorrow between 2-4 PM. Track: example.com/track/abc123
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": false,
    "confidenceScore": 88,
    "threatLevel": "safe",
    "indicators": [
      "legitimate delivery notification",
      "known tracking service",
      "realistic message format",
      "no urgency or threats",
      "no suspicious requests"
    ],
    "analysis": "This SMS appears to be a legitimate parcel delivery notification. It contains a tracking reference and realistic delivery timeframe. No phishing indicators detected.",
    "recommendations": [
      "Safe to use",
      "Track your parcel as needed"
    ],
    "scanType": "sms",
    "mlModel": "cnn-sms-model"
  },
  "timestamp": "2025-12-21T14:36:00Z"
}
```

**UI Display:**
```
Threat Level: SAFE (green)
Confidence: 88%
Status: ✅ Legitimate SMS
Recommendation: Safe to use
```

---

### Test 3.2: Phishing SMS

**Input:**
```
⚠️ VERIFY YOUR BANK ACCOUNT! Your account has been locked. Update now: http://bank-verify-secure.com/login
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 91,
    "threatLevel": "dangerous",
    "indicators": [
      "urgency markers (VERIFY, locked)",
      "account compromise threat",
      "action-forcing language (Update now)",
      "suspicious domain (bank-verify-secure.com)",
      "credential harvesting pattern",
      "SMS phishing signature match"
    ],
    "analysis": "CRITICAL: This is an SMS phishing attack. Uses urgency (account locked), account compromise threats, and a malicious link to harvest banking credentials. This is a classic smishing (SMS phishing) attack.",
    "recommendations": [
      "Do NOT click the link",
      "Do NOT enter your credentials",
      "Contact your bank directly using their official number",
      "Report to your SMS provider",
      "Delete the message"
    ],
    "scanType": "sms",
    "mlModel": "cnn-sms-model"
  },
  "timestamp": "2025-12-21T14:37:00Z"
}
```

**UI Display:**
```
Threat Level: DANGEROUS (red with alert)
Confidence: 91%
Status: 🚫 SMISHING DETECTED

Indicators:
  ⚠ account compromise threat
  ⚠ action-forcing language
  ⚠ suspicious domain

Recommendations:
  ❌ Do NOT click the link
  ❌ Do NOT enter credentials
  ✓ Contact your bank directly
  ✓ Report to SMS provider
```

---

### Test 3.3: Suspicious SMS

**Input:**
```
Click here to confirm your delivery: shorturl.co/abc123
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 65,
    "threatLevel": "suspicious",
    "indicators": [
      "shortened URL (suspicious)",
      "vague confirmation request",
      "no clear sender/service",
      "action-forcing language",
      "URL shortener abuse pattern"
    ],
    "analysis": "This SMS shows suspicious characteristics. The use of a shortened URL makes it impossible to determine the destination, and the vague 'confirm delivery' request is a common smishing tactic.",
    "recommendations": [
      "Do not click shortened URLs",
      "Verify delivery through official channels",
      "Check with the service directly",
      "Mark as spam"
    ],
    "scanType": "sms",
    "mlModel": "cnn-sms-model"
  },
  "timestamp": "2025-12-21T14:38:00Z"
}
```

**UI Display:**
```
Threat Level: SUSPICIOUS (yellow)
Confidence: 65%
Indicators:
  • shortened URL (suspicious)
  • vague confirmation request
  
Recommendations:
  • Do not click shortened URLs
  • Verify through official channels
```

---

## 4. QR Code Scanning Results

### Test 4.1: Safe QR Code (https://www.github.com)

**QR Contents:** `https://www.github.com`

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": false,
    "confidenceScore": 96,
    "threatLevel": "safe",
    "indicators": [
      "legitimate domain (github.com)",
      "HTTPS protocol (secure)",
      "known technology company",
      "legitimate TLD (.com)",
      "no phishing patterns"
    ],
    "analysis": "QR code decoded to: https://www.github.com\n\nThis URL is safe. GitHub is a legitimate, well-known platform for code repositories. The HTTPS protocol ensures a secure connection.",
    "recommendations": [
      "Safe to scan",
      "Legitimate QR code"
    ],
    "scanType": "qr",
    "mlModel": "character-cnn-url-model",
    "decodedContent": "https://www.github.com"
  },
  "timestamp": "2025-12-21T14:39:00Z"
}
```

**UI Display:**
```
Threat Level: SAFE (green)
Confidence: 96%

Decoded URL:
https://www.github.com

Status: ✅ QR code is safe
Recommendation: Safe to visit
```

---

### Test 4.2: Suspicious QR Code (http://suspicious-paypa1-verify.com)

**QR Contents:** `http://suspicious-paypa1-verify.com`

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 79,
    "threatLevel": "suspicious",
    "indicators": [
      "domain typosquatting (paypa1)",
      "HTTP protocol (insecure)",
      "suspicious keywords (verify)",
      "QR code phishing pattern",
      "credential harvesting attempt"
    ],
    "analysis": "QR code decoded to: http://suspicious-paypa1-verify.com\n\nThis QR code contains a suspicious URL. The domain 'paypa1' is a typosquat of PayPal, commonly used in phishing attacks. HTTP protocol indicates insecurity.",
    "recommendations": [
      "Do not scan this QR code",
      "Do not visit the destination",
      "Verify QR code source"
    ],
    "scanType": "qr",
    "mlModel": "character-cnn-url-model",
    "decodedContent": "http://suspicious-paypa1-verify.com"
  },
  "timestamp": "2025-12-21T14:40:00Z"
}
```

**UI Display:**
```
Threat Level: SUSPICIOUS (yellow)
Confidence: 79%

Decoded URL:
http://suspicious-paypa1-verify.com

Status: ⚠ Suspicious QR code
Recommendations:
  • Do not scan this QR code
  • Do not visit the destination
```

---

### Test 4.3: Dangerous QR Code (http://malware-c2.ru/download)

**QR Contents:** `http://malware-c2.ru/download`

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "isPhishing": true,
    "confidenceScore": 97,
    "threatLevel": "dangerous",
    "indicators": [
      "malware keywords (malware, download)",
      "command and control domain pattern",
      "suspicious Cyrillic TLD (.ru)",
      "HTTP protocol (insecure)",
      "known malware signature",
      "dangerous domain reputation"
    ],
    "analysis": "CRITICAL: QR code decoded to: http://malware-c2.ru/download\n\nThis QR code contains a CRITICAL threat. The URL matches known malware command-and-control (C2) server patterns and is likely to distribute malicious software. DO NOT SCAN.",
    "recommendations": [
      "Do NOT scan this QR code",
      "Do NOT download anything from this URL",
      "Report QR code to security team",
      "Destroy/delete the QR code image"
    ],
    "scanType": "qr",
    "mlModel": "character-cnn-url-model",
    "decodedContent": "http://malware-c2.ru/download"
  },
  "timestamp": "2025-12-21T14:41:00Z"
}
```

**UI Display:**
```
Threat Level: DANGEROUS (red with alert icon)
Confidence: 97%

Decoded URL:
http://malware-c2.ru/download

Status: 🚫 CRITICAL THREAT

Recommendations:
  ❌ Do NOT scan this QR code
  ❌ Do NOT download anything
  ✓ Report to security team
  ✓ Destroy the image
```

---

## 5. Error Response Examples

### Invalid Input Error

**Request:**
```json
{
  "scanType": "url",
  "content": ""  // Empty content
}
```

**Expected Response:**
```json
{
  "error": "content is required",
  "timestamp": "2025-12-21T14:42:00Z"
}
```

**Status Code:** 400

---

### Rate Limit Exceeded

**After 20+ rapid requests:**

**Expected Response:**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "timestamp": "2025-12-21T14:43:00Z"
}
```

**Status Code:** 429

---

### Invalid Image Data

**Request:**
```json
{
  "scanType": "qr",
  "imageData": "not-valid-base64"
}
```

**Expected Response:**
```json
{
  "error": "imageData must be a valid base64 image",
  "timestamp": "2025-12-21T14:44:00Z"
}
```

**Status Code:** 400

---

## 6. Database Storage Examples

### Authenticated User Scan Record

**Database Entry (phishing_scans table):**
```sql
INSERT INTO phishing_scans VALUES (
  'scan_1703163000000_abc1234',
  'user_xyz789',
  'url',
  'http://suspicious-paypa1-verify.com',
  'suspicious',
  78.5,
  '["domain typosquatting","HTTP protocol","suspicious keywords"]',
  'This URL shows suspicious characteristics...',
  0,
  1,
  '2025-12-21T14:30:00.000Z',
  '2025-12-21T14:30:00.000Z'
);
```

**Dashboard History Display:**
```
Date: Dec 21, 2:30 PM
Type: Link
Content: http://suspicious-paypa1-verify.com
Threat: SUSPICIOUS
Confidence: 78%
Action: [View Details] [Delete]
```

---

### Guest Mode Local Storage

**localStorage Entry:**
```json
{
  "phishguard_guest_scans": [
    {
      "id": "guest_scan_1",
      "scanType": "url",
      "content": "https://www.google.com",
      "timestamp": "2025-12-21T14:30:00Z",
      "result": {
        "threatLevel": "safe",
        "confidence": 95,
        "indicators": ["legitimate domain", "HTTPS", "known company"],
        "analysis": "..."
      }
    },
    {
      "id": "guest_scan_2",
      "scanType": "email",
      "content": "Your account has been compromised...",
      "timestamp": "2025-12-21T14:31:00Z",
      "result": {
        "threatLevel": "dangerous",
        "confidence": 94,
        "indicators": ["phishing", "urgency", "malicious link"],
        "analysis": "..."
      }
    }
  ]
}
```

---

## 7. Network Request/Response Examples

### Successful Scan Request

**URL:** `https://eky2mdxr-6hp0hwbsc5d2.deno.dev`

**Method:** POST

**Headers:**
```
Content-Type: application/json
Access-Control-Allow-Origin: *
```

**Request Body:**
```json
{
  "scanType": "url",
  "content": "https://www.google.com",
  "userId": "user_123",
  "saveToHistory": true
}
```

**Response Status:** 200 OK

**Response Headers:**
```
Content-Type: application/json
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
```

**Response Body:**
```json
{
  "success": true,
  "result": {
    "isPhishing": false,
    "confidenceScore": 95,
    "threatLevel": "safe",
    "indicators": [...],
    "analysis": "...",
    "recommendations": [...],
    "scanType": "url",
    "mlModel": "character-cnn-url-model"
  },
  "timestamp": "2025-12-21T14:30:00Z"
}
```

**Duration:** ~250-400ms

---

## 8. Console Log Examples

### Successful Backend Usage
```
✅ Used backend ML inference
```

### Fallback Activation
```
⚠ Backend ML API failed, falling back to client-side analysis:
Error: NetworkError when attempting to fetch resource.
```

### Database Save Confirmation
```
✅ Scan saved to database: scan_1703163000000_abc1234
```

### Rate Limit Hit
```
⚠ Rate limit exceeded - waiting before retry
```

---

## 9. Performance Benchmarks

**Expected Response Times (from click to result display):**

| Scan Type | Expected Time | Max Acceptable |
|-----------|--------------|-----------------|
| URL       | 250-350ms    | < 500ms         |
| Email     | 350-450ms    | < 600ms         |
| SMS       | 200-300ms    | < 400ms         |
| QR Code   | 500-700ms    | < 1000ms        |

**Example DevTools Timing:**
```
Total (DOMContentLoaded): 234ms
- network request: 150ms
- processing: 50ms
- rendering: 34ms
```

---

## 10. Success Criteria Summary

✅ **All tests pass when:**
1. All threat levels match expected values
2. Confidence scores are in expected ranges (±5%)
3. Indicators identify correct phishing tactics
4. Recommendations are relevant and actionable
5. Response times are within acceptable limits
6. No critical console errors
7. Database stores authenticated user scans
8. Guest mode stores scans in localStorage
9. Fallback mechanism activates gracefully
10. Error handling displays helpful messages

---

## Troubleshooting Expected Results

**If your results don't match:**

1. **Different threat level?**
   - Check ML model version
   - Verify backend is using latest model
   - Check model training accuracy

2. **Different confidence score?**
   - Slight variance (±10%) is normal
   - Major differences indicate model drift
   - Retrain if accuracy decreased

3. **Missing indicators?**
   - Check if indicator detection is implemented
   - Verify indicator logic in backend
   - Review model output parsing

4. **Slow response times?**
   - Check network latency
   - Monitor backend resource usage
   - Consider caching or optimization

5. **Database not saving?**
   - Verify user is authenticated
   - Check database connection
   - Verify table schema
   - Check permissions

