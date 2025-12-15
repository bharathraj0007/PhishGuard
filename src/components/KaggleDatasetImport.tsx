import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Download, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Link as LinkIcon,
  Mail,
  MessageSquare,
  QrCode,
  ArrowRight,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface DatasetStatus {
  detectionType: string;
  datasetCount: number;
  totalRecords: number;
}

interface ImportProgress {
  type: string;
  status: 'idle' | 'importing' | 'training' | 'completed' | 'error';
  progress: number;
  message: string;
  datasetId?: string;
  modelId?: string;
}

const DETECTION_TYPES = [
  { 
    id: 'url', 
    name: 'URL Phishing', 
    icon: LinkIcon, 
    color: 'text-blue-500',
    description: 'Detect phishing URLs and malicious links'
  },
  { 
    id: 'email', 
    name: 'Email Phishing', 
    icon: Mail, 
    color: 'text-green-500',
    description: 'Identify phishing emails and spam'
  },
  { 
    id: 'sms', 
    name: 'SMS Phishing', 
    icon: MessageSquare, 
    color: 'text-purple-500',
    description: 'Detect SMS spam and smishing attacks'
  },
  { 
    id: 'qr', 
    name: 'QR Code Phishing', 
    icon: QrCode, 
    color: 'text-orange-500',
    description: 'Analyze QR codes for malicious content'
  }
];

export function KaggleDatasetImport() {
  const [importProgress, setImportProgress] = useState<Record<string, ImportProgress>>({
    url: { type: 'url', status: 'idle', progress: 0, message: '' },
    email: { type: 'email', status: 'idle', progress: 0, message: '' },
    sms: { type: 'sms', status: 'idle', progress: 0, message: '' },
    qr: { type: 'qr', status: 'idle', progress: 0, message: '' }
  });
  const [datasetStatus, setDatasetStatus] = useState<DatasetStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch dataset status on component mount
  useEffect(() => {
    checkDatasetStatus();
  }, []);

  const checkDatasetStatus = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(
        'https://eky2mdxr--kaggle-import.functions.blink.new?action=status'
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch dataset status');
      }
      
      const data = await response.json();
      setDatasetStatus(data.datasets || []);
    } catch (error) {
      console.error('Error checking dataset status:', error);
      toast.error('Failed to fetch dataset status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const importDataset = async (detectionType: string) => {
    try {
      // Update progress: importing
      setImportProgress(prev => ({
        ...prev,
        [detectionType]: {
          ...prev[detectionType],
          status: 'importing',
          progress: 20,
          message: 'Downloading dataset from Kaggle...'
        }
      }));

      toast.info(`Starting ${detectionType.toUpperCase()} dataset import...`);

      // Step 1: Import dataset
      const importResponse = await fetch(
        'https://eky2mdxr--kaggle-import.functions.blink.new',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            detectionType,
            datasetName: `${detectionType.toUpperCase()} Kaggle Dataset ${new Date().toLocaleDateString()}`
          })
        }
      );

      if (!importResponse.ok) {
        throw new Error('Failed to import dataset');
      }

      const importData = await importResponse.json();
      
      // Update progress: import completed
      setImportProgress(prev => ({
        ...prev,
        [detectionType]: {
          ...prev[detectionType],
          status: 'training',
          progress: 50,
          message: `Imported ${importData.recordCount} records. Starting model training...`,
          datasetId: importData.datasetId
        }
      }));

      toast.success(`Imported ${importData.recordCount} ${detectionType} records`);

      // Step 2: Train model
      const trainingResponse = await fetch(
        'https://eky2mdxr--ml-specialized-training.functions.blink.new',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            datasetId: importData.datasetId,
            detectionType,
            versionNumber: `v1.0-${detectionType}-${Date.now()}`,
            description: `Auto-trained ${detectionType} model from Kaggle dataset`,
            config: {
              epochs: 100,
              batchSize: 32,
              learningRate: 0.001
            }
          })
        }
      );

      if (!trainingResponse.ok) {
        throw new Error('Failed to train model');
      }

      const trainingData = await trainingResponse.json();

      // Update progress: completed
      setImportProgress(prev => ({
        ...prev,
        [detectionType]: {
          ...prev[detectionType],
          status: 'completed',
          progress: 100,
          message: `Training completed! Accuracy: ${(trainingData.metrics.accuracy * 100).toFixed(1)}%`,
          modelId: trainingData.modelId
        }
      }));

      toast.success(
        `${detectionType.toUpperCase()} model trained successfully! Accuracy: ${(trainingData.metrics.accuracy * 100).toFixed(1)}%`
      );

      // Refresh status
      await checkDatasetStatus();

    } catch (error) {
      console.error(`Error importing ${detectionType}:`, error);
      
      setImportProgress(prev => ({
        ...prev,
        [detectionType]: {
          ...prev[detectionType],
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Import failed'
        }
      }));

      toast.error(`Failed to import ${detectionType} dataset`);
    }
  };

  const importAllDatasets = async () => {
    setIsLoading(true);
    
    try {
      toast.info('Starting batch import for all detection types...');
      
      // Import all datasets sequentially
      for (const type of DETECTION_TYPES) {
        await importDataset(type.id);
        // Small delay between imports
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      toast.success('All datasets imported and models trained successfully!');
    } catch (error) {
      toast.error('Batch import failed');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'importing':
      case 'training':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Database className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      case 'importing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Importing...</Badge>;
      case 'training':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Training...</Badge>;
      case 'error':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Error</Badge>;
      default:
        return <Badge variant="outline">Ready</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Kaggle Dataset Import</h2>
          <p className="text-muted-foreground mt-2">
            Import phishing datasets from Kaggle and train ML models for each detection type
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={checkDatasetStatus} 
            disabled={isRefreshing}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh Status
              </>
            )}
          </Button>
          <Button 
            onClick={importAllDatasets} 
            disabled={isLoading}
            size="lg"
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing All...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Import All Datasets
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dataset Status Overview */}
      {datasetStatus.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {datasetStatus.map((status) => (
            <Card key={status.detectionType}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {status.detectionType.toUpperCase()}
                    </p>
                    <p className="text-2xl font-bold">
                      {status.totalRecords.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {status.datasetCount} dataset{status.datasetCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 bg-muted/10">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col items-center justify-center text-center py-8">
              <Database className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Datasets Imported Yet</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                Click "Import All Datasets" above to download and train ML models with Kaggle phishing datasets. 
                This will import URL, Email, SMS, and QR code detection datasets automatically.
              </p>
              <Badge variant="outline" className="text-xs">
                Each dataset contains 100-1000 labeled phishing samples
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DETECTION_TYPES.map((type) => {
          const progress = importProgress[type.id];
          const Icon = type.icon;
          
          return (
            <Card key={type.id} className="relative overflow-hidden">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-background border ${type.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{type.name}</CardTitle>
                      <CardDescription>{type.description}</CardDescription>
                    </div>
                  </div>
                  {getStatusIcon(progress.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                {progress.status !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      {getStatusBadge(progress.status)}
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                    {progress.message && (
                      <p className="text-sm text-muted-foreground">{progress.message}</p>
                    )}
                  </div>
                )}

                {/* Action Button */}
                <Button
                  onClick={() => importDataset(type.id)}
                  disabled={progress.status === 'importing' || progress.status === 'training'}
                  className="w-full gap-2"
                  variant={progress.status === 'completed' ? 'outline' : 'default'}
                >
                  {progress.status === 'importing' || progress.status === 'training' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : progress.status === 'completed' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Re-import Dataset
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Import & Train
                    </>
                  )}
                </Button>

                {/* Model Info */}
                {progress.modelId && (
                  <div className="pt-3 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Model ID</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {progress.modelId.slice(0, 20)}...
                      </code>
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* Animated background for active imports */}
              {(progress.status === 'importing' || progress.status === 'training') && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-shimmer" />
              )}
            </Card>
          );
        })}
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Import Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Dataset Download</h4>
                <p className="text-sm text-muted-foreground">
                  Downloads curated phishing datasets from Kaggle for each detection type
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Data Processing</h4>
                <p className="text-sm text-muted-foreground">
                  Processes and stores records in the database with proper labeling
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Model Training</h4>
                <p className="text-sm text-muted-foreground">
                  Trains specialized ML model for the specific detection type with feature extraction
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center font-semibold">
                ✓
              </div>
              <div>
                <h4 className="font-semibold mb-1">Model Deployment</h4>
                <p className="text-sm text-muted-foreground">
                  Trained model is ready to use for real-time phishing detection
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
