/**
 * TensorFlow.js Data Processor
 * 
 * Converts JavaScript arrays to TensorFlow.js tensors for training
 * Handles preprocessing, tokenization, and tensor creation
 */

import * as tf from '@tensorflow/tfjs';

export interface ProcessedData {
  xTrain: tf.Tensor2D;
  yTrain: tf.Tensor2D;
  xTest: tf.Tensor2D;
  yTest: tf.Tensor2D;
  metadata: {
    vocabSize: number;
    maxLength: number;
    trainSize: number;
    testSize: number;
  };
}

export interface CharProcessedData {
  xTrain: tf.Tensor3D;
  yTrain: tf.Tensor2D;
  xTest: tf.Tensor3D;
  yTest: tf.Tensor2D;
  metadata: {
    charVocabSize: number;
    maxLength: number;
    trainSize: number;
    testSize: number;
  };
}

/**
 * Create vocabulary mapping from texts
 */
export function createVocabulary(texts: string[]): Map<string, number> {
  const wordCounts = new Map<string, number>();
  
  // Count word frequencies
  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
  }
  
  // Sort by frequency and assign indices
  const sortedWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
  
  const vocabulary = new Map<string, number>();
  vocabulary.set('<PAD>', 0);
  vocabulary.set('<UNK>', 1);
  
  for (let i = 0; i < sortedWords.length; i++) {
    vocabulary.set(sortedWords[i], i + 2);
  }
  
  return vocabulary;
}

/**
 * Tokenize texts using vocabulary
 */
export function tokenizeTexts(
  texts: string[],
  vocabulary: Map<string, number>,
  maxLength: number
): number[][] {
  const sequences: number[][] = [];
  
  for (const text of texts) {
    const words = text.toLowerCase().split(/\s+/);
    const sequence: number[] = [];
    
    for (const word of words) {
      if (word) {
        const index = vocabulary.get(word) || 1; // 1 = <UNK>
        sequence.push(index);
      }
    }
    
    // Pad or truncate to maxLength
    while (sequence.length < maxLength) {
      sequence.push(0); // 0 = <PAD>
    }
    
    sequences.push(sequence.slice(0, maxLength));
  }
  
  return sequences;
}

/**
 * Split data into train and test sets
 */
export function trainTestSplit<T>(
  data: T[],
  testSize: number = 0.2
): { train: T[]; test: T[] } {
  const shuffled = [...data].sort(() => Math.random() - 0.5);
  const splitIndex = Math.floor(shuffled.length * (1 - testSize));
  
  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex)
  };
}

/**
 * Convert texts and labels to TensorFlow.js tensors (word-level)
 */
export function convertToTensors(
  texts: string[],
  labels: number[],
  maxLength: number = 100,
  vocabSize?: number
): ProcessedData {
  // Create vocabulary
  const vocabulary = createVocabulary(texts);
  const actualVocabSize = vocabSize || vocabulary.size;
  
  // Tokenize texts
  const sequences = tokenizeTexts(texts, vocabulary, maxLength);
  
  // Split data
  const combinedData = sequences.map((seq, i) => ({ seq, label: labels[i] }));
  const { train, test } = trainTestSplit(combinedData, 0.2);
  
  // Create tensors
  const xTrain = tf.tensor2d(train.map(d => d.seq));
  const yTrain = tf.tensor2d(train.map(d => [d.label]));
  const xTest = tf.tensor2d(test.map(d => d.seq));
  const yTest = tf.tensor2d(test.map(d => [d.label]));
  
  return {
    xTrain,
    yTrain,
    xTest,
    yTest,
    metadata: {
      vocabSize: actualVocabSize,
      maxLength,
      trainSize: train.length,
      testSize: test.length
    }
  };
}

/**
 * Create character vocabulary
 */
export function createCharVocabulary(texts: string[]): Map<string, number> {
  const charSet = new Set<string>();
  
  for (const text of texts) {
    for (const char of text.toLowerCase()) {
      charSet.add(char);
    }
  }
  
  const vocabulary = new Map<string, number>();
  vocabulary.set('<PAD>', 0);
  vocabulary.set('<UNK>', 1);
  
  const chars = Array.from(charSet).sort();
  for (let i = 0; i < chars.length; i++) {
    vocabulary.set(chars[i], i + 2);
  }
  
  return vocabulary;
}

/**
 * Convert texts to character-level sequences
 */
export function textsToCharSequences(
  texts: string[],
  vocabulary: Map<string, number>,
  maxLength: number
): number[][] {
  const sequences: number[][] = [];
  
  for (const text of texts) {
    const sequence: number[] = [];
    
    for (const char of text.toLowerCase()) {
      const index = vocabulary.get(char) || 1;
      sequence.push(index);
    }
    
    // Pad or truncate
    while (sequence.length < maxLength) {
      sequence.push(0);
    }
    
    sequences.push(sequence.slice(0, maxLength));
  }
  
  return sequences;
}

/**
 * Convert texts and labels to character-level tensors
 */
export function convertToCharTensors(
  texts: string[],
  labels: number[],
  maxLength: number = 200
): CharProcessedData {
  // Create character vocabulary
  const vocabulary = createCharVocabulary(texts);
  
  // Convert to character sequences
  const sequences = textsToCharSequences(texts, vocabulary, maxLength);
  
  // Split data
  const combinedData = sequences.map((seq, i) => ({ seq, label: labels[i] }));
  const { train, test } = trainTestSplit(combinedData, 0.2);
  
  // Create 3D tensors for character-level CNN
  // Shape: [batchSize, sequenceLength, 1]
  const xTrain = tf.tensor3d(train.map(d => d.seq.map(c => [c])));
  const yTrain = tf.tensor2d(train.map(d => [d.label]));
  const xTest = tf.tensor3d(test.map(d => d.seq.map(c => [c])));
  const yTest = tf.tensor2d(test.map(d => [d.label]));
  
  return {
    xTrain,
    yTrain,
    xTest,
    yTest,
    metadata: {
      charVocabSize: vocabulary.size,
      maxLength,
      trainSize: train.length,
      testSize: test.length
    }
  };
}

/**
 * Extract URL features for lightweight model
 */
export function extractURLFeatures(url: string): number[] {
  const features: number[] = [];
  
  // Length features
  features.push(url.length / 100); // Normalized length
  features.push((url.match(/\./g) || []).length); // Dot count
  features.push((url.match(/-/g) || []).length); // Dash count
  features.push((url.match(/@/g) || []).length); // @ count
  features.push((url.match(/\d/g) || []).length); // Digit count
  
  // Protocol features
  features.push(url.startsWith('https://') ? 1 : 0);
  features.push(url.startsWith('http://') ? 1 : 0);
  
  // Suspicious patterns
  features.push(url.includes('login') ? 1 : 0);
  features.push(url.includes('verify') ? 1 : 0);
  features.push(url.includes('secure') ? 1 : 0);
  features.push(url.includes('account') ? 1 : 0);
  features.push(url.includes('update') ? 1 : 0);
  features.push(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(url) ? 1 : 0); // IP address
  
  return features;
}

/**
 * Convert URLs to feature tensors
 */
export function convertURLsToTensors(
  urls: string[],
  labels: number[]
): ProcessedData {
  const features = urls.map(url => extractURLFeatures(url));
  
  // Split data
  const combinedData = features.map((feat, i) => ({ feat, label: labels[i] }));
  const { train, test } = trainTestSplit(combinedData, 0.2);
  
  const xTrain = tf.tensor2d(train.map(d => d.feat));
  const yTrain = tf.tensor2d(train.map(d => [d.label]));
  const xTest = tf.tensor2d(test.map(d => d.feat));
  const yTest = tf.tensor2d(test.map(d => [d.label]));
  
  return {
    xTrain,
    yTrain,
    xTest,
    yTest,
    metadata: {
      vocabSize: 13, // Number of features
      maxLength: 13,
      trainSize: train.length,
      testSize: test.length
    }
  };
}

/**
 * Balance dataset (equal phishing and legitimate samples)
 */
export function balanceDataset(
  texts: string[],
  labels: number[]
): { texts: string[]; labels: number[] } {
  const phishing = texts.filter((_, i) => labels[i] === 1);
  const legitimate = texts.filter((_, i) => labels[i] === 0);
  
  const minCount = Math.min(phishing.length, legitimate.length);
  
  const balancedTexts = [
    ...phishing.slice(0, minCount),
    ...legitimate.slice(0, minCount)
  ];
  
  const balancedLabels = [
    ...Array(minCount).fill(1),
    ...Array(minCount).fill(0)
  ];
  
  // Shuffle
  const combined = balancedTexts.map((text, i) => ({ text, label: balancedLabels[i] }));
  combined.sort(() => Math.random() - 0.5);
  
  return {
    texts: combined.map(c => c.text),
    labels: combined.map(c => c.label)
  };
}
