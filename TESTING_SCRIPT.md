# Quick Testing Script - Run These Tests in Order

## Prerequisites
- Application running on `https://3000-igu9ih6j9chjtmqfq1uqv.preview-blink.com` (or local dev server)
- Browser DevTools open (F12 or Cmd+Opt+I)
- Console tab visible for logging

---

## Quick Test Samples

### Sample 1: Safe URL
```
https://www.google.com
https://github.com
https://wikipedia.org
```

### Sample 2: Suspicious URL
```
http://suspicious-paypa1-verify.com
http://amazon-account-verify.co
http://bank-login-update.ru
```

### Sample 3: Dangerous URL
```
http://malware-kit.tk/exe
http://phishing-bank.tk/steal
http://virus-download.ru
```

### Sample 4: Legitimate Email
```
Hi Team,

Just wanted to confirm our meeting tomorrow at 2 PM. 
Please let me know if you can attend.

Best regards,
John (john@company.com)
```

### Sample 5: Phishing Email
```
URGENT: Verify Your Account Immediately!

Your account has been compromised. Click the link below to reset your password ASAP.

IMPORTANT LINK: https://paypa1-verify.com/update-password

Do not reply to this email. This is an automated message.
```

### Sample 6: Suspicious Email
```
Congratulations! You've Won!

You've been selected to receive a $500 Amazon Gift Card!

Claim Now: https://claim-prize-here.com/verify

Limited time offer - Act now!
```

### Sample 7: Legitimate SMS
```
Hi Sarah, your package will arrive tomorrow between 2-4 PM. Track here: example.com/track/xyz789
```

### Sample 8: Phishing SMS
```
⚠️ ALERT: Your bank account has been locked! Click to unlock: http://bank-secure-verify.com/unlock
```

### Sample 9: Suspicious SMS
```
Click here to confirm delivery: https://short.url/abc123
```

---

## Testing Workflow

### Phase 1: Setup (5 minutes)

```
[ ] 1. Open browser DevTools (F12)
[ ] 2. Go to Console tab
[ ] 3. Clear console (right-click > Clear)
[ ] 4. Navigate to Scanner page
[ ] 5. Verify Scanner component loads
```

### Phase 2: URL Scanning (10 minutes)

#### Test 2.1: Safe URL
```
[ ] Click "Link" tab
[ ] Paste: https://www.google.com
[ ] Click "Analyze"
[ ] Check result shows "Safe" (green badge)
[ ] Verify confidence > 90%
[ ] Check console for: "✅ Used backend ML inference"
[ ] Note time taken in Network tab
```

#### Test 2.2: Suspicious URL
```
[ ] Clear field
[ ] Paste: http://suspicious-paypa1-verify.com
[ ] Click "Analyze"
[ ] Check result shows "Suspicious" (yellow badge)
[ ] Verify confidence 60-85%
[ ] Check console logs
```

#### Test 2.3: Dangerous URL
```
[ ] Clear field
[ ] Paste: http://malware-kit.tk/exe
[ ] Click "Analyze"
[ ] Check result shows "Dangerous" (red badge)
[ ] Verify confidence > 85%
[ ] Check recommendations shown
```

### Phase 3: Email Scanning (10 minutes)

#### Test 3.1: Legitimate Email
```
[ ] Click "Email" tab
[ ] Paste Sample 4 (Legitimate Email)
[ ] Click "Analyze"
[ ] Check result shows "Safe"
[ ] Verify confidence > 85%
[ ] Check indicators are positive
```

#### Test 3.2: Phishing Email
```
[ ] Clear field
[ ] Paste Sample 5 (Phishing Email)
[ ] Click "Analyze"
[ ] Check result shows "Dangerous"
[ ] Verify confidence > 85%
[ ] Check indicators identify phishing tactics
[ ] Verify suspicious URL is identified
```

#### Test 3.3: Suspicious Email
```
[ ] Clear field
[ ] Paste Sample 6 (Suspicious Email)
[ ] Click "Analyze"
[ ] Check result shows "Suspicious"
[ ] Verify confidence 60-75%
[ ] Check recommendations
```

### Phase 4: SMS Scanning (10 minutes)

#### Test 4.1: Legitimate SMS
```
[ ] Click "SMS" tab
[ ] Paste Sample 7
[ ] Click "Analyze"
[ ] Check result shows "Safe"
[ ] Verify confidence > 85%
```

#### Test 4.2: Phishing SMS
```
[ ] Clear field
[ ] Paste Sample 8
[ ] Click "Analyze"
[ ] Check result shows "Dangerous"
[ ] Verify confidence > 85%
```

#### Test 4.3: Suspicious SMS
```
[ ] Clear field
[ ] Paste Sample 9
[ ] Click "Analyze"
[ ] Check result shows "Suspicious"
[ ] Verify confidence 60-75%
```

### Phase 5: QR Code Scanning (15 minutes)

#### Preparation:
```
[ ] Open https://www.qr-code-generator.com/
[ ] Keep in second tab for quick QR generation
```

#### Test 5.1: Safe QR Code
```
[ ] Generate QR containing: https://www.google.com
[ ] Right-click > Save image
[ ] Click "QR" tab in Scanner
[ ] Click "Upload QR Code Image"
[ ] Select saved QR image
[ ] Click "Analyze"
[ ] Check result shows "Safe"
[ ] Verify decoded URL is displayed
[ ] Verify confidence > 90%
```

#### Test 5.2: Suspicious QR Code
```
[ ] Generate QR containing: http://suspicious-paypa1-verify.com
[ ] Save image
[ ] Click "Upload QR Code Image"
[ ] Select image
[ ] Click "Analyze"
[ ] Check result shows "Suspicious"
[ ] Verify decoded URL matches input
```

#### Test 5.3: Dangerous QR Code
```
[ ] Generate QR containing: http://malware-kit.tk
[ ] Save image
[ ] Upload and analyze
[ ] Check result shows "Dangerous"
[ ] Verify high confidence
```

### Phase 6: Database Integration (10 minutes)

#### Test 6.1: Login & Scan History
```
[ ] Log in to application
[ ] Go to Dashboard
[ ] Perform a URL scan from Scanner
[ ] Go to Dashboard > History tab
[ ] Verify scan appears in history
[ ] Verify details match (URL, threat level, confidence)
[ ] Check timestamp is recent
```

#### Test 6.2: Guest Mode
```
[ ] Log out (or open incognito window)
[ ] Perform 2-3 scans (URL, Email, SMS)
[ ] Open DevTools > Application > LocalStorage
[ ] Look for: phishguard_guest_scans
[ ] Verify JSON contains all 3 scans
[ ] Refresh page
[ ] Verify scans still present
```

### Phase 7: Error Handling (5 minutes)

#### Test 7.1: Empty Input
```
[ ] Leave URL field empty
[ ] Click "Analyze"
[ ] Check toast error: "Please enter content to scan"
```

#### Test 7.2: Oversized Input
```
[ ] Generate 60,000 character text
[ ] Paste in Email tab
[ ] Click "Analyze"
[ ] Check backend error handling
```

#### Test 7.3: Invalid QR Format
```
[ ] Try to upload a .txt file as QR image
[ ] Browser should block it
[ ] Try large image > 10MB if available
[ ] Verify error shown
```

### Phase 8: Fallback Testing (10 minutes)

#### Test 8.1: Backend Failure Simulation
```
[ ] In Browser DevTools > Network tab
[ ] Throttle to "Offline"
[ ] Try to perform a URL scan
[ ] Check console for fallback message:
   "Backend ML API failed, falling back to client-side..."
[ ] Verify scan still completes (with client-side analysis)
[ ] Re-enable network
```

---

## Performance Testing

### Response Time Measurement

```javascript
// Run in Console during each scan:

// Start timing
const start = performance.now();

// [Click Analyze button]

// End timing - check Network tab for "ml-phishing-scan" request
// Look at "Duration" column

Expected:
- URL: < 500ms
- Email: < 600ms
- SMS: < 400ms
- QR: < 800ms
```

---

## Test Results Checklist

Copy this into a text file and check off as you test:

```
DATE: ___________

PHASE 2: URL SCANNING
[ ] Test 2.1 - Safe URL
[ ] Test 2.2 - Suspicious URL
[ ] Test 2.3 - Dangerous URL
Status: PASS / FAIL

PHASE 3: EMAIL SCANNING
[ ] Test 3.1 - Legitimate Email
[ ] Test 3.2 - Phishing Email
[ ] Test 3.3 - Suspicious Email
Status: PASS / FAIL

PHASE 4: SMS SCANNING
[ ] Test 4.1 - Legitimate SMS
[ ] Test 4.2 - Phishing SMS
[ ] Test 4.3 - Suspicious SMS
Status: PASS / FAIL

PHASE 5: QR CODE SCANNING
[ ] Test 5.1 - Safe QR
[ ] Test 5.2 - Suspicious QR
[ ] Test 5.3 - Dangerous QR
Status: PASS / FAIL

PHASE 6: DATABASE INTEGRATION
[ ] Test 6.1 - Authenticated User History
[ ] Test 6.2 - Guest Mode Storage
Status: PASS / FAIL

PHASE 7: ERROR HANDLING
[ ] Test 7.1 - Empty Input
[ ] Test 7.2 - Oversized Input
[ ] Test 7.3 - Invalid QR Format
Status: PASS / FAIL

PHASE 8: FALLBACK
[ ] Test 8.1 - Backend Failure
Status: PASS / FAIL

PERFORMANCE
[ ] Response times acceptable
Status: PASS / FAIL

OVERALL: PASS / FAIL
Notes: ________________________
```

---

## Debugging Tips

### Check Console Logs
```javascript
// Expected successful logs:
"✅ Used backend ML inference"

// Fallback logs:
"Backend ML API failed, falling back to client-side..."

// Error logs:
Any red errors indicate issues
```

### Check Network Tab
```
Filter: ml-phishing-scan
Look for:
- Status: 200 (success) or see error code
- Response: Should contain "success: true"
- Duration: Compare with expected times
```

### Check Local Storage (Guest Mode)
```
DevTools > Application > LocalStorage
Key: phishguard_guest_scans
Value: JSON array like:
[
  {
    "scanType": "url",
    "content": "https://...",
    "result": { ... }
  }
]
```

### Check Database (Authenticated Mode)
```sql
-- In Blink dashboard, go to Database
SELECT * FROM phishing_scans 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Time Breakdown

Total Estimated Time: **60-75 minutes**

- Phase 1 (Setup): 5 min
- Phase 2 (URLs): 10 min
- Phase 3 (Emails): 10 min
- Phase 4 (SMS): 10 min
- Phase 5 (QR): 15 min
- Phase 6 (Database): 10 min
- Phase 7 (Error Handling): 5 min
- Phase 8 (Fallback): 10 min
- Performance Testing: 5-10 min

---

## Success Criteria

✅ All tests PASS if:
- ✅ All 23 individual tests pass
- ✅ No console errors (warnings OK)
- ✅ Response times are acceptable
- ✅ Database stores scans for authenticated users
- ✅ Guest mode stores scans locally
- ✅ Error messages display correctly
- ✅ Fallback works when backend fails

❌ Any test FAILS if:
- ❌ Unexpected threat level detected
- ❌ Backend returns 500 error
- ❌ Scan doesn't save to database
- ❌ Response time > 1 second
- ❌ Console shows critical errors
- ❌ Fallback doesn't trigger
- ❌ No network request to backend

---

## Post-Testing Actions

1. **If all tests pass:**
   - [ ] Document results
   - [ ] Create deployment notes
   - [ ] Update version number
   - [ ] Notify team

2. **If any tests fail:**
   - [ ] Document which tests failed
   - [ ] Check console errors
   - [ ] Review backend logs
   - [ ] Create bug report
   - [ ] Fix and re-test

---

## Automated Testing (Optional)

For future development, consider adding:
- Selenium/Cypress tests for UI
- Jest tests for API client
- Supertest for backend API
- Postman collections for manual API testing

