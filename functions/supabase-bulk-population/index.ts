const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Helper functions
function generateId(prefix = 'rec') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateEmail() {
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com', 'test.com'];
  const names = ['john', 'jane', 'alex', 'taylor', 'casey', 'morgan', 'jordan', 'sam', 'chris', 'pat'];
  const name = names[Math.floor(Math.random() * names.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const suffix = Math.floor(Math.random() * 10000);
  return `${name}${suffix}@${domain}`;
}

function generateDisplayName() {
  const firstNames = ['John', 'Jane', 'Alex', 'Taylor', 'Casey', 'Morgan', 'Jordan', 'Sam', 'Chris', 'Pat'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez'];
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

const phishingIndicators = {
  url: ['suspicious_domain', 'typosquatting', 'ip_address', 'url_shortener', 'encoded_characters'],
  email: ['generic_greeting', 'urgent_language', 'sender_mismatch', 'suspicious_links', 'request_credentials'],
  sms: ['suspicious_url', 'urgent_action', 'verification_request', 'account_suspension', 'unrecognized_sender'],
  qr: ['suspicious_destination', 'shortened_url', 'tracking_parameters', 'phishing_domain', 'unusual_encoding']
};

const threatLevels = ['low', 'medium', 'high', 'critical'];
const scanTypes = ['url', 'email', 'sms', 'qr'];

function generatePhishingData(scanType: string) {
  const suspiciousDomains = ['gogle-verify.com', 'micros0ft-account.net', 'appl-security.xyz', 'amaz0n-login.tk'];
  const legitimateDomains = ['google.com', 'microsoft.com', 'apple.com', 'amazon.com'];

  const dataMap: Record<string, () => string> = {
    url: () => {
      const domain = Math.random() > 0.5
        ? suspiciousDomains[Math.floor(Math.random() * suspiciousDomains.length)]
        : legitimateDomains[Math.floor(Math.random() * legitimateDomains.length)];
      return `https://${domain}/login?token=${Math.random().toString(36).substring(7)}`;
    },
    email: () => JSON.stringify({
      from: `support@${suspiciousDomains[Math.floor(Math.random() * suspiciousDomains.length)]}`,
      subject: 'URGENT: Verify your account',
      body: 'Click to verify your identity immediately'
    }),
    sms: () => 'URGENT: Verify now https://verify.tk - Account suspended',
    qr: () => `https://${suspiciousDomains[Math.floor(Math.random() * suspiciousDomains.length)]}/verify`
  };

  return dataMap[scanType]?.() || '';
}

async function makeSupabaseRequest(method: string, table: string, data: unknown) {
  const url = `${supabaseUrl}/rest/v1/${table}`;
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Supabase error (${response.status}): ${error}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error in ${method} ${table}:`, error);
    throw error;
  }
}

async function populateUsers(count = 25) {
  console.log(`Creating ${count} test users...`);
  const users = [];
  
  for (let i = 0; i < count; i++) {
    users.push({
      id: generateId('user'),
      email: generateEmail(),
      display_name: generateDisplayName(),
      email_verified: 1,
      password_hash: btoa('password123'),
      role: Math.random() > 0.8 ? 'admin' : 'user',
      is_active: 1,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  try {
    const data = await makeSupabaseRequest('POST', 'users', users);
    console.log(`✓ Created ${data?.length || users.length} users`);
    return data || users;
  } catch (error) {
    console.error('Error creating users:', error);
    return [];
  }
}

async function populatePhishingScans(users: any[], count = 400) {
  console.log(`Creating ${count} phishing scans...`);
  const scans = [];

  for (let i = 0; i < count; i++) {
    const scanType = scanTypes[Math.floor(Math.random() * scanTypes.length)];
    const isPhishing = Math.random() > 0.4;
    const threatLevel = isPhishing ? threatLevels[Math.floor(Math.random() * threatLevels.length)] : 'low';
    const confidence = isPhishing ? 0.7 + Math.random() * 0.3 : 0.1 + Math.random() * 0.3;
    
    const indicatorPool = phishingIndicators[scanType as keyof typeof phishingIndicators] || [];
    const selectedIndicators = indicatorPool
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 2);

    scans.push({
      id: generateId('scan'),
      user_id: users[Math.floor(Math.random() * users.length)]?.id || users[0]?.id || generateId('user'),
      scan_type: scanType,
      content: generatePhishingData(scanType),
      threat_level: threatLevel,
      confidence: parseFloat(confidence.toFixed(2)),
      indicators: JSON.stringify(selectedIndicators),
      analysis: JSON.stringify({
        verdict: isPhishing ? 'PHISHING' : 'LEGITIMATE',
        details: `Analysis shows ${selectedIndicators.length} suspicious indicators`,
        recommendations: isPhishing ? ['Avoid clicking links', 'Report to provider'] : []
      }),
      is_deleted: 0,
      synced: 1,
      created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  try {
    const data = await makeSupabaseRequest('POST', 'phishing_scans', scans);
    console.log(`✓ Created ${data?.length || scans.length} phishing scans`);
  } catch (error) {
    console.error('Error creating phishing scans:', error);
  }
}

async function populateTrainingDatasets(users: any[], count = 8) {
  console.log(`Creating ${count} training datasets...`);
  const datasets = [];
  const datasetTypes = ['url', 'email', 'sms', 'qr'];

  for (let i = 0; i < count; i++) {
    const datasetType = datasetTypes[i % datasetTypes.length];
    datasets.push({
      id: generateId('dataset'),
      name: `${datasetType.toUpperCase()} Training Dataset v${Math.floor(i / 4) + 1}`,
      description: `Comprehensive training dataset for ${datasetType} phishing detection`,
      dataset_type: datasetType,
      record_count: 500 + Math.floor(Math.random() * 500),
      uploaded_by: users[Math.floor(Math.random() * users.length)]?.id || users[0]?.id || generateId('user'),
      status: 'active',
      is_active: 1,
      synced: 1,
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  try {
    const data = await makeSupabaseRequest('POST', 'training_datasets', datasets);
    console.log(`✓ Created ${data?.length || datasets.length} training datasets`);
    return data || datasets;
  } catch (error) {
    console.error('Error creating training datasets:', error);
    return [];
  }
}

async function populateTrainingRecords(datasets: any[], count = 2500) {
  console.log(`Creating ${count} training records...`);
  const records = [];
  
  for (let i = 0; i < count; i++) {
    const dataset = datasets[Math.floor(Math.random() * datasets.length)];
    if (!dataset?.id) continue;
    
    const isPhishing = Math.random() > 0.4;
    const threatLevel = isPhishing ? threatLevels[Math.floor(Math.random() * threatLevels.length)] : 'low';
    
    const indicatorPool = phishingIndicators[dataset.dataset_type as keyof typeof phishingIndicators] || [];
    const selectedIndicators = indicatorPool
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 3) + 1);

    records.push({
      id: generateId('trec'),
      dataset_id: dataset.id,
      content: generatePhishingData(dataset.dataset_type || 'url'),
      scan_type: dataset.dataset_type || 'url',
      is_phishing: isPhishing ? 1 : 0,
      threat_level: threatLevel,
      indicators: JSON.stringify(selectedIndicators),
      notes: isPhishing ? 'Contains phishing indicators' : 'Legitimate content',
      synced: 1,
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  // Insert in batches of 500
  let insertedCount = 0;
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500);
    try {
      const data = await makeSupabaseRequest('POST', 'training_records', batch);
      insertedCount += data?.length || batch.length;
    } catch (error) {
      console.error(`Error inserting batch ${i / 500}:`, error);
    }
  }

  console.log(`✓ Created ${insertedCount} training records`);
}

async function populateModelVersions(datasets: any[], users: any[], count = 8) {
  console.log(`Creating ${count} model versions...`);
  const modelVersions = [];
  const modelTypes = ['url', 'email', 'sms', 'qr'];

  for (let i = 0; i < count; i++) {
    const modelType = modelTypes[i % modelTypes.length];
    const matchingDataset = datasets.find(d => d.dataset_type === modelType);
    
    modelVersions.push({
      id: generateId('mv'),
      version_number: `${modelType}-v${Math.floor(i / 4) + 1}.0`,
      description: `${modelType.toUpperCase()} phishing detection model - version ${Math.floor(i / 4) + 1}`,
      model_type: modelType,
      training_dataset_id: matchingDataset?.id || null,
      training_started_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      training_completed_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      training_duration: Math.floor(Math.random() * 3600) + 300,
      status: 'active',
      is_active: i % 4 === 0 ? 1 : 0,
      metrics: JSON.stringify({
        accuracy: 0.85 + Math.random() * 0.14,
        precision: 0.87 + Math.random() * 0.12,
        recall: 0.83 + Math.random() * 0.16,
        f1_score: 0.85 + Math.random() * 0.14
      }),
      config: JSON.stringify({
        algorithm: modelType === 'sms' ? 'BiLSTM' : modelType === 'qr' ? 'CNN' : 'BERT',
        epochs: 50,
        batch_size: 32,
        learning_rate: 0.001
      }),
      created_by: users[Math.floor(Math.random() * users.length)]?.id || users[0]?.id || generateId('user'),
      synced: 1,
      created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  try {
    const data = await makeSupabaseRequest('POST', 'model_versions', modelVersions);
    console.log(`✓ Created ${data?.length || modelVersions.length} model versions`);
    return data || modelVersions;
  } catch (error) {
    console.error('Error creating model versions:', error);
    return [];
  }
}

async function populateModelTests(modelVersions: any[], datasets: any[], users: any[], count = 32) {
  console.log(`Creating ${count} model tests...`);
  const modelTests = [];
  const testTypes = ['accuracy', 'precision', 'recall', 'f1_score', 'adversarial', 'performance'];

  for (let i = 0; i < count; i++) {
    const modelVersion = modelVersions[Math.floor(Math.random() * modelVersions.length)];
    if (!modelVersion?.id) continue;
    
    const dataset = datasets.find(d => d.dataset_type === modelVersion.model_type);
    const testType = testTypes[Math.floor(Math.random() * testTypes.length)];
    const status = 'completed';

    modelTests.push({
      id: generateId('test'),
      model_version_id: modelVersion.id,
      test_name: `${testType} Test - Model ${modelVersion.version_number}`,
      test_dataset_id: dataset?.id || null,
      test_type: testType,
      status: status,
      results: JSON.stringify({
        passed: Math.random() > 0.1,
        threshold_met: Math.random() > 0.15,
        details: `Test completed successfully with ${(80 + Math.random() * 20).toFixed(2)}% score`
      }),
      metrics: JSON.stringify({
        test_accuracy: 0.82 + Math.random() * 0.17,
        false_positive_rate: 0.05 + Math.random() * 0.1,
        false_negative_rate: 0.08 + Math.random() * 0.12
      }),
      started_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000).toISOString(),
      created_by: users[Math.floor(Math.random() * users.length)]?.id || users[0]?.id || generateId('user'),
      synced: 1,
      created_at: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  try {
    const data = await makeSupabaseRequest('POST', 'model_tests', modelTests);
    console.log(`✓ Created ${data?.length || modelTests.length} model tests`);
  } catch (error) {
    console.error('Error creating model tests:', error);
  }
}

// Main handler
async function handler(req: Request) {
  try {
    console.log('Starting Supabase bulk population...\n');
    
    // Create users
    const users = await populateUsers(25);
    
    // Create datasets
    const datasets = await populateTrainingDatasets(users, 8);
    
    // Create phishing scans
    await populatePhishingScans(users, 400);
    
    // Create training records
    await populateTrainingRecords(datasets, 2500);
    
    // Create model versions
    const modelVersions = await populateModelVersions(datasets, users, 8);
    
    // Create model tests
    await populateModelTests(modelVersions, datasets, users, 32);

    console.log('\n✓ All data population completed successfully!');
    
    return new Response(
      JSON.stringify({
        message: 'Supabase bulk population completed',
        summary: {
          users: 25,
          datasets: 8,
          phishing_scans: 400,
          training_records: 2500,
          model_versions: 8,
          model_tests: 32
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error during population:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Export handler
export { handler };
