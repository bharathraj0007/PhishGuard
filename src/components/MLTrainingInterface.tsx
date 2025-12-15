import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Play, Download, Upload, CheckCircle, XCircle, Loader2, TrendingUp } from 'lucide-react';
import { getTrainingService, TrainingProgress, TrainingResult } from '@/lib/ml/training-service';
import { toast } from 'sonner';

// Dataset URLs from the provided files
const DATASET_URLS = [
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2FSpamAssasin__62866d30.csv?alt=media&token=5578dc47-543d-4b0a-852d-54e489771f44',
    name: 'SpamAssassin'
  },
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2FEnron__53baacc8.csv?alt=media&token=0eeffb75-b480-42c1-a738-327a7b8c9db4',
    name: 'Enron'
  },
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2FLing__a7cb1163.csv?alt=media&token=dfce6b41-5783-45bb-a32f-f94f9f9019e7',
    name: 'Ling'
  },
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2FNazario__ee873999.csv?alt=media&token=7189296f-82f2-4621-a246-0c8088371e14',
    name: 'Nazario'
  },
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2FNigerian_Fraud__fa622fb5.csv?alt=media&token=61c1abd9-e6ff-444f-8059-bb362acfe652',
    name: 'Nigerian_Fraud'
  }
];

export function MLTrainingInterface() {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(DATASET_URLS.map(d => d.name));
  
  // Training configuration
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.001);
  const [balanceDataset, setBalanceDataset] = useState(true);
  const [augmentData, setAugmentData] = useState(true);

  const handleStartTraining = async () => {
    setIsTraining(true);
    setProgress(null);
    setTrainingResult(null);

    try {
      const trainingService = getTrainingService();
      
      // Filter selected datasets
      const datasets = DATASET_URLS.filter(d => selectedDatasets.includes(d.name));

      const result = await trainingService.trainModel(
        {
          datasetURLs: datasets,
          modelConfig: {
            epochs,
            batchSize,
            learningRate,
            lstmUnits: 128,
            denseUnits: 64,
            dropout: 0.3
          },
          testSplit: 0.2,
          balanceDataset,
          augmentData
        },
        (prog) => {
          setProgress(prog);
        }
      );

      setTrainingResult(result);

      if (result.success) {
        toast.success('Model training completed successfully!');
      } else {
        toast.error(`Training failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Training error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTrainingResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTraining(false);
    }
  };

  const toggleDataset = (datasetName: string) => {
    setSelectedDatasets(prev =>
      prev.includes(datasetName)
        ? prev.filter(d => d !== datasetName)
        : [...prev, datasetName]
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            <CardTitle>ML Model Training</CardTitle>
          </div>
          <CardDescription>
            Train PhishGuard's phishing detection model using TensorFlow.js with DistilBERT-inspired architecture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="datasets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="datasets">Datasets</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
            </TabsList>

            {/* Datasets Tab */}
            <TabsContent value="datasets" className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">Select Training Datasets</h3>
                <div className="space-y-2">
                  {DATASET_URLS.map((dataset) => (
                    <div
                      key={dataset.name}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 cursor-pointer"
                      onClick={() => toggleDataset(dataset.name)}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedDatasets.includes(dataset.name)}
                          onChange={() => toggleDataset(dataset.name)}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="font-medium">{dataset.name}</p>
                          <p className="text-xs text-muted-foreground">Phishing email dataset</p>
                        </div>
                      </div>
                      <Badge variant="outline">CSV</Badge>
                    </div>
                  ))}
                </div>
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>{selectedDatasets.length} datasets selected.</strong> The model will be trained on combined data from all selected sources.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Epochs</label>
                  <input
                    type="number"
                    value={epochs}
                    onChange={(e) => setEpochs(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    min="1"
                    max="50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Number of training iterations</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Batch Size</label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    min="8"
                    max="128"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Samples per training batch</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Learning Rate</label>
                  <input
                    type="number"
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                    step="0.0001"
                    min="0.0001"
                    max="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Model learning rate</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={balanceDataset}
                      onChange={(e) => setBalanceDataset(e.target.checked)}
                      className="w-4 h-4"
                      id="balance"
                    />
                    <label htmlFor="balance" className="text-sm font-medium cursor-pointer">
                      Balance Dataset
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={augmentData}
                      onChange={(e) => setAugmentData(e.target.checked)}
                      className="w-4 h-4"
                      id="augment"
                    />
                    <label htmlFor="augment" className="text-sm font-medium cursor-pointer">
                      Augment Data
                    </label>
                  </div>
                </div>
              </div>

              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  <strong>Model Architecture:</strong> BiLSTM (128 units) + Dense (64 units) + Dropout (0.3) + Sigmoid output
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* Training Tab */}
            <TabsContent value="training" className="space-y-4">
              <div className="space-y-4">
                {!isTraining && !trainingResult && (
                  <Button
                    onClick={handleStartTraining}
                    disabled={selectedDatasets.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Start Training
                  </Button>
                )}

                {isTraining && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 p-4 bg-accent/50 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="font-medium">{progress?.message || 'Training in progress...'}</p>
                    </div>

                    <Progress value={progress?.progress || 0} className="h-2" />

                    {progress?.currentEpoch && progress?.totalEpochs && (
                      <div className="text-center text-sm text-muted-foreground">
                        Epoch {progress.currentEpoch} of {progress.totalEpochs}
                      </div>
                    )}

                    {progress?.metrics && (
                      <div className="grid grid-cols-2 gap-3">
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Accuracy</p>
                            <p className="text-2xl font-bold">{(progress.metrics.accuracy * 100).toFixed(1)}%</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Loss</p>
                            <p className="text-2xl font-bold">{progress.metrics.loss.toFixed(4)}</p>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                )}

                {trainingResult && (
                  <div className="space-y-4">
                    {trainingResult.success ? (
                      <>
                        <Alert className="border-green-500 bg-green-500/10">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <AlertDescription className="text-green-700">
                            <strong>Training completed successfully!</strong>
                          </AlertDescription>
                        </Alert>

                        {trainingResult.testMetrics && (
                          <div className="grid grid-cols-2 gap-3">
                            <Card>
                              <CardContent className="pt-4">
                                <p className="text-xs text-muted-foreground">Test Accuracy</p>
                                <p className="text-2xl font-bold">{(trainingResult.testMetrics.accuracy * 100).toFixed(1)}%</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4">
                                <p className="text-xs text-muted-foreground">F1 Score</p>
                                <p className="text-2xl font-bold">{(trainingResult.testMetrics.f1Score * 100).toFixed(1)}%</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4">
                                <p className="text-xs text-muted-foreground">Precision</p>
                                <p className="text-2xl font-bold">{(trainingResult.testMetrics.precision * 100).toFixed(1)}%</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardContent className="pt-4">
                                <p className="text-xs text-muted-foreground">Recall</p>
                                <p className="text-2xl font-bold">{(trainingResult.testMetrics.recall * 100).toFixed(1)}%</p>
                              </CardContent>
                            </Card>
                          </div>
                        )}

                        {trainingResult.datasetInfo && (
                          <Card>
                            <CardContent className="pt-4 space-y-2">
                              <p className="text-sm font-medium">Dataset Information</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Total Samples:</span>
                                  <span className="ml-2 font-medium">{trainingResult.datasetInfo.totalSamples}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Training:</span>
                                  <span className="ml-2 font-medium">{trainingResult.datasetInfo.trainingSamples}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Test:</span>
                                  <span className="ml-2 font-medium">{trainingResult.datasetInfo.testSamples}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Phishing Ratio:</span>
                                  <span className="ml-2 font-medium">{(trainingResult.datasetInfo.phishingRatio * 100).toFixed(1)}%</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        <div className="flex gap-2">
                          <Button onClick={() => setTrainingResult(null)} variant="outline" className="flex-1">
                            Train New Model
                          </Button>
                          <Button className="flex-1">
                            <Download className="mr-2 h-4 w-4" />
                            Export Model
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Training failed:</strong> {trainingResult.error}
                          </AlertDescription>
                        </Alert>
                        <Button onClick={() => setTrainingResult(null)} variant="outline" className="w-full">
                          Retry Training
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
