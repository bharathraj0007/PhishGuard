# SMS Backend-Only Implementation Guide

## Overview

SMS phishing detection uses **BACKEND-ONLY inference** with a pre-trained TensorFlow SavedModel. The frontend NEVER runs TensorFlow.js or trains SMS models in the browser.

## Architecture

```
Frontend (Browser)
  └─> api-client.ts: scanSMS()
       └─> HTTP POST to backend
            └─> Backend (Deno Edge Function)
                 └─> TensorFlow Node: Pre-trained CNN model
                      └─> Returns: { label, confidence, score }
```

## Implementation Details

### 1. Backend Endpoint

**Location:** `functions/sms-ml-detector/index.ts`

**URL:** `https://eky2mdxr-3z2n60gcbyvy.deno.dev`

**Features:**
- ✅ Proper CORS headers (OPTIONS preflight + all responses)
- ✅ Pre-trained TensorFlow SavedModel
- ✅ Vocabulary-based tokenization (160 token sequence)
- ✅ Accepts: `{ text: string }`
- ✅ Returns: `{ label: "PHISHING" | "SAFE", confidence: number, score: number }`

**CORS Implementation:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

// OPTIONS preflight handler
if (req.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// All responses include CORS headers
return new Response(JSON.stringify(result), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" }
});
```

### 2. Frontend API Client

**Location:** `src/lib/api-client.ts`

**Function:** `scanSMS(smsContent: string, userId?: string, saveToHistory?: boolean)`

**Implementation:**
```typescript
export async function scanSMS(
  smsContent: string,
  userId?: string,
  saveToHistory = false
): Promise<ScanResult> {
  // Calls backend endpoint directly
  const response = await fetch(SMS_ML_DETECTOR_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: smsContent }),
  });
  
  // Converts backend response to ScanResult format
  // Handles threat level classification
  // Saves to history if user is logged in
}
```

### 3. Scanner Component

**Location:** `src/components/Scanner.tsx`

**SMS Scan Handler (lines 98-119):**
```typescript
} else if (activeTab === 'sms') {
  console.log('📱 SMS scan: Using dedicated TensorFlow CNN model')
  console.log('   - Model: Character-level CNN (160 token sequence)')
  console.log('   - Backend inference: TensorFlow SavedModel')
  console.log('   - Preprocessing: Vocabulary-based tokenization')
  
  try {
    scanResult = await scanSMS(content, user?.id, !!user)
    console.log('✅ SMS scan completed with TensorFlow CNN model')
    console.log('   - Threat Level:', scanResult.threatLevel)
    console.log('   - Confidence:', scanResult.confidence, '%')
  } catch (mlError) {
    console.warn('SMS ML detector failed, falling back to generic analysis:', mlError)
    // Fall back to generic analysis if SMS ML fails
    scanResult = await analyzeContent(content, activeTab)
    
    // Save manually if backend didn't save
    if (user) {
      await saveScan(user.id, activeTab, content, scanResult)
    }
  }
}
```

### 4. UnifiedMLService

**Location:** `src/lib/ml/unified-ml-service.ts`

**SMS Prediction Method (lines 113-119):**
```typescript
/**
 * Predict SMS phishing
 * 
 * IMPORTANT: SMS prediction is handled by backend-only inference.
 * This method should NOT be called - use scanSMS() from api-client.ts instead.
 */
private async predictSMS(_sms: string): Promise<MLPredictionResult> {
  // SMS uses BACKEND-ONLY inference - do not train or run models in browser
  throw new Error(
    'SMS prediction must use backend-only inference. ' +
    'Use scanSMS() from api-client.ts instead of UnifiedMLService.predict() for SMS.'
  );
}
```

### 5. Auto-Training Service

**Location:** `src/lib/ml/auto-training-service.ts`

**SMS Training Handler (lines 111-115):**
```typescript
case 'sms':
  // SMS uses BACKEND-ONLY inference - no frontend training needed
  // The backend has a pre-trained TensorFlow SavedModel
  console.log('📱 SMS detection uses backend-only inference - skipping frontend training')
  break
```

## Why Backend-Only?

1. **Model Size:** The SMS CNN model with SavedModel format is optimized for server-side inference
2. **Performance:** TensorFlow Node is faster than TensorFlow.js for this model architecture
3. **Vocabulary:** 160-token sequence with pre-built vocabulary file
4. **Preprocessing:** Complex tokenization logic better handled server-side
5. **Browser Constraints:** Avoids loading large TensorFlow.js dependencies

## Testing SMS Detection

### Test Request
```bash
curl -X POST https://eky2mdxr-3z2n60gcbyvy.deno.dev \
  -H "Content-Type: application/json" \
  -d '{"text": "URGENT: Your account has been suspended. Click here to verify: http://bit.ly/verify-now"}'
```

### Expected Response
```json
{
  "label": "PHISHING",
  "confidence": 0.8532,
  "score": 0.8532,
  "text": "URGENT: Your account has been suspended. Click here to verify: http://bit.ly/verify-now"
}
```

### Test Safe Message
```bash
curl -X POST https://eky2mdxr-3z2n60gcbyvy.deno.dev \
  -H "Content-Type: application/json" \
  -d '{"text": "Hi John, your package delivery is scheduled for tomorrow between 2-4 PM. Thanks for your order!"}'
```

### Expected Response
```json
{
  "label": "SAFE",
  "confidence": 0.9124,
  "score": 0.0876,
  "text": "Hi John, your package delivery is scheduled for tomorrow between 2-4 PM. Thanks for your order!"
}
```

## Critical Rules

### ✅ DO:
- Use `scanSMS()` from `api-client.ts` for all SMS scanning
- Let the backend handle all TensorFlow inference
- Handle backend errors gracefully with fallback
- Save to history after successful backend scan

### ❌ DON'T:
- Call `UnifiedMLService.predict()` for SMS (will throw error)
- Import or use `BiLSTMSMSModel` in frontend
- Train SMS models in the browser
- Use TensorFlow.js for SMS detection
- Bypass the backend endpoint

## Troubleshooting

### Issue: CORS errors when calling backend
**Solution:** Backend already has CORS enabled. Check browser console for specific error.

### Issue: "SMS prediction must use backend-only inference" error
**Solution:** Code is trying to use UnifiedMLService for SMS. Use `scanSMS()` instead.

### Issue: Backend returns 404 or 500
**Solution:** Check backend logs with `blink_function_logs` tool. Ensure model files exist in `functions/sms-ml-detector/models/`

### Issue: Low accuracy or wrong predictions
**Solution:** Backend model is pre-trained. Check preprocessing in backend (tokenization, sequence padding).

## Model Information

**Architecture:** Character-level CNN
**Input:** [1, 160] integer sequence (vocabulary-based tokens)
**Output:** Single sigmoid score (0-1, where >0.5 = phishing)
**Preprocessing:**
- Lowercase conversion
- URL removal/replacement
- Phone number normalization
- Vocabulary-based tokenization
- Padding/truncation to 160 tokens

**Threshold:** 0.5 (scores > 0.5 classified as PHISHING)

## Deployment Status

- ✅ Backend endpoint deployed and active
- ✅ CORS properly configured
- ✅ Frontend correctly integrated
- ✅ Auto-training disabled for SMS
- ✅ UnifiedMLService blocks SMS predictions
- ✅ Scanner component uses backend API

## Summary

SMS phishing detection is fully implemented as backend-only inference. The frontend makes HTTP POST requests to the Deno edge function, which runs the pre-trained TensorFlow CNN model and returns predictions. No TensorFlow.js or browser-based model training/inference is used for SMS.
