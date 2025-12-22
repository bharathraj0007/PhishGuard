/**
 * Kaggle Dataset Fetcher Edge Function
 * Fetches datasets from Kaggle API for ML training
 */

interface KaggleDatasetRequest {
  datasetSlug: string; // e.g., "taruntiwarihp/phishing-site-urls"
  fileName?: string;
}

interface KaggleDatasetResponse {
  success: boolean;
  data?: string;
  error?: string;
  recordCount?: number;
}

// Popular public datasets (no auth required for downloads)
const PUBLIC_DATASETS = [
  {
    name: 'Phishing URLs',
    url: 'https://raw.githubusercontent.com/ebubekirbbr/pdd/master/input/phishing_site_urls.csv',
    type: 'url'
  },
  {
    name: 'Email Phishing',
    url: 'https://raw.githubusercontent.com/taruntiwarihp/Phishing-Dataset/master/email_phishing.csv',
    type: 'email'
  },
  {
    name: 'SMS Spam',
    url: 'https://raw.githubusercontent.com/justmarkham/DAT8/master/data/sms.tsv',
    type: 'sms'
  }
];

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json() as KaggleDatasetRequest;
    const { datasetSlug } = body;

    // Find matching public dataset
    const dataset = PUBLIC_DATASETS.find(d => 
      datasetSlug.toLowerCase().includes(d.type)
    );

    if (!dataset) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Dataset not found. Use: url, email, or sms' 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch dataset
    const response = await fetch(dataset.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.statusText}`);
    }

    const data = await response.text();
    const lines = data.split('\n').filter(line => line.trim());
    
    const result: KaggleDatasetResponse = {
      success: true,
      data,
      recordCount: lines.length - 1 // Exclude header
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error fetching dataset:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
