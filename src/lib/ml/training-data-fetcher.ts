/**
 * Training Data Fetcher Service
 * 
 * Fetches records from training_datasets and training_records tables
 * and converts them into JavaScript arrays ready for ML training.
 */

import { createClient } from '@blinkdotnew/sdk';

const blink = createClient({
  projectId: 'phishguard-web-phishing-detector-eky2mdxr',
  authRequired: false
});

export interface TrainingRecord {
  id: string;
  datasetId: string;
  content: string;
  scanType: string;
  isPhishing: number;
  threatLevel: string | null;
  indicators: string | null;
  createdAt: string;
}

export interface TrainingDataset {
  id: string;
  name: string;
  description: string | null;
  datasetType: string;
  recordCount: number;
  status: string;
  isActive: number;
  createdAt: string;
}

export interface TrainingData {
  texts: string[];
  labels: number[];
  metadata: {
    datasetId: string;
    datasetName: string;
    datasetType: string;
    recordCount: number;
  };
}

/**
 * Fetch all active datasets from training_datasets table
 */
export async function fetchActiveDatasets(): Promise<TrainingDataset[]> {
  try {
    const datasets = await blink.db.trainingDatasets.list({
      where: {
        isActive: "1",
        status: "active"
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return datasets as unknown as TrainingDataset[];
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return [];
  }
}

/**
 * Fetch training records for a specific dataset
 */
export async function fetchDatasetRecords(
  datasetId: string,
  limit?: number
): Promise<TrainingRecord[]> {
  try {
    const query: any = {
      where: { datasetId },
      orderBy: { createdAt: 'asc' }
    };
    
    if (limit) {
      query.limit = limit;
    }
    
    const records = await blink.db.trainingRecords.list(query);
    
    return records as unknown as TrainingRecord[];
  } catch (error) {
    console.error('Error fetching records:', error);
    return [];
  }
}

/**
 * Fetch training records by scan type (url/email/sms)
 */
export async function fetchRecordsByScanType(
  scanType: 'url' | 'email' | 'sms',
  limit?: number
): Promise<TrainingRecord[]> {
  try {
    const query: any = {
      where: { scanType },
      orderBy: { createdAt: 'asc' }
    };
    
    if (limit) {
      query.limit = limit;
    }
    
    const records = await blink.db.trainingRecords.list(query);
    
    return records as unknown as TrainingRecord[];
  } catch (error) {
    console.error('Error fetching records by scan type:', error);
    return [];
  }
}

/**
 * Convert database records to training data arrays
 */
export function convertRecordsToTrainingData(
  records: TrainingRecord[],
  datasetInfo?: { id: string; name: string; type: string }
): TrainingData {
  const texts: string[] = [];
  const labels: number[] = [];
  
  for (const record of records) {
    texts.push(record.content);
    labels.push(Number(record.isPhishing) > 0 ? 1 : 0);
  }
  
  return {
    texts,
    labels,
    metadata: {
      datasetId: datasetInfo?.id || 'unknown',
      datasetName: datasetInfo?.name || 'Unknown Dataset',
      datasetType: datasetInfo?.type || 'unknown',
      recordCount: texts.length
    }
  };
}

/**
 * Fetch complete training data for a dataset (with conversion)
 */
export async function fetchTrainingDataForDataset(
  datasetId: string,
  limit?: number
): Promise<TrainingData | null> {
  try {
    // Fetch dataset metadata
    const dataset = await blink.db.trainingDatasets.get(datasetId);
    if (!dataset) {
      console.error('Dataset not found:', datasetId);
      return null;
    }
    
    // Fetch records
    const records = await fetchDatasetRecords(datasetId, limit);
    
    if (records.length === 0) {
      console.warn('No records found for dataset:', datasetId);
      return null;
    }
    
    // Convert to training data
    const trainingData = convertRecordsToTrainingData(records, {
      id: dataset.id,
      name: dataset.name,
      type: dataset.datasetType
    });
    
    return trainingData;
  } catch (error) {
    console.error('Error fetching training data:', error);
    return null;
  }
}

/**
 * Fetch training data by scan type (aggregated from all datasets)
 */
export async function fetchTrainingDataByScanType(
  scanType: 'url' | 'email' | 'sms',
  limit?: number
): Promise<TrainingData | null> {
  try {
    const records = await fetchRecordsByScanType(scanType, limit);
    
    if (records.length === 0) {
      console.warn('No records found for scan type:', scanType);
      return null;
    }
    
    const trainingData = convertRecordsToTrainingData(records, {
      id: 'aggregated',
      name: `Aggregated ${scanType.toUpperCase()} Dataset`,
      type: scanType
    });
    
    return trainingData;
  } catch (error) {
    console.error('Error fetching training data by scan type:', error);
    return null;
  }
}

/**
 * Get dataset statistics
 */
export async function getDatasetStatistics(datasetId: string): Promise<{
  totalRecords: number;
  phishingCount: number;
  legitimateCount: number;
  scanTypes: Record<string, number>;
}> {
  try {
    const records = await fetchDatasetRecords(datasetId);
    
    let phishingCount = 0;
    let legitimateCount = 0;
    const scanTypes: Record<string, number> = {};
    
    for (const record of records) {
      if (Number(record.isPhishing) > 0) {
        phishingCount++;
      } else {
        legitimateCount++;
      }
      
      scanTypes[record.scanType] = (scanTypes[record.scanType] || 0) + 1;
    }
    
    return {
      totalRecords: records.length,
      phishingCount,
      legitimateCount,
      scanTypes
    };
  } catch (error) {
    console.error('Error calculating dataset statistics:', error);
    return {
      totalRecords: 0,
      phishingCount: 0,
      legitimateCount: 0,
      scanTypes: {}
    };
  }
}

/**
 * Fetch all training data (all datasets combined)
 */
export async function fetchAllTrainingData(
  scanType?: 'url' | 'email' | 'sms',
  limit?: number
): Promise<TrainingData | null> {
  try {
    let records: TrainingRecord[];
    
    if (scanType) {
      records = await fetchRecordsByScanType(scanType, limit);
    } else {
      const query: any = {
        orderBy: { createdAt: 'asc' }
      };
      
      if (limit) {
        query.limit = limit;
      }
      
      records = await blink.db.trainingRecords.list(query) as unknown as TrainingRecord[];
    }
    
    if (records.length === 0) {
      return null;
    }
    
    return convertRecordsToTrainingData(records, {
      id: 'all',
      name: 'All Training Data',
      type: scanType || 'mixed'
    });
  } catch (error) {
    console.error('Error fetching all training data:', error);
    return null;
  }
}
