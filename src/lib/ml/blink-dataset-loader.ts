/**
 * Blink Database Dataset Loader
 * 
 * Loads training datasets from Blink AI database instead of external sources.
 * Fetches phishing detection datasets for URL, Email, SMS, and QR types.
 */

import { blink } from '../blink';

export interface BlinkDatasetRecord {
  id: string;
  content: string;
  scanType: 'url' | 'email' | 'sms' | 'qr';
  isPhishing: number; // 0 or 1
  threatLevel?: string;
  indicators?: string;
  notes?: string;
}

export interface ProcessedDataset {
  texts: string[];
  labels: number[];
  metadata: {
    totalSamples: number;
    phishingSamples: number;
    legitimateSamples: number;
    source: string;
    scanType: string;
  };
}

/**
 * Load training records from Blink database by scan type
 */
export async function loadTrainingDataFromDB(
  scanType: 'url' | 'email' | 'sms' | 'qr',
  limit?: number
): Promise<ProcessedDataset> {
  console.log(`📊 Loading ${scanType} training data from Blink database...`);

  try {
    // Query training_records table filtered by scan_type
    const query = limit 
      ? `SELECT * FROM training_records WHERE scan_type = '${scanType}' LIMIT ${limit}`
      : `SELECT * FROM training_records WHERE scan_type = '${scanType}'`;

    const result = await blink.db.sql<BlinkDatasetRecord>(query);
    
    const records = result.rows || [];
    console.log(`✅ Loaded ${records.length} ${scanType} records from database`);

    if (records.length === 0) {
      console.warn(`⚠️ No training data found for ${scanType}`);
      return {
        texts: [],
        labels: [],
        metadata: {
          totalSamples: 0,
          phishingSamples: 0,
          legitimateSamples: 0,
          source: 'blink-database',
          scanType
        }
      };
    }

    // Extract texts and labels
    const texts: string[] = [];
    const labels: number[] = [];
    let phishingCount = 0;
    let legitimateCount = 0;

    for (const record of records) {
      if (record.content && record.content.trim().length > 0) {
        texts.push(record.content);
        
        // SQLite returns as "0" or "1" string, convert to number
        const label = Number(record.isPhishing) > 0 ? 1 : 0;
        labels.push(label);

        if (label === 1) {
          phishingCount++;
        } else {
          legitimateCount++;
        }
      }
    }

    console.log(`📈 Processed: ${phishingCount} phishing, ${legitimateCount} legitimate samples`);

    return {
      texts,
      labels,
      metadata: {
        totalSamples: texts.length,
        phishingSamples: phishingCount,
        legitimateSamples: legitimateCount,
        source: 'blink-database',
        scanType
      }
    };
  } catch (error) {
    console.error(`❌ Error loading ${scanType} training data:`, error);
    throw new Error(`Failed to load training data from database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load all available training datasets from database
 */
export async function loadAllTrainingData(): Promise<Map<string, ProcessedDataset>> {
  const datasets = new Map<string, ProcessedDataset>();
  
  const scanTypes: ('url' | 'email' | 'sms' | 'qr')[] = ['url', 'email', 'sms', 'qr'];

  for (const scanType of scanTypes) {
    try {
      const dataset = await loadTrainingDataFromDB(scanType);
      if (dataset.texts.length > 0) {
        datasets.set(scanType, dataset);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load ${scanType} dataset:`, error);
    }
  }

  return datasets;
}

/**
 * Get dataset statistics from database
 */
export async function getDatasetStatistics(scanType?: string) {
  try {
    const query = scanType
      ? `SELECT 
          scan_type,
          COUNT(*) as total,
          SUM(CASE WHEN is_phishing = 1 THEN 1 ELSE 0 END) as phishing_count,
          SUM(CASE WHEN is_phishing = 0 THEN 1 ELSE 0 END) as legitimate_count
         FROM training_records 
         WHERE scan_type = '${scanType}'
         GROUP BY scan_type`
      : `SELECT 
          scan_type,
          COUNT(*) as total,
          SUM(CASE WHEN is_phishing = 1 THEN 1 ELSE 0 END) as phishing_count,
          SUM(CASE WHEN is_phishing = 0 THEN 1 ELSE 0 END) as legitimate_count
         FROM training_records 
         GROUP BY scan_type`;

    const result = await blink.db.sql<{
      scan_type: string;
      total: number;
      phishing_count: number;
      legitimate_count: number;
    }>(query);

    return result.rows || [];
  } catch (error) {
    console.error('Error fetching dataset statistics:', error);
    return [];
  }
}

/**
 * Load training datasets uploaded by user/admin
 */
export async function loadUploadedDatasets(datasetType: string) {
  try {
    const result = await blink.db.sql<{
      id: string;
      name: string;
      dataset_type: string;
      record_count: number;
      status: string;
    }>(`
      SELECT id, name, dataset_type, record_count, status 
      FROM training_datasets 
      WHERE dataset_type = '${datasetType}' 
        AND status = 'active'
        AND is_active = 1
      ORDER BY created_at DESC
    `);

    return result.rows || [];
  } catch (error) {
    console.error('Error loading uploaded datasets:', error);
    return [];
  }
}

/**
 * Fetch records from a specific uploaded dataset
 */
export async function loadDatasetRecords(datasetId: string): Promise<ProcessedDataset> {
  try {
    const result = await blink.db.sql<BlinkDatasetRecord>(`
      SELECT * FROM training_records WHERE dataset_id = '${datasetId}'
    `);

    const records = result.rows || [];
    
    const texts: string[] = [];
    const labels: number[] = [];
    let phishingCount = 0;
    let legitimateCount = 0;
    let scanType = 'unknown';

    for (const record of records) {
      if (record.content) {
        texts.push(record.content);
        const label = Number(record.isPhishing) > 0 ? 1 : 0;
        labels.push(label);

        if (label === 1) phishingCount++;
        else legitimateCount++;

        if (scanType === 'unknown' && record.scanType) {
          scanType = record.scanType;
        }
      }
    }

    return {
      texts,
      labels,
      metadata: {
        totalSamples: texts.length,
        phishingSamples: phishingCount,
        legitimateSamples: legitimateCount,
        source: `blink-database-${datasetId}`,
        scanType
      }
    };
  } catch (error) {
    console.error('Error loading dataset records:', error);
    throw error;
  }
}

/**
 * Shuffle dataset arrays
 */
export function shuffleDataset(dataset: ProcessedDataset): ProcessedDataset {
  const indices = Array.from({ length: dataset.texts.length }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  return {
    texts: indices.map(i => dataset.texts[i]),
    labels: indices.map(i => dataset.labels[i]),
    metadata: dataset.metadata
  };
}

/**
 * Split dataset into train and test sets
 */
export function splitDataset(
  dataset: ProcessedDataset,
  testRatio: number = 0.2
): { train: ProcessedDataset; test: ProcessedDataset } {
  const shuffled = shuffleDataset(dataset);
  const splitIndex = Math.floor(shuffled.texts.length * (1 - testRatio));

  const trainTexts = shuffled.texts.slice(0, splitIndex);
  const trainLabels = shuffled.labels.slice(0, splitIndex);
  const testTexts = shuffled.texts.slice(splitIndex);
  const testLabels = shuffled.labels.slice(splitIndex);

  const trainPhishing = trainLabels.filter(l => l === 1).length;
  const testPhishing = testLabels.filter(l => l === 1).length;

  return {
    train: {
      texts: trainTexts,
      labels: trainLabels,
      metadata: {
        totalSamples: trainTexts.length,
        phishingSamples: trainPhishing,
        legitimateSamples: trainTexts.length - trainPhishing,
        source: dataset.metadata.source,
        scanType: dataset.metadata.scanType
      }
    },
    test: {
      texts: testTexts,
      labels: testLabels,
      metadata: {
        totalSamples: testTexts.length,
        phishingSamples: testPhishing,
        legitimateSamples: testTexts.length - testPhishing,
        source: dataset.metadata.source,
        scanType: dataset.metadata.scanType
      }
    }
  };
}

/**
 * Balance dataset to have equal phishing and legitimate samples
 */
export function balanceDataset(dataset: ProcessedDataset): ProcessedDataset {
  const phishingIndices: number[] = [];
  const legitimateIndices: number[] = [];

  dataset.labels.forEach((label, idx) => {
    if (label === 1) {
      phishingIndices.push(idx);
    } else {
      legitimateIndices.push(idx);
    }
  });

  const minCount = Math.min(phishingIndices.length, legitimateIndices.length);

  // Randomly sample to balance
  const shuffledPhishing = phishingIndices
    .sort(() => Math.random() - 0.5)
    .slice(0, minCount);
  const shuffledLegitimate = legitimateIndices
    .sort(() => Math.random() - 0.5)
    .slice(0, minCount);

  const balancedIndices = [...shuffledPhishing, ...shuffledLegitimate]
    .sort(() => Math.random() - 0.5);

  return {
    texts: balancedIndices.map(i => dataset.texts[i]),
    labels: balancedIndices.map(i => dataset.labels[i]),
    metadata: {
      ...dataset.metadata,
      totalSamples: balancedIndices.length,
      phishingSamples: minCount,
      legitimateSamples: minCount
    }
  };
}
