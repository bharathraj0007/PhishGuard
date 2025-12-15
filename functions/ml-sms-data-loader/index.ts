import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

interface LoadDatasetRequest {
  csvUrl: string
  datasetName?: string
}

interface LoadDatasetResponse {
  success: boolean
  datasetName: string
  totalRecords: number
  phishingCount: number
  legitimateCount: number
  phishingPercentage: number
  averageLength: number
  minLength: number
  maxLength: number
  sampleRecords: Array<{ text: string; label: string }>
  message: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
}

/**
 * Parse CSV data from text content
 */
function parseCSV(csvText: string): string[][] {
  const lines = csvText.trim().split('\n')
  const result: string[][] = []

  for (const line of lines) {
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
function processCSVData(csvText: string): {
  records: Array<{ text: string; label: string; isPhishing: boolean }>
  format: string
} {
  const rows = parseCSV(csvText)

  if (rows.length === 0) {
    throw new Error('Empty CSV file')
  }

  const header = rows[0]
  let records: Array<{ text: string; label: string; isPhishing: boolean }> = []
  let format = 'unknown'

  // Format 1: v1 | v2 (label | text) - spam.csv
  if (header.length >= 2 && (header[0].toLowerCase() === 'v1' || header[0].toLowerCase().includes('label'))) {
    format = 'spam-v1'
    records = rows
      .slice(1)
      .filter((row) => row.length >= 2)
      .map((row) => {
        const label = row[0].toLowerCase().trim()
        const text = row.slice(1).join('|').trim()

        return {
          text,
          label,
          isPhishing: label === 'spam'
        }
      })
  }
  // Format 2: target | text - combined_dataset.csv
  else if (header.length >= 2 && (header[0].toLowerCase() === 'target' || header[1].toLowerCase() === 'text')) {
    format = 'combined'
    records = rows
      .slice(1)
      .filter((row) => row.length >= 2)
      .map((row) => {
        const label = row[0].toLowerCase().trim()
        const text = row[1].trim()

        return {
          text,
          label,
          isPhishing: label === 'spam'
        }
      })
  }

  // Filter out empty records
  records = records.filter((r) => r.text && r.text.length > 0)

  return { records, format }
}

/**
 * Calculate dataset statistics
 */
function calculateStatistics(
  records: Array<{ text: string; label: string; isPhishing: boolean }>
): {
  totalRecords: number
  phishingCount: number
  legitimateCount: number
  phishingPercentage: number
  averageLength: number
  minLength: number
  maxLength: number
} {
  const lengths = records.map((r) => r.text.length)
  const phishingCount = records.filter((r) => r.isPhishing).length
  const legitimateCount = records.length - phishingCount

  return {
    totalRecords: records.length,
    phishingCount,
    legitimateCount,
    phishingPercentage: records.length > 0 ? (phishingCount / records.length) * 100 : 0,
    averageLength: lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0,
    minLength: Math.min(...lengths, 0),
    maxLength: Math.max(...lengths, 0)
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }

  try {
    const body: LoadDatasetRequest = await req.json()
    const { csvUrl, datasetName = 'SMS Dataset' } = body

    if (!csvUrl) {
      return new Response(JSON.stringify({ error: 'csvUrl is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // Fetch CSV file
    console.log(`Fetching CSV from: ${csvUrl}`)
    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.statusText}`)
    }

    const csvText = await response.text()
    console.log(`CSV size: ${csvText.length} bytes`)

    // Process CSV data
    const { records, format } = processCSVData(csvText)
    console.log(`Detected format: ${format}, records: ${records.length}`)

    // Calculate statistics
    const stats = calculateStatistics(records)

    // Get sample records (first 5 of each class)
    const phishingSamples = records.filter((r) => r.isPhishing).slice(0, 3)
    const legitimateSamples = records.filter((r) => !r.isPhishing).slice(0, 2)
    const sampleRecords = [...phishingSamples, ...legitimateSamples]

    const result: LoadDatasetResponse = {
      success: true,
      datasetName,
      ...stats,
      sampleRecords: sampleRecords.map((r) => ({
        text: r.text.substring(0, 100),
        label: r.label
      })),
      message: `Successfully loaded ${stats.totalRecords} SMS records from ${format} format`
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  } catch (error) {
    console.error('Error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
}

serve(handler)
