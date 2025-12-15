/**
 * Kaggle Dataset Populator Service
 * 
 * Programmatically populates the training_datasets and training_records tables
 * with phishing datasets sourced from Kaggle (URL, Email, SMS).
 * 
 * Assumes cleaned datasets are available in CSV/JSON format.
 */

import { createClient } from '@blinkdotnew/sdk';

const blink = createClient({
  projectId: 'phishguard-web-phishing-detector-eky2mdxr',
  authRequired: false
});

export interface DatasetRecord {
  type: 'url' | 'email' | 'sms';
  text: string;
  label: number; // 1 = phishing, 0 = legitimate
}

export interface DatasetMetadata {
  name: string;
  description: string;
  datasetType: 'url' | 'email' | 'sms';
  recordCount: number;
  uploadedBy: string;
}

/**
 * Parse CSV content into dataset records
 */
export function parseCSVToRecords(
  csvContent: string,
  type: 'url' | 'email' | 'sms'
): DatasetRecord[] {
  const lines = csvContent.trim().split('\n');
  const records: DatasetRecord[] = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle CSV with quotes and commas
    const parts = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
    
    if (parts.length >= 2) {
      const text = parts[0].replace(/^"|"$/g, '').trim();
      const labelStr = parts[1].replace(/^"|"$/g, '').trim();
      const label = parseInt(labelStr, 10);
      
      if (text && !isNaN(label)) {
        records.push({ type, text, label });
      }
    }
  }
  
  return records;
}

/**
 * Parse JSON content into dataset records
 */
export function parseJSONToRecords(
  jsonContent: string,
  type: 'url' | 'email' | 'sms'
): DatasetRecord[] {
  try {
    const data = JSON.parse(jsonContent);
    const records: DatasetRecord[] = [];
    
    // Handle array format
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.text && typeof item.label === 'number') {
          records.push({
            type: item.type || type,
            text: item.text,
            label: item.label
          });
        }
      }
    }
    
    return records;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    return [];
  }
}

/**
 * Populate training_datasets table with dataset metadata
 */
export async function createDataset(metadata: DatasetMetadata): Promise<string> {
  const dataset = await blink.db.trainingDatasets.create({
    id: `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: metadata.name,
    description: metadata.description,
    datasetType: metadata.datasetType,
    recordCount: metadata.recordCount,
    uploadedBy: metadata.uploadedBy,
    status: 'pending',
    isActive: 1,
    synced: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  return dataset.id;
}

/**
 * Populate training_records table with dataset records
 */
export async function populateTrainingRecords(
  datasetId: string,
  records: DatasetRecord[],
  batchSize: number = 100
): Promise<number> {
  let insertedCount = 0;
  
  // Insert records in batches to avoid memory issues
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const recordsToInsert = batch.map(record => ({
      id: `record_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      datasetId,
      content: record.text,
      scanType: record.type,
      isPhishing: record.label,
      threatLevel: record.label === 1 ? 'high' : 'safe',
      indicators: JSON.stringify([]),
      notes: '',
      synced: 1,
      createdAt: new Date().toISOString()
    }));
    
    await blink.db.trainingRecords.createMany(recordsToInsert);
    insertedCount += recordsToInsert.length;
    
    console.log(`Inserted ${insertedCount} / ${records.length} records`);
  }
  
  return insertedCount;
}

/**
 * Update dataset record count after population
 */
export async function updateDatasetCount(datasetId: string, count: number): Promise<void> {
  await blink.db.trainingDatasets.update(datasetId, {
    recordCount: count,
    status: 'active',
    updatedAt: new Date().toISOString()
  });
}

/**
 * Complete pipeline: Parse content and populate database
 */
export async function populateDatasetFromContent(
  content: string,
  format: 'csv' | 'json',
  metadata: DatasetMetadata
): Promise<{ datasetId: string; recordCount: number }> {
  console.log(`Starting dataset population: ${metadata.name}`);
  
  // Step 1: Parse content into records
  const records = format === 'csv'
    ? parseCSVToRecords(content, metadata.datasetType)
    : parseJSONToRecords(content, metadata.datasetType);
  
  if (records.length === 0) {
    throw new Error('No valid records found in the dataset');
  }
  
  console.log(`Parsed ${records.length} records from ${format.toUpperCase()}`);
  
  // Step 2: Create dataset metadata entry
  const datasetId = await createDataset({
    ...metadata,
    recordCount: records.length
  });
  
  console.log(`Created dataset: ${datasetId}`);
  
  // Step 3: Populate training records
  const insertedCount = await populateTrainingRecords(datasetId, records);
  
  // Step 4: Update dataset with final count
  await updateDatasetCount(datasetId, insertedCount);
  
  console.log(`Dataset population complete: ${insertedCount} records inserted`);
  
  return { datasetId, recordCount: insertedCount };
}

/**
 * Sample Kaggle datasets for quick testing
 */
export const SAMPLE_DATASETS = {
  url: `text,label
http://example.com/login,0
http://phishing-site.com/secure-login,1
https://legitimate-bank.com,0
http://fake-paypal.com/verify,1
https://real-amazon.com,0`,
  
  email: `text,label
"Dear customer, your account is secure",0
"URGENT: Verify your account now or it will be closed",1
"Meeting scheduled for tomorrow at 10am",0
"You have won $1,000,000! Click here to claim",1
"Your invoice is attached",0`,
  
  sms: `text,label
"Your package will arrive tomorrow",0
"URGENT: Your bank account has been suspended. Click: bit.ly/abc123",1
"Reminder: Doctor appointment on Friday",0
"Congratulations! You've won a free iPhone. Claim now: evil.com",1
"Your verification code is 123456",0`
};

/**
 * Quick populate with sample datasets (for testing)
 */
export async function populateSampleDatasets(userId: string): Promise<void> {
  console.log('Populating sample datasets...');
  
  // URL Dataset
  await populateDatasetFromContent(
    SAMPLE_DATASETS.url,
    'csv',
    {
      name: 'Sample URL Phishing Dataset',
      description: 'Small sample dataset for URL phishing detection',
      datasetType: 'url',
      recordCount: 0,
      uploadedBy: userId
    }
  );
  
  // Email Dataset
  await populateDatasetFromContent(
    SAMPLE_DATASETS.email,
    'csv',
    {
      name: 'Sample Email Phishing Dataset',
      description: 'Small sample dataset for email phishing detection',
      datasetType: 'email',
      recordCount: 0,
      uploadedBy: userId
    }
  );
  
  // SMS Dataset
  await populateDatasetFromContent(
    SAMPLE_DATASETS.sms,
    'csv',
    {
      name: 'Sample SMS Phishing Dataset',
      description: 'Small sample dataset for SMS phishing detection',
      datasetType: 'sms',
      recordCount: 0,
      uploadedBy: userId
    }
  );
  
  console.log('Sample datasets populated successfully!');
}
