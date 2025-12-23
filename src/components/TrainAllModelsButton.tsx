import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Brain, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { trainingOrchestrator, ScanType } from '../lib/ml/training-orchestrator';
import { TrainingProgress, ModelMetrics } from '../lib/ml/model-trainer';
import toast from 'react-hot-toast';

interface ModelTrainingStatus {
  status: 'idle' | 'training' | 'completed' | 'error';
  progress: TrainingProgress | null;
  metrics: ModelMetrics | null;
  error: string | null;
}

export function TrainAllModelsButton() {
  const [isTrainingAll, setIsTrainingAll] = useState(false);
  const [modelStatuses, setModelStatuses] = useState<Record<ScanType, ModelTrainingStatus>>({
    url: { status: 'idle', progress: null, metrics: null, error: null },
    email: { status: 'idle', progress: null, metrics: null, error: null },
    sms: { status: 'idle', progress: null, metrics: null, error: null },
    qr: { status: 'idle', progress: null, metrics: null, error: null }
  });

  // SMS training is DISABLED - uses backend-only inference
  const scanTypes: ScanType[] = ['url', 'email', 'qr'];
  const allScanTypes: ScanType[] = ['url', 'email', 'sms', 'qr'];
  const modelNames = {
    url: 'URL Phishing',
    email: 'Email Phishing',
    sms: 'SMS Phishing',
    qr: 'QR Code Phishing'
  };

  const trainAllModels = async () => {
    setIsTrainingAll(true);
    
    // Reset all statuses
    setModelStatuses({
      url: { status: 'idle', progress: null, metrics: null, error: null },
      email: { status: 'idle', progress: null, metrics: null, error: null },
      sms: { status: 'idle', progress: null, metrics: null, error: null },
      qr: { status: 'idle', progress: null, metrics: null, error: null }
    });

    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;

    for (const scanType of scanTypes) {
      try {
        // Mark as training
        setModelStatuses(prev => ({
          ...prev,
          [scanType]: { status: 'training', progress: null, metrics: null, error: null }
        }));

        // Train using data from training_records table (not Kaggle, not synthetic)
        const result = await trainingOrchestrator.trainModel({
          scanType,
          useKaggleData: false, // Use database records, fall back to synthetic if no data
          datasetSize: 1000,    // Use up to 1000 records from training_records table
          config: {
            epochs: 10,
            batchSize: 32,
            learningRate: 0.001,
            validationSplit: 0.2
          },
          onProgress: (progress) => {
            setModelStatuses(prev => ({
              ...prev,
              [scanType]: { ...prev[scanType], progress }
            }));
          }
        });

        if (result.success && result.metrics) {
          setModelStatuses(prev => ({
            ...prev,
            [scanType]: { 
              status: 'completed', 
              progress: null, 
              metrics: result.metrics!, 
              error: null 
            }
          }));
          successCount++;
          toast.success(`✓ ${modelNames[scanType]} trained successfully!`);
        } else {
          throw new Error(result.error || 'Training failed');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Training failed';
        setModelStatuses(prev => ({
          ...prev,
          [scanType]: { status: 'error', progress: null, metrics: null, error: errorMsg }
        }));
        failureCount++;
        toast.error(`✗ ${modelNames[scanType]} training failed: ${errorMsg}`);
      }
    }

    const totalTime = Date.now() - startTime;
    setIsTrainingAll(false);

    // Show summary
    if (successCount === scanTypes.length) {
      toast.success(
        `All models trained successfully! (${Math.round(totalTime / 1000)}s)`
      );
    } else {
      toast.error(
        `Training complete: ${successCount} succeeded, ${failureCount} failed`
      );
    }
  };

  const getStatusIcon = (status: 'idle' | 'training' | 'completed' | 'error') => {
    switch (status) {
      case 'training':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: 'idle' | 'training' | 'completed' | 'error') => {
    const variants = {
      idle: 'outline' as const,
      training: 'default' as const,
      completed: 'default' as const,
      error: 'destructive' as const
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Train All Models
            </CardTitle>
            <CardDescription>
              Train all ML models sequentially using data from the training_records table
            </CardDescription>
          </div>
          <Button
            onClick={trainAllModels}
            disabled={isTrainingAll}
            size="lg"
            className="gap-2"
          >
            {isTrainingAll ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Training...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Train All Models
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* SMS Backend-Only Notice */}
        <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            <strong>SMS Detection:</strong> Uses backend-only inference with a pre-trained TensorFlow CNN model. Frontend training is disabled.
          </AlertDescription>
        </Alert>

        {/* Model Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allScanTypes.map(scanType => {
            const modelStatus = modelStatuses[scanType];
            // SMS uses backend-only inference - show disabled state
            const isSMSDisabled = scanType === 'sms';

            return (
              <Card key={scanType} className={`relative ${isSMSDisabled ? 'opacity-75' : ''}`}>
                {isSMSDisabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/40 dark:bg-black/40 rounded-lg z-10 pointer-events-none">
                    <Badge className="bg-yellow-500 text-yellow-900">Backend Only</Badge>
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{modelNames[scanType]}</CardTitle>
                    <div className="flex items-center gap-2">
                      {!isSMSDisabled && getStatusIcon(modelStatus.status)}
                      {isSMSDisabled ? (
                        <Badge className="bg-gray-400">Disabled</Badge>
                      ) : (
                        getStatusBadge(modelStatus.status)
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Training Progress */}
                  {modelStatus.status === 'training' && modelStatus.progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>Epoch {modelStatus.progress.epoch}/{modelStatus.progress.totalEpochs}</span>
                      </div>
                      <Progress 
                        value={(modelStatus.progress.epoch / modelStatus.progress.totalEpochs) * 100}
                      />
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Loss: </span>
                          <span className="font-medium">{modelStatus.progress.loss.toFixed(4)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Acc: </span>
                          <span className="font-medium">{(modelStatus.progress.accuracy * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metrics */}
                  {modelStatus.status === 'completed' && modelStatus.metrics && (
                    <div className="grid grid-cols-2 gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                        <div className="font-bold text-green-600 dark:text-green-400">
                          {(modelStatus.metrics.accuracy * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">F1 Score</div>
                        <div className="font-bold text-green-600 dark:text-green-400">
                          {(modelStatus.metrics.f1Score * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Precision</div>
                        <div className="text-sm font-medium">{(modelStatus.metrics.precision * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Recall</div>
                        <div className="text-sm font-medium">{(modelStatus.metrics.recall * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {modelStatus.status === 'error' && modelStatus.error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        {modelStatus.error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Idle State */}
                  {modelStatus.status === 'idle' && (
                    <div className="text-sm text-muted-foreground text-center py-2">
                      Waiting to start...
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info Alert */}
        <Alert>
          <Brain className="w-4 h-4" />
          <AlertDescription>
            <strong>Training Info:</strong> Each model will be trained sequentially using the training_records database table. 
            If insufficient data exists (fewer than 10 records), synthetic data will be used as fallback.
            Total training time: approximately 8-20 minutes on modern hardware.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
