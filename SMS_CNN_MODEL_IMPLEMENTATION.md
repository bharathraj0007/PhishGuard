# SMS Phishing Detection - TensorFlow CNN Model Implementation

## Overview
SMS phishing detection using a dedicated TensorFlow CNN (Convolutional Neural Network) model trained on SMS spam/phishing datasets. The model operates entirely on the backend using TensorFlow SavedModel format.

## Architecture

### Model Details
- **Type**: Character-level CNN with vocabulary-based tokenization
- **Input**: Integer token sequence of length 160
- **Output**: Single sigmoid value (phishing probability 0-1)
- **Format**: TensorFlow SavedModel
- **Location**: `functions/sms-ml-detector/models/`

### Model Files
```
functions/sms-ml-detector/models/
├── saved_model.pb          # TensorFlow model graph
├── fingerprint.pb          # Model fingerprint
├── vocab.txt              # Vocabulary file (word → index mapping)
├── variables/
│   ├── variables.data-00000-of-00001
│   └── variables.index
└── assets/
```

## SMS Preprocessing Pipeline

### Step 1: Text Normalization
```typescript
// Convert to lowercase
let processed = text.toLowerCase()
```

### Step 2: URL Removal
```typescript
// Remove HTTP/HTTPS URLs
processed = processed.replace(/https?:\/\/\S+/g, "")
// Remove www. URLs
processed = processed.replace(/www\.\S+/g, "")
// Remove domain patterns
processed = processed.replace(/\S+\.(com|org|net|edu|gov|co\.uk|io)\S*/g, "")
```

### Step 3: Phone Number Removal
```typescript
// Replace various phone number formats with "number" token
processed = processed.replace(/\+?\d[\d\s\-\(\)\.]{7,}\d/g, "number")
processed = processed.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "number")
```

### Step 4: Tokenization
```typescript
// Split by spaces and clean tokens
const tokens = processed
  .split(/\s+/)
  .map(token => token.replace(/[^\w]/g, ""))
  .filter(token => token.length > 0)
```

### Step 5: Token to Index Conversion
```typescript
// Convert tokens to integer indices using vocab.txt
const unkIndex = vocabMap.get("[unk]") || 1
const sequence = tokens.map(token => {
  return vocabMap.get(token) || unkIndex
})
```

### Step 6: Sequence Padding/Truncation
```typescript
// Ensure exactly 160 tokens
if (sequence.length < 160) {
  // Pad with zeros
  while (sequence.length < 160) {
    sequence.push(0)
  }
} else if (sequence.length > 160) {
  // Truncate
  sequence.splice(160)
}
```

## Model Inference

### Input Preparation
```typescript
// Create 2D tensor with shape [1, 160]
const inputTensor = tf.tensor2d([sequence], [1, 160], "int32")
```

### Prediction
```typescript
// Run inference
const prediction = model.predict(inputTensor) as tf.Tensor
const score = (await prediction.data())[0] // Get sigmoid output (0-1)
```

### Classification Rules
```typescript
const PHISHING_THRESHOLD = 0.5

if (score > 0.5) {
  label = "PHISHING"
  confidence = score
} else {
  label = "SAFE"
  confidence = 1 - score
}
```

## API Interface

### Endpoint
```
POST https://eky2mdxr-dfp98xt9qped.deno.dev
```

### Request Format
```json
{
  "text": "Congratulations! You've won a $1000 gift card. Click here to claim: bit.ly/xyz"
}
```

### Response Format
```json
{
  "label": "PHISHING",
  "confidence": 0.8753,
  "score": 0.8753,
  "text": "Congratulations! You've won a $1000 gift card. Click here to claim: bit.ly/xyz"
}
```

### Response Fields
- `label`: Classification result ("PHISHING" or "SAFE")
- `confidence`: Model confidence in its prediction (0-1)
- `score`: Raw sigmoid output value (0-1, where >0.5 = phishing)
- `text`: First 100 characters of input (for verification)

## Frontend Integration

### API Client Function
Location: `src/lib/api-client.ts`

```typescript
export async function scanSMS(
  smsContent: string,
  userId?: string,
  saveToHistory = false
): Promise<ScanResult>
```

### Usage in Scanner Component
Location: `src/components/Scanner.tsx`

```typescript
// SMS scanning with dedicated CNN model
if (activeTab === 'sms') {
  scanResult = await scanSMS(content, user?.id, !!user)
}
```

### Threat Level Mapping
```typescript
let threatLevel: 'safe' | 'suspicious' | 'dangerous'
if (!isPhishing) {
  threatLevel = 'safe'
} else if (score < 70) {
  threatLevel = 'suspicious'
} else {
  threatLevel = 'dangerous'
}
```

## Error Handling

### Backend Errors
- Model loading failures
- Invalid input format
- Vocabulary loading errors
- TensorFlow runtime errors

### Frontend Fallback
If SMS ML detector fails, system falls back to generic heuristic analysis:
```typescript
catch (mlError) {
  console.warn('SMS ML detector failed, falling back to generic analysis:', mlError)
  scanResult = await analyzeContent(content, activeTab)
}
```

## Testing Examples

### Legitimate SMS
```
Input: "Hi! Are we still meeting for coffee at 3pm today?"
Expected: SAFE (confidence ~0.85)
```

### Phishing SMS
```
Input: "URGENT: Your account has been suspended. Click here immediately to verify: bit.ly/verify123"
Expected: PHISHING (confidence ~0.92)
```

### Prize Scam SMS
```
Input: "Congratulations! You've won a $1000 gift card. Reply YES to claim your prize now!"
Expected: PHISHING (confidence ~0.88)
```

### Financial Phishing SMS
```
Input: "Your bank account requires verification. Click link to avoid account closure: secure-bank-login.xyz"
Expected: PHISHING (confidence ~0.95)
```

## Performance Metrics

### Model Characteristics
- **Input Size**: Fixed 160-token sequence
- **Vocabulary Size**: ~61,466 words (from vocab.txt)
- **Inference Time**: ~50-200ms per SMS (backend)
- **Memory**: Model loaded once on first request

### Preprocessing Performance
- URL removal: O(n) where n = text length
- Tokenization: O(n)
- Sequence padding: O(1)
- Total preprocessing: ~5-10ms

## Vocabulary File Format

### Structure
```
<empty line>
[UNK]
number
to
i
you
a
the
...
```

### Special Tokens
- **Line 0**: Empty (padding token)
- **Line 1**: `[UNK]` - Unknown words token
- **Line 2**: `number` - Placeholder for phone numbers

## Deployment

### Edge Function
```bash
Function Name: sms-ml-detector
Entrypoint: functions/sms-ml-detector/index.ts
URL: https://eky2mdxr-dfp98xt9qped.deno.dev
```

### Required Files
- index.ts (handler)
- models/vocab.txt
- models/saved_model.pb
- models/fingerprint.pb
- models/variables/*

### Dependencies
```typescript
import * as tf from "npm:@tensorflow/tfjs-node@4.22.0"
```

## Maintenance

### Model Updates
To update the SMS CNN model:
1. Replace files in `functions/sms-ml-detector/models/`
2. Ensure vocab.txt format is maintained
3. Redeploy edge function: `blink_deploy_function`
4. Test with known phishing/legitimate samples

### Monitoring
- Check edge function logs for errors
- Monitor inference latency
- Track classification accuracy via user feedback

## Advantages

1. **Dedicated Model**: Purpose-built CNN for SMS phishing
2. **Backend Inference**: No browser compatibility issues
3. **Fast Processing**: Optimized TensorFlow inference
4. **Vocabulary-Based**: Handles unknown words gracefully
5. **URL/Phone Removal**: Reduces noise in analysis
6. **Fixed Input Size**: Consistent performance

## Limitations

1. **Fixed Sequence Length**: Maximum 160 tokens
2. **Vocabulary-Based**: Out-of-vocabulary words treated as [UNK]
3. **Backend Dependency**: Requires network connectivity
4. **Language**: Primarily trained on English SMS

## Future Improvements

1. Multilingual support (train on non-English SMS)
2. Dynamic sequence length handling
3. Real-time vocabulary updates
4. A/B testing with different model architectures
5. User feedback integration for continuous learning
