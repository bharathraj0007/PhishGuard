import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlinkRecord {
  [key: string]: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const blinkSecretKey = Deno.env.get('BLINK_SECRET_KEY')!;
    const blinkProjectId = Deno.env.get('BLINK_PROJECT_ID')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Tables to migrate with their Blink DB names
    const tables = [
      'users',
      'phishing_scans',
      'training_datasets',
      'training_records',
      'model_versions',
      'model_tests',
      'system_settings',
      'sync_events',
      'password_reset_tokens',
      'email_verification_tokens',
      'magic_link_tokens'
    ];

    const migrationResults: any = {};

    for (const tableName of tables) {
      console.log(`Migrating table: ${tableName}`);
      
      try {
        // Fetch all records from Blink database
        const blinkResponse = await fetch(
          `https://blink-apis.blink.new/api/database/${blinkProjectId}/${tableName}`,
          {
            headers: {
              'Authorization': `Bearer ${blinkSecretKey}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!blinkResponse.ok) {
          throw new Error(`Failed to fetch from Blink: ${await blinkResponse.text()}`);
        }

        const blinkData = await blinkResponse.json();
        const records: BlinkRecord[] = blinkData.data || blinkData;

        if (!Array.isArray(records) || records.length === 0) {
          migrationResults[tableName] = {
            success: true,
            count: 0,
            message: 'No records to migrate'
          };
          continue;
        }

        console.log(`Found ${records.length} records in ${tableName}`);

        // Convert camelCase to snake_case for Supabase
        const convertedRecords = records.map(record => {
          const converted: any = {};
          for (const [key, value] of Object.entries(record)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            converted[snakeKey] = value;
          }
          return converted;
        });

        // Batch insert into Supabase (in chunks of 100)
        const chunkSize = 100;
        let insertedCount = 0;
        const errors: any[] = [];

        for (let i = 0; i < convertedRecords.length; i += chunkSize) {
          const chunk = convertedRecords.slice(i, i + chunkSize);
          
          const { data, error } = await supabase
            .from(tableName)
            .upsert(chunk, { onConflict: 'id' });

          if (error) {
            console.error(`Error inserting chunk for ${tableName}:`, error);
            errors.push(error);
          } else {
            insertedCount += chunk.length;
          }
        }

        migrationResults[tableName] = {
          success: errors.length === 0,
          total: records.length,
          inserted: insertedCount,
          errors: errors.length > 0 ? errors : undefined
        };

      } catch (error: any) {
        migrationResults[tableName] = {
          success: false,
          error: error.message
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration completed',
        results: migrationResults,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
