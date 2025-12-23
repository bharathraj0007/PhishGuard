import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface MigrationResult {
  [tableName: string]: {
    success: boolean;
    total?: number;
    inserted?: number;
    count?: number;
    message?: string;
    error?: string;
  };
}

export function MigrationStatus() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(
        'https://eky2mdxr--blink-to-supabase-migration.functions.blink.new',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results);

      if (!data.success) {
        setError(data.error || 'Migration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start migration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6 bg-background rounded-lg border">
      <div>
        <h2 className="text-2xl font-bold mb-2">Blink to Supabase Migration</h2>
        <p className="text-foreground/70">
          Migrate all your PhishGuard data from Blink database to Supabase
        </p>
      </div>

      <button
        onClick={handleMigration}
        disabled={loading}
        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Migrating...
          </>
        ) : (
          'Start Migration'
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Migration Error</p>
            <p className="text-red-800 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {results && (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Migration Results</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {Object.entries(results).map(([tableName, result]) => (
              <div
                key={tableName}
                className="p-4 bg-muted rounded-lg flex items-start gap-3"
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium capitalize">{tableName}</p>
                  {result.success ? (
                    <p className="text-sm text-foreground/70">
                      {result.inserted || result.count || 0} records
                      {result.message ? ` - ${result.message}` : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600">{result.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-900 font-medium">
              ✓ Migration completed successfully!
            </p>
            <p className="text-green-800 text-sm mt-1">
              All data has been migrated to Supabase. You can now verify the data
              in your Supabase dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
