import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Brain, Download, Play, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { 
  TrainingProgress,
  ModelMetrics 
} from '../lib/ml/model-trainer';
import { KAGGLE_DATASETS } from '../lib/ml/kaggle-service';
import { trainingOrchestrator, ScanType } from '../lib/ml/training-orchestrator';
import toast from 'react-hot-toast';

interface ModelStatus {
  isTraining: boolean;
  progress: TrainingProgress | null;
  metrics: ModelMetrics | null;
  error: string | null;
}

export function ModelTrainingPanel() {
  const [modelStatus, setModelStatus] = useState<Record<ScanType, ModelStatus>>({
    url: { isTraining: false, progress: null, metrics: null, error: null },
    email: { isTraining: false, progress: null, metrics: null, error: null },
    sms: { isTraining: false, progress: null, metrics: null, error: null },
    qr: { isTraining: false, progress: null, metrics: null, error: null }
  });

  const trainModel = async (scanType: ScanType, useKaggleData: boolean = false) => {
    setModelStatus(prev => ({
      ...prev,
      [scanType]: { isTraining: true, progress: null, metrics: null, error: null }
    }));

    try {
      const result = await trainingOrchestrator.trainModel({
        scanType,
        useKaggleData,
        datasetSize: 500,
        config: {
          epochs: 10,
          batchSize: 32,
          learningRate: 0.001,
          validationSplit: 0.2
        },
        onProgress: (progress) => {
          setModelStatus(prev => ({
            ...prev,
            [scanType]: { ...prev[scanType], progress }
          }));
        }
      });

      if (result.success && result.metrics) {
        setModelStatus(prev => ({
          ...prev,
          [scanType]: { isTraining: false, progress: null, metrics: result.metrics!, error: null }
        }));
        
        const dataSource = useKaggleData ? 'Kaggle dataset' : 'synthetic data';
        toast.success(
          `${scanType.toUpperCase()} model trained successfully with ${dataSource}! (${result.datasetSize} records)`
        );
      } else {
        throw new Error(result.error || 'Training failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Training failed';
      setModelStatus(prev => ({
        ...prev,
        [scanType]: { isTraining: false, progress: null, metrics: null, error: errorMsg }
      }));
      toast.error(errorMsg);
    }
  };

  const renderModelCard = (scanType: ScanType, title: string, description: string) => {
    const status = modelStatus[scanType];
    const dataset = KAGGLE_DATASETS.find(d => d.type === scanType);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                {title} Model
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {status.metrics && (
              <Badge variant="default" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Trained
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Kaggle Dataset Info */}
          {dataset && (
            <Alert>
              <Download className="w-4 h-4" />
              <AlertDescription>
                <div className="text-sm">
                  <strong>Dataset:</strong> {dataset.name}
                  <br />
                  {dataset.description}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Training Progress */}
          {status.isTraining && status.progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Training Progress</span>
                <span>Epoch {status.progress.epoch}/{status.progress.totalEpochs}</span>
              </div>
              <Progress value={(status.progress.epoch / status.progress.totalEpochs) * 100} />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Loss:</span>
                  <span className="ml-2 font-medium">{status.progress.loss.toFixed(4)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Accuracy:</span>
                  <span className="ml-2 font-medium">{(status.progress.accuracy * 100).toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Metrics */}
          {status.metrics && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
                <div className="text-2xl font-bold">{(status.metrics.accuracy * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">F1 Score</div>
                <div className="text-2xl font-bold">{(status.metrics.f1Score * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Precision</div>
                <div className="text-lg font-medium">{(status.metrics.precision * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Recall</div>
                <div className="text-lg font-medium">{(status.metrics.recall * 100).toFixed(1)}%</div>
              </div>
            </div>
          )}

          {/* Error */}
          {status.error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{status.error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => trainModel(scanType, false)}
              disabled={status.isTraining}
              variant="outline"
            >
              {status.isTraining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Quick Train
                </>
              )}
            </Button>
            
            <Button
              onClick={() => trainModel(scanType, true)}
              disabled={status.isTraining}
            >
              {status.isTraining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Train with Kaggle
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">ML Model Training</h2>
      </div>

      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="url">URL</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="qr">QR Code</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="mt-6">
          {renderModelCard('url', 'URL Phishing', 'Character-level CNN for URL analysis')}
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          {renderModelCard('email', 'Email Phishing', 'BiLSTM model for email content analysis')}
        </TabsContent>

        <TabsContent value="sms" className="mt-6">
          {renderModelCard('sms', 'SMS Phishing', 'Lightweight CNN for SMS text analysis')}
        </TabsContent>

        <TabsContent value="qr" className="mt-6">
          {renderModelCard('qr', 'QR Code Phishing', 'URL-based model for QR code content')}
        </TabsContent>
      </Tabs>

      <Alert>
        <Brain className="w-4 h-4" />
        <AlertDescription>
          <strong>Training Info:</strong> Models are trained in your browser using TensorFlow.js.
          Training uses sample datasets (500 records per type). For production use, connect to Kaggle API
          for larger datasets. Each model takes 2-5 minutes to train on modern hardware.
        </AlertDescription>
      </Alert>
    </div>
  );
}
