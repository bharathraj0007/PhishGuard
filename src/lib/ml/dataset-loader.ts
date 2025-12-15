/**
 * Dataset Loader and Preprocessing Utilities
 * 
 * Handles loading and preprocessing datasets from:
 * - CSV files (local or remote)
 * - JSON files (local or remote)
 * - Browser File API (user uploads)
 * - Blink Storage URLs
 * 
 * Supports train/test split and data shuffling
 */

export interface DatasetRecord {
  text: string;
  label: number; // 0 = legitimate, 1 = phishing
}

export interface Dataset {
  texts: string[];
  labels: number[];
  metadata: {
    totalSamples: number;
    phishingSamples: number;
    legitimateSamples: number;
    source: string;
  };
}

export interface DatasetSplit {
  train: Dataset;
  test: Dataset;
}

/**
 * Load CSV dataset from text content
 */
export function parseCSV(csvText: string, textColumn: string = 'text', labelColumn: string = 'label'): Dataset {
  const lines = csvText.trim().split('\n');
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const textIdx = header.indexOf(textColumn.toLowerCase());
  const labelIdx = header.indexOf(labelColumn.toLowerCase());

  if (textIdx === -1) {
    throw new Error(`Column "${textColumn}" not found in CSV. Available: ${header.join(', ')}`);
  }

  if (labelIdx === -1) {
    throw new Error(`Column "${labelColumn}" not found in CSV. Available: ${header.join(', ')}`);
  }

  const texts: string[] = [];
  const labels: number[] = [];
  let phishingCount = 0;
  let legitimateCount = 0;

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(cell => cell.trim());
    
    if (row.length <= Math.max(textIdx, labelIdx)) {
      console.warn(`Skipping malformed row ${i + 1}`);
      continue;
    }

    const text = row[textIdx];
    const labelStr = row[labelIdx].toLowerCase();
    
    // Parse label (supports: 0/1, true/false, phishing/legitimate, spam/ham)
    let label: number;
    if (labelStr === '1' || labelStr === 'true' || labelStr === 'phishing' || labelStr === 'spam') {
      label = 1;
      phishingCount++;
    } else if (labelStr === '0' || labelStr === 'false' || labelStr === 'legitimate' || labelStr === 'ham') {
      label = 0;
      legitimateCount++;
    } else {
      console.warn(`Unknown label "${labelStr}" in row ${i + 1}, skipping`);
      continue;
    }

    if (text && text.length > 0) {
      texts.push(text);
      labels.push(label);
    }
  }

  return {
    texts,
    labels,
    metadata: {
      totalSamples: texts.length,
      phishingSamples: phishingCount,
      legitimateSamples: legitimateCount,
      source: 'csv'
    }
  };
}

/**
 * Load JSON dataset from text content
 */
export function parseJSON(jsonText: string, textField: string = 'text', labelField: string = 'label'): Dataset {
  let data: any;
  
  try {
    data = JSON.parse(jsonText);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  // Handle both array and object with data array
  const records = Array.isArray(data) ? data : (data.data || data.records || []);

  if (!Array.isArray(records)) {
    throw new Error('JSON must contain an array of records');
  }

  const texts: string[] = [];
  const labels: number[] = [];
  let phishingCount = 0;
  let legitimateCount = 0;

  for (const record of records) {
    const text = record[textField];
    const labelValue = record[labelField];

    if (!text || typeof text !== 'string') {
      continue;
    }

    // Parse label
    let label: number;
    if (typeof labelValue === 'number') {
      label = labelValue === 1 ? 1 : 0;
    } else if (typeof labelValue === 'string') {
      const labelStr = labelValue.toLowerCase();
      if (labelStr === '1' || labelStr === 'true' || labelStr === 'phishing' || labelStr === 'spam') {
        label = 1;
      } else {
        label = 0;
      }
    } else if (typeof labelValue === 'boolean') {
      label = labelValue ? 1 : 0;
    } else {
      continue;
    }

    texts.push(text);
    labels.push(label);

    if (label === 1) {
      phishingCount++;
    } else {
      legitimateCount++;
    }
  }

  return {
    texts,
    labels,
    metadata: {
      totalSamples: texts.length,
      phishingSamples: phishingCount,
      legitimateSamples: legitimateCount,
      source: 'json'
    }
  };
}

/**
 * Load dataset from File object (browser upload)
 */
export async function loadFromFile(file: File): Promise<Dataset> {
  const text = await file.text();
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return parseCSV(text);
  } else if (fileName.endsWith('.json')) {
    return parseJSON(text);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or JSON file.');
  }
}

/**
 * Load dataset from URL
 */
export async function loadFromURL(url: string): Promise<Dataset> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset: ${response.statusText}`);
  }

  const text = await response.text();
  const urlLower = url.toLowerCase();

  if (urlLower.endsWith('.csv')) {
    return parseCSV(text);
  } else if (urlLower.endsWith('.json')) {
    return parseJSON(text);
  } else {
    // Try to auto-detect
    try {
      return parseJSON(text);
    } catch {
      return parseCSV(text);
    }
  }
}

/**
 * Shuffle dataset
 */
export function shuffleDataset(dataset: Dataset): Dataset {
  const indices = Array.from({ length: dataset.texts.length }, (_, i) => i);
  
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const texts = indices.map(i => dataset.texts[i]);
  const labels = indices.map(i => dataset.labels[i]);

  return {
    texts,
    labels,
    metadata: { ...dataset.metadata }
  };
}

/**
 * Split dataset into train and test sets
 */
export function splitDataset(dataset: Dataset, testRatio: number = 0.2, shuffle: boolean = true): DatasetSplit {
  let data = dataset;

  if (shuffle) {
    data = shuffleDataset(dataset);
  }

  const splitIndex = Math.floor(data.texts.length * (1 - testRatio));

  const trainTexts = data.texts.slice(0, splitIndex);
  const trainLabels = data.labels.slice(0, splitIndex);
  const testTexts = data.texts.slice(splitIndex);
  const testLabels = data.labels.slice(splitIndex);

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
        source: data.metadata.source
      }
    },
    test: {
      texts: testTexts,
      labels: testLabels,
      metadata: {
        totalSamples: testTexts.length,
        phishingSamples: testPhishing,
        legitimateSamples: testTexts.length - testPhishing,
        source: data.metadata.source
      }
    }
  };
}

/**
 * Balance dataset (equal phishing and legitimate samples)
 */
export function balanceDataset(dataset: Dataset): Dataset {
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
  const shuffledPhishing = phishingIndices.sort(() => Math.random() - 0.5).slice(0, minCount);
  const shuffledLegitimate = legitimateIndices.sort(() => Math.random() - 0.5).slice(0, minCount);

  const balancedIndices = [...shuffledPhishing, ...shuffledLegitimate].sort(() => Math.random() - 0.5);

  const texts = balancedIndices.map(i => dataset.texts[i]);
  const labels = balancedIndices.map(i => dataset.labels[i]);

  return {
    texts,
    labels,
    metadata: {
      totalSamples: texts.length,
      phishingSamples: minCount,
      legitimateSamples: minCount,
      source: dataset.metadata.source
    }
  };
}

/**
 * Merge multiple datasets
 */
export function mergeDatasets(...datasets: Dataset[]): Dataset {
  const texts: string[] = [];
  const labels: number[] = [];
  let phishingCount = 0;
  let legitimateCount = 0;

  for (const dataset of datasets) {
    texts.push(...dataset.texts);
    labels.push(...dataset.labels);
    phishingCount += dataset.metadata.phishingSamples;
    legitimateCount += dataset.metadata.legitimateSamples;
  }

  return {
    texts,
    labels,
    metadata: {
      totalSamples: texts.length,
      phishingSamples: phishingCount,
      legitimateSamples: legitimateCount,
      source: 'merged'
    }
  };
}

/**
 * Get dataset statistics
 */
export function getDatasetStats(dataset: Dataset) {
  const avgLength = dataset.texts.reduce((sum, text) => sum + text.length, 0) / dataset.texts.length;
  const maxLength = Math.max(...dataset.texts.map(t => t.length));
  const minLength = Math.min(...dataset.texts.map(t => t.length));

  return {
    totalSamples: dataset.metadata.totalSamples,
    phishingSamples: dataset.metadata.phishingSamples,
    legitimateSamples: dataset.metadata.legitimateSamples,
    phishingRatio: dataset.metadata.phishingSamples / dataset.metadata.totalSamples,
    avgTextLength: Math.round(avgLength),
    maxTextLength: maxLength,
    minTextLength: minLength
  };
}

/**
 * Validate dataset
 */
export function validateDataset(dataset: Dataset): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (dataset.texts.length === 0) {
    errors.push('Dataset is empty');
  }

  if (dataset.texts.length !== dataset.labels.length) {
    errors.push('Texts and labels length mismatch');
  }

  if (dataset.metadata.phishingSamples === 0) {
    errors.push('No phishing samples found');
  }

  if (dataset.metadata.legitimateSamples === 0) {
    errors.push('No legitimate samples found');
  }

  const imbalanceRatio = Math.max(
    dataset.metadata.phishingSamples / dataset.metadata.legitimateSamples,
    dataset.metadata.legitimateSamples / dataset.metadata.phishingSamples
  );

  if (imbalanceRatio > 10) {
    errors.push(`Dataset is highly imbalanced (ratio: ${imbalanceRatio.toFixed(1)}:1). Consider balancing.`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
