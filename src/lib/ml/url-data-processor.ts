/**
 * URL Data Processor
 * 
 * Processes CSV data from phishing URL datasets for Character-CNN training.
 * Handles multiple CSV formats and extracts URL features.
 */

import * as tf from '@tensorflow/tfjs';

export interface URLRecord {
  url: string;
  isPhishing: boolean;
  sourceDataset?: string;
}

export interface URLDatasetInfo {
  name: string;
  description: string;
  totalRecords: number;
  phishingCount: number;
  legitimateCount: number;
  minUrlLength: number;
  maxUrlLength: number;
}

export interface CharacterTokenizer {
  vocab: Map<string, number>;
  maxLength: number;
  encode(url: string): number[];
  decode(encoded: number[]): string;
}

export class URLDataProcessor {
  private vocab: Map<string, number> = new Map();
  private reverseVocab: Map<number, string> = new Map();
  private maxUrlLength: number = 100;
  private readonly defaultCharset = 
    'abcdefghijklmnopqrstuvwxyz0123456789.-_/:?&=@%!+,;#$~()[]{}';

  constructor(maxUrlLength: number = 100, charset?: string) {
    this.maxUrlLength = maxUrlLength;
    this.initializeVocabulary(charset || this.defaultCharset);
  }

  /**
   * Initialize character vocabulary
   */
  private initializeVocabulary(charset: string): void {
    this.vocab.clear();
    this.reverseVocab.clear();

    // Add special tokens
    this.vocab.set('<PAD>', 0);
    this.vocab.set('<UNK>', 1);
    this.vocab.set('<START>', 2);
    this.vocab.set('<END>', 3);
    this.reverseVocab.set(0, '<PAD>');
    this.reverseVocab.set(1, '<UNK>');
    this.reverseVocab.set(2, '<START>');
    this.reverseVocab.set(3, '<END>');

    // Add characters from charset
    let idx = 4;
    for (const char of charset) {
      if (!this.vocab.has(char)) {
        this.vocab.set(char, idx);
        this.reverseVocab.set(idx, char);
        idx++;
      }
    }

    console.log(`[URLDataProcessor] Vocabulary initialized with ${this.vocab.size} characters`);
  }

  /**
   * Parse CSV data and extract URL records
   * Supports multiple CSV formats:
   * - Format 1: url, label (0=legitimate, 1=phishing)
   * - Format 2: url, is_phishing
   * - Format 3: content, ..., label/is_phishing columns
   */
  parseCSVData(csvText: string, sourceDataset: string = 'unknown'): URLRecord[] {
    const records: URLRecord[] = [];
    const lines = csvText.trim().split('\n');

    if (lines.length < 2) {
      console.warn('[URLDataProcessor] CSV has fewer than 2 lines');
      return records;
    }

    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    // Detect columns
    let urlIndex = -1;
    let labelIndex = -1;

    // Find URL column
    for (let i = 0; i < header.length; i++) {
      if (header[i].includes('url') || header[i].includes('domain')) {
        urlIndex = i;
        break;
      }
    }

    // Find label column (last column with label-like names)
    for (let i = header.length - 1; i >= 0; i--) {
      const col = header[i];
      if (col.includes('label') || col.includes('phishing') || col.includes('class') || 
          col.includes('is_phishing') || col === 'type') {
        labelIndex = i;
        break;
      }
    }

    if (urlIndex === -1) {
      console.warn('[URLDataProcessor] Could not find URL column in CSV');
      return records;
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        const cells = this.parseCSVLine(line);
        
        if (urlIndex >= cells.length) continue;

        const url = cells[urlIndex].trim().toLowerCase();
        if (!url || url.length < 5) continue;

        let isPhishing = false;
        if (labelIndex !== -1 && labelIndex < cells.length) {
          const label = cells[labelIndex].trim().toLowerCase();
          // Handle various phishing indicators
          isPhishing = label === '1' || label === 'true' || label === 'phishing' || 
                      label === 'malicious' || label === 'suspicious';
        }

        records.push({
          url,
          isPhishing,
          sourceDataset
        });
      } catch (e) {
        console.warn(`[URLDataProcessor] Error parsing line ${i}:`, e);
      }
    }

    console.log(`[URLDataProcessor] Parsed ${records.length} records from ${sourceDataset}`);
    return records;
  }

  /**
   * Handle CSV quoted fields
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  /**
   * Encode URL to character indices
   */
  encodeURL(url: string): number[] {
    const normalized = url.toLowerCase().substring(0, this.maxUrlLength);
    const encoded: number[] = [];

    for (const char of normalized) {
      const code = this.vocab.get(char) ?? this.vocab.get('<UNK>') ?? 1;
      encoded.push(code);
    }

    // Pad to fixed length
    while (encoded.length < this.maxUrlLength) {
      encoded.push(0); // PAD token
    }

    return encoded.slice(0, this.maxUrlLength);
  }

  /**
   * Decode character indices back to URL
   */
  decodeURL(encoded: number[]): string {
    let result = '';
    for (const code of encoded) {
      if (code > 3) { // Skip special tokens
        result += this.reverseVocab.get(code) || '';
      }
    }
    return result;
  }

  /**
   * Prepare data for training (X: URLs, y: Labels)
   */
  prepareTrainingData(records: URLRecord[]): { 
    X: tf.Tensor2D; 
    y: tf.Tensor1D;
    recordCount: number;
  } {
    const encodedURLs = records.map(r => this.encodeURL(r.url));
    const labels = records.map(r => r.isPhishing ? 1 : 0);

    const X = tf.tensor2d(encodedURLs, [records.length, this.maxUrlLength], 'int32');
    const y = tf.tensor1d(labels, 'int32');

    return { X, y, recordCount: records.length };
  }

  /**
   * Split data into training and validation sets
   */
  trainTestSplit(
    records: URLRecord[], 
    testRatio: number = 0.2
  ): {
    trainRecords: URLRecord[];
    testRecords: URLRecord[];
  } {
    // Shuffle records
    const shuffled = [...records].sort(() => Math.random() - 0.5);

    const splitIndex = Math.floor(shuffled.length * (1 - testRatio));
    return {
      trainRecords: shuffled.slice(0, splitIndex),
      testRecords: shuffled.slice(splitIndex)
    };
  }

  /**
   * Get dataset statistics
   */
  getDatasetInfo(records: URLRecord[], datasetName: string = 'Custom'): URLDatasetInfo {
    const phishingCount = records.filter(r => r.isPhishing).length;
    const legitimateCount = records.length - phishingCount;
    const urlLengths = records.map(r => r.url.length);

    return {
      name: datasetName,
      description: `Loaded from CSV with ${records.length} URLs`,
      totalRecords: records.length,
      phishingCount,
      legitimateCount,
      minUrlLength: Math.min(...urlLengths),
      maxUrlLength: Math.max(...urlLengths)
    };
  }

  /**
   * Merge multiple datasets
   */
  mergeDatasets(datasetsList: URLRecord[][]): URLRecord[] {
    return datasetsList.flat();
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.vocab.size;
  }

  /**
   * Get max URL length
   */
  getMaxURLLength(): number {
    return this.maxUrlLength;
  }

  /**
   * Get vocabulary for serialization
   */
  getVocabulary(): { vocab: Record<string, number>; maxLength: number } {
    const vocabObj: Record<string, number> = {};
    this.vocab.forEach((val, key) => {
      vocabObj[key] = val;
    });
    return { vocab: vocabObj, maxLength: this.maxUrlLength };
  }

  /**
   * Restore vocabulary from serialized format
   */
  restoreVocabulary(vocabData: { vocab: Record<string, number>; maxLength: number }): void {
    this.maxUrlLength = vocabData.maxLength;
    this.vocab.clear();
    this.reverseVocab.clear();

    Object.entries(vocabData.vocab).forEach(([char, code]) => {
      this.vocab.set(char, code);
      this.reverseVocab.set(code, char);
    });

    console.log(`[URLDataProcessor] Vocabulary restored with ${this.vocab.size} characters`);
  }

  /**
   * Detect phishing indicators in URL patterns
   */
  detectURLPatterns(url: string): {
    hasSuspiciousDomainLength: boolean;
    hasMultipleDots: boolean;
    hasIPAddress: boolean;
    hasHyphenInDomain: boolean;
    hasSpecialChars: boolean;
    hasLongSubdomain: boolean;
  } {
    const urlObj = this.parseURLComponents(url);
    const domain = urlObj.domain || '';
    const domainParts = domain.split('.');

    return {
      hasSuspiciousDomainLength: domain.length > 30,
      hasMultipleDots: domainParts.length > 3,
      hasIPAddress: /^\d+\.\d+\.\d+\.\d+/.test(url),
      hasHyphenInDomain: domain.includes('-'),
      hasSpecialChars: /[!@#$%^&*()+=\[\]{};':"\\|,.<>\/?]/.test(domain),
      hasLongSubdomain: domainParts[0]?.length > 20
    };
  }

  /**
   * Parse URL into components
   */
  private parseURLComponents(url: string): {
    protocol?: string;
    domain?: string;
    path?: string;
  } {
    try {
      // Add protocol if missing
      const fullURL = url.startsWith('http') ? url : `http://${url}`;
      const urlObj = new URL(fullURL);
      return {
        protocol: urlObj.protocol,
        domain: urlObj.hostname,
        path: urlObj.pathname
      };
    } catch {
      // Fallback parsing
      const parts = url.split('/');
      return {
        domain: parts[0],
        path: '/' + parts.slice(1).join('/')
      };
    }
  }
}

export default URLDataProcessor;
