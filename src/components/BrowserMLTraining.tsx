/**
 * Browser-Based ML Training Component
 * 
 * UI for training ML models directly in the browser using data from Blink database.
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Brain, Database, Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { trainModel, TrainingProgress, TrainingResult } from '../lib/ml/browser-training-service';
import { getDatasetStatistics } from '../lib/ml/blink-dataset-loader';
import { checkMLModelsAvailable, deleteModel } from '../lib/ml/ml-prediction-service';
import { toast } from 'sonner';

type ScanType = 'url' | 'email' | 'sms' | 'qr';

interface ModelStatus {
  scanType: ScanType;
  available: boolean;
  trained: boolean;
  datasetSize: number;
}

export default function BrowserMLTraining() {
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([]);
  const [training, setTraining] = useState<Record<string, boolean>>({});
  const [progress, setProgress] = useState<Record<string, TrainingProgress>>({});
  const [results, setResults] = useState<Record<string, TrainingResult>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = async () => {
    setLoading(true);
    try {
      // Check which models are trained
      const trainedModels = await checkMLModelsAvailable();

      // Get dataset statistics
      const stats = await getDatasetStatistics();

      const scanTypes: ScanType[] = ['url', 'email', 'sms', 'qr'];
      const statuses: ModelStatus[] = [];

      for (const scanType of scanTypes) {
        const stat = stats.find(s => s.scan_type === scanType);
        statuses.push({
          scanType,
          available: (stat?.total || 0) > 0,
          trained: trainedModels.get(scanType) || false,
          datasetSize: stat?.total || 0
        });
      }

      setModelStatuses(statuses);
    } catch (error) {
      console.error('Error loading model statuses:', error);
      toast.error('Failed to load model statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleTrain = async (scanType: ScanType) => {
    setTraining(prev => ({ ...prev, [scanType]: true }));
    setProgress(prev => ({ ...prev, [scanType]: { stage: 'loading', progress: 0, message: 'Starting...' } }));

    try {
      const result = await trainModel(scanType, {
        epochs: 10,
        balance: true,
        onProgress: (prog) => {
          setProgress(prev => ({ ...prev, [scanType]: prog }));
        }
      });

      setResults(prev => ({ ...prev, [scanType]: result }));

      if (result.success) {
        toast.success(`${scanType.toUpperCase()} model trained successfully!`);
        await loadStatuses(); // Refresh statuses
      } else {
        toast.error(`Training failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Training error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTraining(prev => ({ ...prev, [scanType]: false }));
    }
  };

  const handleDelete = async (scanType: ScanType) => {
    if (!confirm(`Delete ${scanType.toUpperCase()} model? You'll need to retrain it.`)) {
      return;
    }

    const success = await deleteModel(scanType);
    if (success) {
      toast.success(`${scanType.toUpperCase()} model deleted`);
      await loadStatuses();
    } else {
      toast.error('Failed to delete model');
    }
  };

  const getModelIcon = (scanType: string) => {
    switch (scanType) {
      case 'url': return '🔗';
      case 'email': return '📧';
      case 'sms': return '💬';
      case 'qr': return '📱';
      default: return '🔍';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Browser-Based ML Training</CardTitle>
              <CardDescription>
                Train phishing detection models using TensorFlow.js directly in your browser
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              Models are trained on datasets stored in the Blink database. Training happens entirely in your browser.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Model Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {modelStatuses.map(status => {
          const isTraining = training[status.scanType];
          const prog = progress[status.scanType];
          const result = results[status.scanType];

          return (
            <Card key={status.scanType}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getModelIcon(status.scanType)}</span>
                    <CardTitle className="text-lg capitalize">
                      {status.scanType} Detection
                    </CardTitle>
                  </div>
                  {status.trained && (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Trained
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dataset Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Dataset Size:</span>
                  <Badge variant="outline">
                    {status.datasetSize.toLocaleString()} samples
                  </Badge>
                </div>

                {/* Training Progress */}
                {isTraining && prog && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{prog.stage}</span>
                      <span className="font-medium">{prog.progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={prog.progress} />
                    <p className="text-xs text-muted-foreground">{prog.message}</p>
                    {prog.epoch && prog.totalEpochs && (
                      <div className="text-xs text-muted-foreground">
                        Epoch {prog.epoch}/{prog.totalEpochs}
                        {prog.accuracy && ` • Accuracy: ${(prog.accuracy * 100).toFixed(2)}%`}
                      </div>
                    )}
                  </div>
                )}

                {/* Training Results */}
                {result && result.success && !isTraining && (
                  <div className="space-y-2 rounded-lg bg-muted p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Training Complete
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-muted-foreground">Train Accuracy</div>
                        <div className="font-medium">{(result.metrics.trainAccuracy * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Test Accuracy</div>
                        <div className="font-medium">{(result.metrics.testAccuracy * 100).toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Training Time</div>
                        <div className="font-medium">{(result.trainingTime / 1000).toFixed(1)}s</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Samples</div>
                        <div className="font-medium">{result.datasetInfo.totalSamples}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {result && !result.success && !isTraining && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{result.error}</AlertDescription>
                  </Alert>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleTrain(status.scanType)}
                    disabled={!status.available || isTraining}
                    className="flex-1"
                  >
                    {isTraining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-4 w-4" />
                        {status.trained ? 'Retrain' : 'Train'} Model
                      </>
                    )}
                  </Button>
                  {status.trained && (
                    <Button
                      variant="outline"
                      onClick={() => handleDelete(status.scanType)}
                      disabled={isTraining}
                    >
                      Delete
                    </Button>
                  )}
                </div>

                {!status.available && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      No training data available. Upload datasets first.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Training Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Training uses TensorFlow.js and runs entirely in your browser</p>
          <p>• Data is loaded from the Blink database (training_records table)</p>
          <p>• Models are saved to IndexedDB for offline use</p>
          <p>• Training typically takes 1-5 minutes depending on dataset size</p>
          <p>• Larger datasets produce more accurate models</p>
        </CardContent>
      </Card>
    </div>
  );
}
