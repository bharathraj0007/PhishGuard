/**
 * Text Preprocessing for ML Models
 * 
 * Handles tokenization, vectorization, and normalization for browser-based ML.
 * All processing done in JavaScript/TypeScript without external dependencies.
 */

/**
 * Clean and normalize text
 */
export function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters but keep basic punctuation
    .replace(/[^\w\s\.\,\!\?\@\#\$\%\&\*\(\)\-\_\+\=\[\]\{\}\:\;\"\'\/\\]/g, '')
    // Normalize URLs
    .replace(/https?:\/\/[^\s]+/g, ' URL ')
    // Normalize emails
    .replace(/[\w\.-]+@[\w\.-]+\.\w+/g, ' EMAIL ')
    // Normalize phone numbers
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, ' PHONE ')
    // Normalize excessive dots
    .replace(/\.{2,}/g, '.')
    .trim();
}

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  const cleaned = cleanText(text);
  return cleaned
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Build vocabulary from corpus
 */
export function buildVocabulary(
  texts: string[],
  maxVocabSize: number = 10000,
  minFrequency: number = 2
): Map<string, number> {
  // Count word frequencies
  const wordFreq = new Map<string, number>();
  
  for (const text of texts) {
    const tokens = tokenize(text);
    for (const token of tokens) {
      wordFreq.set(token, (wordFreq.get(token) || 0) + 1);
    }
  }

  // Filter by minimum frequency and sort by frequency
  const sortedWords = Array.from(wordFreq.entries())
    .filter(([_, freq]) => freq >= minFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxVocabSize)
    .map(([word]) => word);

  // Create vocabulary map (word -> index)
  // Reserve 0 for padding, 1 for unknown
  const vocabulary = new Map<string, number>();
  vocabulary.set('<PAD>', 0);
  vocabulary.set('<UNK>', 1);
  
  sortedWords.forEach((word, idx) => {
    vocabulary.set(word, idx + 2);
  });

  console.log(`📚 Built vocabulary: ${vocabulary.size} words`);
  
  return vocabulary;
}

/**
 * Convert text to sequence of indices
 */
export function textToSequence(
  text: string,
  vocabulary: Map<string, number>
): number[] {
  const tokens = tokenize(text);
  const unkIndex = vocabulary.get('<UNK>') || 1;
  
  return tokens.map(token => vocabulary.get(token) || unkIndex);
}

/**
 * Pad sequences to fixed length
 */
export function padSequences(
  sequences: number[][],
  maxLength: number,
  padding: 'pre' | 'post' = 'post',
  truncating: 'pre' | 'post' = 'post',
  value: number = 0
): number[][] {
  return sequences.map(seq => {
    // Truncate if too long
    let truncated = seq;
    if (seq.length > maxLength) {
      truncated = truncating === 'post' 
        ? seq.slice(0, maxLength)
        : seq.slice(seq.length - maxLength);
    }

    // Pad if too short
    const padLength = maxLength - truncated.length;
    if (padLength > 0) {
      const padArray = new Array(padLength).fill(value);
      return padding === 'post'
        ? [...truncated, ...padArray]
        : [...padArray, ...truncated];
    }

    return truncated;
  });
}

/**
 * Character-level encoding for Character-CNN
 */
export function textToCharSequence(
  text: string,
  charToIndex: Map<string, number>,
  maxLength: number = 256
): number[] {
  const cleaned = cleanText(text);
  const unkIndex = charToIndex.get('<UNK>') || 0;
  
  const sequence: number[] = [];
  
  for (let i = 0; i < Math.min(cleaned.length, maxLength); i++) {
    const char = cleaned[i];
    sequence.push(charToIndex.get(char) || unkIndex);
  }

  // Pad to maxLength
  while (sequence.length < maxLength) {
    sequence.push(0); // padding
  }

  return sequence;
}

/**
 * Build character vocabulary
 */
export function buildCharVocabulary(): Map<string, number> {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789 .,!?@#$%&*()-_+=[]{}:;"\'/\\<>|~`';
  const charToIndex = new Map<string, number>();
  
  charToIndex.set('<PAD>', 0);
  charToIndex.set('<UNK>', 1);
  
  for (let i = 0; i < chars.length; i++) {
    charToIndex.set(chars[i], i + 2);
  }

  return charToIndex;
}

/**
 * TF-IDF Vectorization (simplified for browser)
 */
export class TFIDFVectorizer {
  private vocabulary: Map<string, number>;
  private idf: Map<string, number>;
  private maxFeatures: number;

  constructor(maxFeatures: number = 1000) {
    this.vocabulary = new Map();
    this.idf = new Map();
    this.maxFeatures = maxFeatures;
  }

  /**
   * Fit vectorizer on corpus
   */
  fit(texts: string[]): void {
    // Build vocabulary
    this.vocabulary = buildVocabulary(texts, this.maxFeatures, 1);

    // Calculate IDF
    const docCount = texts.length;
    const docFreq = new Map<string, number>();

    for (const text of texts) {
      const tokens = new Set(tokenize(text));
      for (const token of tokens) {
        if (this.vocabulary.has(token)) {
          docFreq.set(token, (docFreq.get(token) || 0) + 1);
        }
      }
    }

    // IDF = log(N / df)
    for (const [word, idx] of this.vocabulary.entries()) {
      if (word !== '<PAD>' && word !== '<UNK>') {
        const df = docFreq.get(word) || 1;
        this.idf.set(word, Math.log(docCount / df));
      }
    }

    console.log(`📊 TF-IDF fitted on ${texts.length} documents`);
  }

  /**
   * Transform text to TF-IDF vector
   */
  transform(text: string): number[] {
    const tokens = tokenize(text);
    const vector = new Array(this.vocabulary.size).fill(0);

    // Calculate term frequency
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Normalize by document length
    const docLength = tokens.length;

    // Calculate TF-IDF
    for (const [word, count] of tf.entries()) {
      const idx = this.vocabulary.get(word);
      if (idx !== undefined && idx > 0) {
        const tfScore = count / docLength;
        const idfScore = this.idf.get(word) || 0;
        vector[idx] = tfScore * idfScore;
      }
    }

    return vector;
  }

  /**
   * Transform multiple texts
   */
  transformBatch(texts: string[]): number[][] {
    return texts.map(text => this.transform(text));
  }

  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  getVocabulary(): Map<string, number> {
    return this.vocabulary;
  }
}

/**
 * N-gram features extraction
 */
export function extractNGrams(
  text: string,
  n: number = 2
): string[] {
  const tokens = tokenize(text);
  const ngrams: string[] = [];

  for (let i = 0; i <= tokens.length - n; i++) {
    const ngram = tokens.slice(i, i + n).join('_');
    ngrams.push(ngram);
  }

  return ngrams;
}

/**
 * Extract character n-grams
 */
export function extractCharNGrams(
  text: string,
  n: number = 3
): string[] {
  const cleaned = cleanText(text);
  const ngrams: string[] = [];

  for (let i = 0; i <= cleaned.length - n; i++) {
    ngrams.push(cleaned.slice(i, i + n));
  }

  return ngrams;
}

/**
 * Feature extraction for URL analysis
 */
export interface URLFeatures {
  length: number;
  numDots: number;
  numDashes: number;
  numDigits: number;
  numSpecialChars: number;
  hasHTTPS: number;
  hasIP: number;
  hasAtSymbol: number;
  entropy: number;
}

export function extractURLFeatures(url: string): URLFeatures {
  const cleaned = cleanText(url);
  
  return {
    length: cleaned.length,
    numDots: (cleaned.match(/\./g) || []).length,
    numDashes: (cleaned.match(/\-/g) || []).length,
    numDigits: (cleaned.match(/\d/g) || []).length,
    numSpecialChars: (cleaned.match(/[^a-z0-9\s]/g) || []).length,
    hasHTTPS: url.toLowerCase().startsWith('https') ? 1 : 0,
    hasIP: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url) ? 1 : 0,
    hasAtSymbol: url.includes('@') ? 1 : 0,
    entropy: calculateEntropy(cleaned)
  };
}

/**
 * Calculate Shannon entropy
 */
function calculateEntropy(text: string): number {
  if (text.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of text) {
    freq.set(char, (freq.get(char) || 0) + 1);
  }

  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / text.length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Normalize features to 0-1 range
 */
export function normalizeFeatures(
  features: number[][],
  means?: number[],
  stds?: number[]
): { normalized: number[][], means: number[], stds: number[] } {
  if (features.length === 0 || features[0].length === 0) {
    return { normalized: features, means: [], stds: [] };
  }

  const numFeatures = features[0].length;
  
  // Calculate means and stds if not provided
  if (!means || !stds) {
    means = new Array(numFeatures).fill(0);
    stds = new Array(numFeatures).fill(0);

    // Calculate means
    for (const feature of features) {
      for (let i = 0; i < numFeatures; i++) {
        means[i] += feature[i];
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      means[i] /= features.length;
    }

    // Calculate standard deviations
    for (const feature of features) {
      for (let i = 0; i < numFeatures; i++) {
        stds[i] += Math.pow(feature[i] - means[i], 2);
      }
    }
    for (let i = 0; i < numFeatures; i++) {
      stds[i] = Math.sqrt(stds[i] / features.length);
      // Prevent division by zero
      if (stds[i] === 0) stds[i] = 1;
    }
  }

  // Normalize using z-score
  const normalized = features.map(feature =>
    feature.map((val, i) => (val - means![i]) / stds![i])
  );

  return { normalized, means, stds };
}
