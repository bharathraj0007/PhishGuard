/**
 * Kaggle Dataset Integration Service
 * Fetches and processes datasets from Kaggle for ML model training
 */

export interface KaggleDataset {
  name: string;
  url: string;
  type: 'url' | 'email' | 'sms' | 'qr';
  description: string;
}

// Popular Kaggle datasets for phishing detection
export const KAGGLE_DATASETS: KaggleDataset[] = [
  {
    name: 'Phishing Site URLs',
    url: 'https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls',
    type: 'url',
    description: 'Large dataset of phishing and legitimate URLs'
  },
  {
    name: 'Email Phishing Dataset',
    url: 'https://www.kaggle.com/datasets/subhajournal/phishingemails',
    type: 'email',
    description: 'Collection of phishing and legitimate emails'
  },
  {
    name: 'SMS Spam Collection',
    url: 'https://www.kaggle.com/datasets/uciml/sms-spam-collection-dataset',
    type: 'sms',
    description: 'SMS spam and ham messages'
  },
  {
    name: 'Phishing URLs Dataset',
    url: 'https://www.kaggle.com/datasets/sid321axn/malicious-urls-dataset',
    type: 'url',
    description: 'Malicious and benign URLs'
  }
];

export interface TrainingRecord {
  content: string;
  isPhishing: boolean;
  scanType: 'url' | 'email' | 'sms' | 'qr';
}

/**
 * Parse CSV data into training records
 */
export function parseCSVData(csvText: string, scanType: 'url' | 'email' | 'sms' | 'qr'): TrainingRecord[] {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const records: TrainingRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    
    // Try to extract content and label from various column names
    let content = '';
    let isPhishing = false;

    // Find content column (url, email, message, text, etc.)
    const contentIdx = headers.findIndex(h => 
      h.includes('url') || h.includes('email') || h.includes('message') || 
      h.includes('text') || h.includes('content') || h.includes('sms')
    );
    
    // Find label column (label, class, type, status, etc.)
    const labelIdx = headers.findIndex(h => 
      h.includes('label') || h.includes('class') || h.includes('type') || 
      h.includes('status') || h.includes('phishing') || h.includes('spam')
    );

    if (contentIdx !== -1 && contentIdx < values.length) {
      content = values[contentIdx].trim();
    } else if (values.length > 0) {
      content = values[0].trim();
    }

    if (labelIdx !== -1 && labelIdx < values.length) {
      const label = values[labelIdx].toLowerCase().trim();
      isPhishing = label.includes('phish') || label.includes('spam') || 
                   label.includes('malicious') || label.includes('bad') ||
                   label === '1' || label === 'true';
    } else if (values.length > 1) {
      const label = values[values.length - 1].toLowerCase().trim();
      isPhishing = label.includes('phish') || label.includes('spam') || 
                   label === '1' || label === 'true';
    }

    if (content) {
      records.push({ content, isPhishing, scanType });
    }
  }

  return records;
}

/**
 * Parse a CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current);
  return values.map(v => v.replace(/^"|"$/g, '').trim());
}

/**
 * Fetch dataset from URL (works with public CSV files)
 */
export async function fetchDatasetFromURL(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(`Error fetching dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Process Kaggle dataset for training
 */
export async function processKaggleDataset(
  datasetUrl: string, 
  scanType: 'url' | 'email' | 'sms' | 'qr'
): Promise<TrainingRecord[]> {
  const csvData = await fetchDatasetFromURL(datasetUrl);
  return parseCSVData(csvData, scanType);
}

/**
 * Sample datasets for each type (for demo/testing)
 */
export function generateSampleDataset(scanType: 'url' | 'email' | 'sms' | 'qr', count: number = 100): TrainingRecord[] {
  const records: TrainingRecord[] = [];
  
  const phishingExamples = {
    url: [
      'http://paypal-security-update.xyz/login',
      'https://amazon-prize-winner.com/claim',
      'http://bank-verify-account.net/secure',
      'https://microsoft-support-alert.com/fix',
      'http://netflix-billing-update.org/pay'
    ],
    email: [
      'Urgent: Your account will be suspended. Click here to verify.',
      'Congratulations! You won $1,000,000. Send your bank details.',
      'Security Alert: Unusual activity detected. Update password now.',
      'Your package is waiting. Pay customs fee to release.',
      'Free iPhone! Claim your prize by entering credit card.'
    ],
    sms: [
      'URGENT! Your bank account has been locked. Click: bit.ly/xyz123',
      'You won! Claim $5000 prize now: scam-link.com',
      'Your package is held. Pay $2.99 fee: fake-delivery.net',
      'Netflix: Payment failed. Update billing: phish-site.com',
      'IRS: You owe taxes. Pay immediately or face arrest: irs-fake.org'
    ],
    qr: [
      'http://fake-payment.com/qr/12345',
      'https://phishing-site.net/scan',
      'http://malicious-qr.xyz/redirect',
      'https://scam-payment.com/checkout',
      'http://fake-wifi-login.com/connect'
    ]
  };

  const legitimateExamples = {
    url: [
      'https://www.google.com',
      'https://github.com/explore',
      'https://www.wikipedia.org',
      'https://stackoverflow.com/questions',
      'https://www.reddit.com/r/programming'
    ],
    email: [
      'Your order #12345 has been shipped and will arrive tomorrow.',
      'Welcome to our newsletter! Here are this week\'s top articles.',
      'Meeting reminder: Team sync at 2 PM in Conference Room A.',
      'Your subscription has been renewed successfully.',
      'Thank you for your purchase. Your receipt is attached.'
    ],
    sms: [
      'Your verification code is: 123456',
      'Appointment reminder: Dental checkup tomorrow at 10 AM',
      'Your package has been delivered to your front door',
      'Bank alert: $50.00 withdrawal at ATM on Main St',
      'Your flight is on time. Gate: B12, Boarding: 3:30 PM'
    ],
    qr: [
      'https://www.example.com/menu',
      'https://maps.google.com/location',
      'https://linkedin.com/in/profile',
      'https://wifi-config.example.com',
      'https://ticket.example.com/event'
    ]
  };

  const phishing = phishingExamples[scanType];
  const legitimate = legitimateExamples[scanType];

  for (let i = 0; i < count; i++) {
    const isPhishing = i % 2 === 0; // 50/50 split
    const examples = isPhishing ? phishing : legitimate;
    const content = examples[Math.floor(Math.random() * examples.length)];
    
    records.push({
      content,
      isPhishing,
      scanType
    });
  }

  return records;
}
