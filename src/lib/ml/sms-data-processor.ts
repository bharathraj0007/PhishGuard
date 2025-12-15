/**
 * SMS Data Processor for Phishing Detection
 * 
 * Handles loading, preprocessing, and augmentation of SMS datasets
 * Supports multiple CSV formats and produces balanced training datasets
 */

export interface SMSRecord {
  text: string
  label: string // 'ham' or 'spam'
  isPhishing: boolean
}

export interface DatasetStatistics {
  totalRecords: number
  phishingCount: number
  legitimateCount: number
  phishingPercentage: number
  averageLength: number
  minLength: number
  maxLength: number
}

export interface ProcessedDataset {
  records: SMSRecord[]
  statistics: DatasetStatistics
  format: string
}

export class SMSDataProcessor {
  /**
   * Parse CSV data from text
   */
  static parseCSV(csvText: string): string[][] {
    const lines = csvText.trim().split('\n')
    const result: string[][] = []

    for (const line of lines) {
      // Handle quoted fields that may contain commas
      const fields: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]

        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          fields.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }

      fields.push(current.trim())
      result.push(fields)
    }

    return result
  }

  /**
   * Detect CSV format and extract records
   */
  static detectFormatAndExtract(csvText: string): ProcessedDataset {
    const rows = this.parseCSV(csvText)

    if (rows.length === 0) {
      throw new Error('Empty CSV file')
    }

    const header = rows[0]
    let records: SMSRecord[] = []
    let format = 'unknown'

    // Format 1: v1 | v2 (label | text)
    if (header.length >= 2 && (header[0].toLowerCase() === 'v1' || header[0].toLowerCase().includes('label'))) {
      format = 'spam-v1'
      records = rows.slice(1).map((row) => {
        const label = row[0].toLowerCase().trim()
        const text = row.slice(1).join('|').trim() // Handle multi-column text

        return {
          text,
          label,
          isPhishing: label === 'spam'
        }
      })
    }
    // Format 2: target | text
    else if (header.length >= 2 && (header[0].toLowerCase() === 'target' || header[1].toLowerCase() === 'text')) {
      format = 'combined'
      records = rows.slice(1).map((row) => {
        const label = row[0].toLowerCase().trim()
        const text = row[1].trim()

        return {
          text,
          label,
          isPhishing: label === 'spam'
        }
      })
    }
    // Single column format
    else if (header.length === 1) {
      format = 'single-column'
      records = rows.slice(1).map((row) => {
        const text = row[0].trim()
        return {
          text,
          label: 'unknown',
          isPhishing: false
        }
      })
    } else {
      throw new Error(`Unknown CSV format. Headers: ${header.join(' | ')}`)
    }

    // Filter out empty records
    records = records.filter((r) => r.text && r.text.length > 0)

    const statistics = this.calculateStatistics(records)

    return {
      records,
      statistics,
      format
    }
  }

  /**
   * Calculate dataset statistics
   */
  static calculateStatistics(records: SMSRecord[]): DatasetStatistics {
    const lengths = records.map((r) => r.text.length)
    const phishingCount = records.filter((r) => r.isPhishing).length
    const legitimateCount = records.length - phishingCount

    return {
      totalRecords: records.length,
      phishingCount,
      legitimateCount,
      phishingPercentage: records.length > 0 ? (phishingCount / records.length) * 100 : 0,
      averageLength: lengths.reduce((a, b) => a + b, 0) / lengths.length || 0,
      minLength: Math.min(...lengths, 0),
      maxLength: Math.max(...lengths, 0)
    }
  }

  /**
   * Balance dataset using oversampling of minority class
   */
  static balanceDataset(records: SMSRecord[]): SMSRecord[] {
    const phishing = records.filter((r) => r.isPhishing)
    const legitimate = records.filter((r) => !r.isPhishing)

    // Oversample minority class to match majority class
    const targetSize = Math.max(phishing.length, legitimate.length)

    if (phishing.length < legitimate.length) {
      // Oversample phishing
      while (phishing.length < targetSize) {
        const randomIndex = Math.floor(Math.random() * phishing.length)
        phishing.push({ ...phishing[randomIndex] })
      }
    } else if (legitimate.length < phishing.length) {
      // Oversample legitimate
      while (legitimate.length < targetSize) {
        const randomIndex = Math.floor(Math.random() * legitimate.length)
        legitimate.push({ ...legitimate[randomIndex] })
      }
    }

    return [...phishing, ...legitimate].sort(() => Math.random() - 0.5)
  }

  /**
   * Augment SMS text with common variations
   */
  static augmentSMS(text: string): string[] {
    const variations = [text]

    // Variation 1: Replace common abbreviations
    let augmented1 = text
      .replace(/\bplz\b/gi, 'please')
      .replace(/\bthnx\b/gi, 'thanks')
      .replace(/\bu\b/gi, 'you')
      .replace(/\br\b/gi, 'are')
      .replace(/\blol\b/gi, 'laugh out loud')

    if (augmented1 !== text) variations.push(augmented1)

    // Variation 2: Normalize spaces and punctuation
    let augmented2 = text
      .replace(/\s+/g, ' ')
      .replace(/([!?.])\1+/g, '$1')
      .trim()

    if (augmented2 !== text) variations.push(augmented2)

    // Variation 3: Character case variations
    let augmented3 = text.toLowerCase()
    if (augmented3 !== text) variations.push(augmented3)

    return variations
  }

  /**
   * Split dataset into train/validation/test sets
   */
  static splitDataset(
    records: SMSRecord[],
    trainRatio: number = 0.7,
    valRatio: number = 0.15
  ): {
    train: SMSRecord[]
    validation: SMSRecord[]
    test: SMSRecord[]
  } {
    // Shuffle records
    const shuffled = [...records].sort(() => Math.random() - 0.5)

    const trainSize = Math.floor(shuffled.length * trainRatio)
    const valSize = Math.floor(shuffled.length * valRatio)

    return {
      train: shuffled.slice(0, trainSize),
      validation: shuffled.slice(trainSize, trainSize + valSize),
      test: shuffled.slice(trainSize + valSize)
    }
  }

  /**
   * Validate SMS records
   */
  static validateRecords(records: SMSRecord[]): { valid: SMSRecord[]; invalid: SMSRecord[] } {
    const valid: SMSRecord[] = []
    const invalid: SMSRecord[] = []

    for (const record of records) {
      if (record.text && record.text.length > 0 && record.text.length < 1000) {
        valid.push(record)
      } else {
        invalid.push(record)
      }
    }

    return { valid, invalid }
  }

  /**
   * Normalize SMS text
   */
  static normalizeSMS(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s!?.,&@#$%^*()_+=\-]/g, '') // Remove special characters except common ones
      .slice(0, 256) // Limit length
  }

  /**
   * Get common phishing indicators
   */
  static detectPhishingIndicators(text: string): string[] {
    const indicators: string[] = []
    const lowerText = text.toLowerCase()

    // Urgency indicators
    if (/urgent|immediate|act now|limited time|hurry|don't miss|click here|verify|confirm/i.test(lowerText)) {
      indicators.push('urgency')
    }

    // Financial/reward promises
    if (/win|prize|claim|reward|cash|free|bonus|refund|congratulations|selected/i.test(lowerText)) {
      indicators.push('financial_promise')
    }

    // Account verification
    if (/verify|confirm|update|reset password|login|account|suspended|compromised|security/i.test(lowerText)) {
      indicators.push('account_verification')
    }

    // Suspicious links
    if (/http|link|click|tap|visit|go to|bit\.ly|tinyurl/i.test(lowerText)) {
      indicators.push('suspicious_link')
    }

    // Requests for personal info
    if (/ssn|social security|credit card|password|pin|bank account|personal information|details/i.test(lowerText)) {
      indicators.push('personal_info_request')
    }

    // Misspellings and poor grammar (common in phishing)
    if (/recieve|recieved|occured|wiht|teh|vistit|paypel|amazin/i.test(lowerText)) {
      indicators.push('poor_grammar')
    }

    return indicators
  }

  /**
   * Merge multiple datasets
   */
  static mergeDatasets(datasets: ProcessedDataset[]): ProcessedDataset {
    const mergedRecords = datasets.flatMap((d) => d.records)
    const statistics = this.calculateStatistics(mergedRecords)

    return {
      records: mergedRecords,
      statistics,
      format: 'merged'
    }
  }

  /**
   * Create training batches
   */
  static createBatches(records: SMSRecord[], batchSize: number = 32): SMSRecord[][] {
    const batches: SMSRecord[][] = []

    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize))
    }

    return batches
  }
}

export default SMSDataProcessor
