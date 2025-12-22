# PhishGuard ML Testing - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Open the App
```
Navigate to: https://phishguard-web-phishing-detector-eky2mdxr.sites.blink.new
Or: https://3000-igu9ih6j9chjtmqfq1uqv.preview-blink.com
```

### Step 2: Open DevTools
```
Press: F12 (Windows/Linux) or Cmd+Opt+I (Mac)
Go to: Console tab
```

### Step 3: Test URL Scanning (30 seconds)
```
1. Click "Link" tab in Scanner
2. Paste: https://www.google.com
3. Click "Analyze"
4. Expected: SAFE badge, 95%+ confidence
5. Console should show: ✅ Used backend ML inference
```

### Step 4: Test Email Scanning (30 seconds)
```
1. Click "Email" tab
2. Paste this phishing email:

   URGENT: Verify Your Account Immediately!
   Your account has been compromised. 
   Click here: https://paypa1-verify.com/login

3. Click "Analyze"
4. Expected: DANGEROUS badge, 90%+ confidence
5. Should identify: typosquatting, phishing patterns
```

### Step 5: Test SMS Scanning (30 seconds)
```
1. Click "SMS" tab
2. Paste: ⚠️ VERIFY YOUR BANK! Account locked. Update: http://bank-verify-secure.com/login
3. Click "Analyze"
4. Expected: DANGEROUS badge, 90%+ confidence
5. Should identify: account compromise threat
```

### Step 6: Test QR Code (1 minute)
```
1. Generate QR at: https://www.qr-code-generator.com/
2. QR content: https://www.google.com
3. Download image
4. Click "QR" tab
5. Click "Upload QR Code Image"
6. Select the image
7. Click "Analyze"
8. Expected: SAFE badge, decoded URL shown
```

**⏱️ Total Time: 5 minutes**

---

## 📊 Quick Test Matrix

Copy this and check off as you test:

```
✅ = PASS    ❌ = FAIL    ⏸️ = SKIPPED

URL SCANNING
  [ ] Safe URL (google.com)              Expected: SAFE, 95%+
  [ ] Phishing URL (paypa1-verify.com)   Expected: SUSPICIOUS/DANGEROUS, 70%+
  [ ] Malware URL (malware-kit.tk)       Expected: DANGEROUS, 90%+

EMAIL SCANNING
  [ ] Legitimate Email                   Expected: SAFE, 90%+
  [ ] Phishing Email                     Expected: DANGEROUS, 90%+
  [ ] Spam Email                         Expected: SUSPICIOUS, 65%+

SMS SCANNING
  [ ] Legitimate SMS                     Expected: SAFE, 85%+
  [ ] Phishing SMS                       Expected: DANGEROUS, 90%+
  [ ] Spam SMS                           Expected: SUSPICIOUS, 65%+

QR SCANNING
  [ ] Safe QR (github.com)               Expected: SAFE, 95%+
  [ ] Phishing QR (paypa1-verify.com)    Expected: SUSPICIOUS, 75%+
  [ ] Malware QR (malware-kit.tk)        Expected: DANGEROUS, 95%+

DATABASE
  [ ] Login & save scan                  Expected: History shows scan
  [ ] Guest mode (no login)              Expected: LocalStorage has scan

BACKEND
  [ ] Check console for ✅ messages      Expected: Green checkmarks
  [ ] Check Network tab response time    Expected: < 1 second

OVERALL: [ ] PASS  [ ] FAIL
```

---

## 🔍 What to Look For

### Good Signs ✅
```
✓ Scanner loads without errors
✓ Console shows: "✅ Used backend ML inference"
✓ Results appear in < 1 second
✓ Threat levels are color-coded (green/yellow/red)
✓ Confidence scores are realistic (60-100%)
✓ Indicators are relevant to the content
✓ Recommendations are helpful
✓ Network requests show 200 status
✓ No red errors in console
```

### Bad Signs ❌
```
✗ White/blank screen
✗ "Failed to analyze content" error
✗ No Network request appears
✗ Status code 500 or 429
✗ Red error messages in console
✗ Response takes > 3 seconds
✗ Results don't match input
✗ Database doesn't save scans
✗ Can't upload QR image
```

---

## 🎯 Focus Testing Areas

### If You Have 5 Minutes
```
1. Test one URL scan ✓
2. Test one email scan ✓
3. Check console for ✅ messages ✓
Done! ✓
```

### If You Have 15 Minutes
```
1. Test URL: safe, phishing, malware (3 scans) ✓
2. Test Email: legitimate, phishing (2 scans) ✓
3. Test SMS: legitimate, phishing (2 scans) ✓
4. Check Network tab response times ✓
Done! ✓
```

### If You Have 45 Minutes (Full Test)
```
Follow TESTING_SCRIPT.md for complete coverage ✓
```

### If You Have 2+ Hours (Comprehensive)
```
Follow ML_INFERENCE_TESTING_GUIDE.md for all tests ✓
```

---

## 💡 Helpful Keyboard Shortcuts

| Action | Windows/Linux | Mac |
|--------|---------------|-----|
| Open DevTools | F12 | Cmd+Opt+I |
| Open Console | Ctrl+Shift+J | Cmd+Opt+J |
| Open Network | Ctrl+Shift+E | Cmd+Opt+E |
| Clear Console | Ctrl+L | Cmd+K |
| Refresh Page | F5 | Cmd+R |
| Hard Refresh | Ctrl+Shift+R | Cmd+Shift+R |

---

## 🧪 Sample Test Data

**Safe Examples:**
```
URL: https://www.google.com
Email: Hi, let's meet tomorrow at 2 PM - John
SMS: Your package arrived. Track: example.com/track/xyz
```

**Phishing Examples:**
```
URL: http://paypa1-verify.com/login
Email: URGENT: Verify account here: https://paypa1-verify.com
SMS: ⚠️ CONFIRM BANK: http://bank-secure.com/login
QR: (Generate with content: http://paypa1-verify.com)
```

**Malware Examples:**
```
URL: http://malware-download-site.tk/exe
Email: Download software: http://malware-kit.tk
SMS: Download app: http://virus-download.ru
QR: (Generate with content: http://malware-download-site.tk)
```

---

## 📱 Browser DevTools Tips

### Check Network Requests
```
1. Open DevTools > Network tab
2. Filter: ml-phishing-scan (search box)
3. Perform a scan
4. Click the ml-phishing-scan request
5. Check Status: should be 200
6. Check Response: look for "success": true
7. Check Time: should be < 1 second
```

### Monitor Console
```
Expected log patterns:
✅ Used backend ML inference          <- Success
⚠️ Backend ML API failed              <- Fallback active
Network errors                        <- Network issue
```

### Check LocalStorage (Guest Mode)
```
1. DevTools > Application > LocalStorage
2. Find: phishguard_guest_scans
3. Value should be JSON array
4. Contains all guest scans
```

---

## 🐛 Troubleshooting Checklist

**If scanning fails:**

1. Check Network tab
   - Is there a request to ml-phishing-scan?
   - Status 200 or error code?
   - Response contains JSON?

2. Check Console
   - Red error messages?
   - Network errors?
   - "Failed to" messages?

3. Reload page
   - Press Cmd/Ctrl + Shift + R (hard refresh)
   - Try again

4. Check backend
   - Function deployed?
   - Environment variables set?
   - No runtime errors?

5. Try fallback
   - Should work even if backend fails
   - Check console for fallback message
   - Result should still display

---

## 📝 Test Report Template

Save this and fill in as you test:

```
TEST REPORT - [Date] [Time]

TESTER: _________________
ENVIRONMENT: Production / Preview / Local
BROWSER: Chrome / Firefox / Safari

QUICK TEST RESULTS:
- Safe URL:         [ ] PASS [ ] FAIL
- Phishing URL:     [ ] PASS [ ] FAIL
- Phishing Email:   [ ] PASS [ ] FAIL
- Phishing SMS:     [ ] PASS [ ] FAIL
- QR Code:          [ ] PASS [ ] FAIL
- Database:         [ ] PASS [ ] FAIL
- Console Logs:     [ ] PASS [ ] FAIL

ISSUES FOUND:
1. _________________________________
2. _________________________________
3. _________________________________

NOTES:
_________________________________

OVERALL: [ ] PASS [ ] FAIL
```

---

## 🎓 Understanding Results

### Threat Levels
- **SAFE (Green)**: Legitimate content, low risk
- **SUSPICIOUS (Yellow)**: Possible phishing/spam, medium risk
- **DANGEROUS (Red)**: Confirmed phishing/malware, high risk

### Confidence Score
- **90-100%**: Very confident in assessment
- **75-89%**: Confident, with some uncertainty
- **60-74%**: Less confident, may need manual review
- **< 60%**: Low confidence, treat as uncertain

### Indicators
- Lists specific reasons for threat assessment
- Examples: "domain typosquatting", "phishing keywords", "HTTPS"
- Match indicators to input content

### Recommendations
- Actionable advice based on threat level
- "Safe to visit" vs "Do NOT click"
- How to verify or report threat

---

## ⚡ Performance Expectations

```
URL Scan:    200-500ms
Email Scan:  300-700ms
SMS Scan:    200-400ms
QR Scan:     500-1000ms

If slower:
- Check internet speed
- Check backend load
- Check browser extensions
- Try hard refresh
```

---

## 🚨 Critical Issues

These should NEVER happen:

```
❌ White/blank page after click
❌ Status 500 errors
❌ "CORS error" in console
❌ No response after 5 seconds
❌ File upload doesn't work
❌ Cannot click buttons
❌ Layout broken/misaligned
```

If any of these occur, document and report immediately.

---

## ✨ Success Indicators

After running tests, you should see:

```
✅ Consistent threat level detection
✅ Realistic confidence scores
✅ Relevant indicators
✅ Helpful recommendations
✅ Fast response times (< 1 sec)
✅ No console errors
✅ Database saves scans
✅ Network requests 200 status
✅ Fallback works gracefully
✅ Mobile and desktop work
```

---

## 📚 Documentation Reference

For more details, see:
- **ML_INFERENCE_TESTING_GUIDE.md** - Complete testing procedures
- **TESTING_SCRIPT.md** - Step-by-step testing workflow
- **EXPECTED_TEST_RESULTS.md** - Sample responses and expected outputs
- **ML_TRAINING_COMPLETE_SYSTEM.md** - How ML models work

---

## 🎯 Next Steps

After testing:

1. **If all tests pass:**
   - Document results
   - Note any observations
   - Plan next improvements
   - Share with team

2. **If any tests fail:**
   - Document which tests failed
   - Check troubleshooting guide
   - Review error messages
   - Check backend logs
   - Create bug report

3. **When ready for production:**
   - Run complete test suite
   - Get team approval
   - Deploy to production
   - Monitor error rates
   - Collect user feedback

---

## 💬 Quick Questions?

**Q: How do I know if the backend is working?**
A: Look for "✅ Used backend ML inference" in console

**Q: What if I see a fallback message?**
A: Backend API failed, but client-side analysis is running. Still get results!

**Q: Why is response slow?**
A: Check Network tab. ML inference takes ~300-700ms normally.

**Q: Can I test without logging in?**
A: Yes! Guest mode stores scans in browser localStorage

**Q: What if QR won't decode?**
A: Check image quality, try different QR generator, check console logs

**Q: Where are my scans saved?**
A: Authenticated users → Database. Guest mode → Browser localStorage

---

## 🎉 You're Ready!

**Start testing now:**
1. Open the app
2. Open DevTools
3. Follow Quick Test Matrix above
4. Report results

**Great luck! You've got this! 🚀**

