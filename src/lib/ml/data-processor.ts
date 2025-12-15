/**
 * Data Processor for PhishGuard ML Training
 * 
 * Handles CSV parsing, data preprocessing, and dataset preparation
 */

export interface EmailRecord {
  text: string;
  label: number; // 0 = safe, 1 = phishing
  source?: string;
}

export interface DatasetInfo {
  totalRecords: number;
  phishingCount: number;
  safeCount: number;
  sources: string[];
}

export class DataProcessor {
  /**
   * Parse CSV data from various phishing email datasets
   */
  static parseCSV(csvContent: string, datasetName: string): EmailRecord[] {
    const lines = csvContent.split('\n');
    const records: EmailRecord[] = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Handle different CSV formats
        const record = this.parseCSVLine(line, datasetName);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        console.warn(`Failed to parse line ${i}:`, error);
      }
    }

    return records;
  }

  /**
   * Parse a single CSV line based on dataset format
   */
  private static parseCSVLine(line: string, datasetName: string): EmailRecord | null {
    // Different datasets have different formats
    switch (datasetName.toLowerCase()) {
      case 'spamassassin':
      case 'enron':
        return this.parseEnronFormat(line);
      
      case 'ling':
      case 'nazario':
        return this.parseNazarioFormat(line);
      
      case 'nigerian_fraud':
        return this.parseNigerianFraudFormat(line);
      
      default:
        return this.parseGenericFormat(line);
    }
  }

  /**
   * Parse Enron/SpamAssassin format: text,label
   */
  private static parseEnronFormat(line: string): EmailRecord | null {
    const parts = this.splitCSVLine(line);
    if (parts.length < 2) return null;

    const text = parts[0];
    const labelStr = parts[1].toLowerCase();
    
    // Labels can be: spam/ham, phishing/safe, 1/0
    const label = ['spam', 'phishing', '1', 'yes', 'true'].includes(labelStr) ? 1 : 0;

    return { text, label, source: 'enron' };
  }

  /**
   * Parse Nazario format: subject,body,label
   */
  private static parseNazarioFormat(line: string): EmailRecord | null {
    const parts = this.splitCSVLine(line);
    if (parts.length < 3) return null;

    const subject = parts[0];
    const body = parts[1];
    const labelStr = parts[2].toLowerCase();
    
    const text = `${subject}\n\n${body}`;
    const label = ['spam', 'phishing', '1', 'yes', 'true'].includes(labelStr) ? 1 : 0;

    return { text, label, source: 'nazario' };
  }

  /**
   * Parse Nigerian Fraud format (typically all phishing)
   */
  private static parseNigerianFraudFormat(line: string): EmailRecord | null {
    const parts = this.splitCSVLine(line);
    if (parts.length < 1) return null;

    const text = parts[0];
    
    // Nigerian fraud emails are all phishing
    return { text, label: 1, source: 'nigerian_fraud' };
  }

  /**
   * Parse generic CSV format
   */
  private static parseGenericFormat(line: string): EmailRecord | null {
    const parts = this.splitCSVLine(line);
    if (parts.length < 2) return null;

    return {
      text: parts[0],
      label: parseInt(parts[1]) || 0,
      source: 'generic'
    };
  }

  /**
   * Split CSV line handling quoted fields
   */
  private static splitCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      result.push(current.trim());
    }

    return result;
  }

  /**
   * Clean and preprocess text
   */
  static preprocessText(text: string): string {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ').trim();

    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');

    // Remove URLs (but keep mention that URL existed)
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, '[URL]');

    // Remove email addresses
    cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

    // Normalize special characters
    cleaned = cleaned.replace(/[^\w\s.,!?-]/g, '');

    // Limit length
    if (cleaned.length > 5000) {
      cleaned = cleaned.substring(0, 5000);
    }

    return cleaned;
  }

  /**
   * Split dataset into training and test sets
   */
  static splitDataset(
    records: EmailRecord[],
    testRatio: number = 0.2
  ): { train: EmailRecord[], test: EmailRecord[] } {
    // Shuffle records
    const shuffled = [...records].sort(() => Math.random() - 0.5);

    const splitIndex = Math.floor(shuffled.length * (1 - testRatio));

    return {
      train: shuffled.slice(0, splitIndex),
      test: shuffled.slice(splitIndex)
    };
  }

  /**
   * Balance dataset (ensure equal phishing/safe samples)
   */
  static balanceDataset(records: EmailRecord[]): EmailRecord[] {
    const phishing = records.filter(r => r.label === 1);
    const safe = records.filter(r => r.label === 0);

    const minCount = Math.min(phishing.length, safe.length);

    // Randomly sample to balance
    const balancedPhishing = this.randomSample(phishing, minCount);
    const balancedSafe = this.randomSample(safe, minCount);

    return [...balancedPhishing, ...balancedSafe].sort(() => Math.random() - 0.5);
  }

  /**
   * Randomly sample n records
   */
  private static randomSample<T>(array: T[], n: number): T[] {
    const shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  /**
   * Get dataset statistics
   */
  static getDatasetInfo(records: EmailRecord[]): DatasetInfo {
    const phishingCount = records.filter(r => r.label === 1).length;
    const safeCount = records.filter(r => r.label === 0).length;
    const sources = [...new Set(records.map(r => r.source).filter(Boolean))];

    return {
      totalRecords: records.length,
      phishingCount,
      safeCount,
      sources: sources as string[]
    };
  }

  /**
   * Merge multiple datasets
   */
  static mergeDatasets(...datasets: EmailRecord[][]): EmailRecord[] {
    return datasets.flat();
  }

  /**
   * Load CSV file from URL
   */
  static async loadCSVFromURL(url: string, datasetName: string): Promise<EmailRecord[]> {
    try {
      const response = await fetch(url);
      const csvContent = await response.text();
      return this.parseCSV(csvContent, datasetName);
    } catch (error) {
      console.error(`Failed to load CSV from ${url}:`, error);
      return [];
    }
  }

  /**
   * Export records to CSV format
   */
  static exportToCSV(records: EmailRecord[]): string {
    const lines = ['text,label,source'];

    for (const record of records) {
      const text = `"${record.text.replace(/"/g, '""')}"`;
      const label = record.label;
      const source = record.source || 'unknown';
      
      lines.push(`${text},${label},${source}`);
    }

    return lines.join('\n');
  }

  /**
   * Create training batches
   */
  static createBatches(records: EmailRecord[], batchSize: number): EmailRecord[][] {
    const batches: EmailRecord[][] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * Augment dataset with variations (for better generalization)
   */
  static augmentDataset(records: EmailRecord[]): EmailRecord[] {
    const augmented: EmailRecord[] = [...records];

    // Add lowercase versions
    for (const record of records) {
      if (Math.random() > 0.5) {
        augmented.push({
          text: record.text.toLowerCase(),
          label: record.label,
          source: record.source
        });
      }
    }

    return augmented;
  }
}
