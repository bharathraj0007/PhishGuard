import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Play, Download, CheckCircle, XCircle, Loader2, TrendingUp, Network } from 'lucide-react';
import { CharacterCNNTrainingService, CharacterCNNTrainingProgress, CharacterCNNTrainingResult } from '@/lib/ml/character-cnn-training';
import { URLDataProcessor } from '@/lib/ml/url-data-processor';
import { toast } from 'sonner';

// CSV files specifically for URL phishing detection
const URL_DATASET_URLS = [
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Fdataset_phishing__af0db356.csv?alt=media&token=5eb1524a-c77f-45cd-836c-c213a92137e3',
    name: 'Phishing Dataset',
    description: 'Comprehensive phishing URL dataset with features'
  },
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Fdataset__87a48617.csv?alt=media&token=ff35c70d-892a-4159-9859-e0763df73687',
    name: 'General URL Dataset',
    description: 'General URL dataset for training and comparison'
  },
  {
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2FPhishing_Legitimate_full__38ff74a3.csv?alt=media&token=38540bcc-c14f-4c14-b359-ab65d0208ef7',
    name: 'Phishing vs Legitimate',
    description: 'Labeled dataset of phishing and legitimate URLs'
  }
];

export interface CharacterCNNURLTrainingProgress {
  currentStep: string;
  progress: number;
  message: string;
  currentEpoch?: number;
  totalEpochs?: number;
  metrics?: {
    loss: number;
    accuracy: number;
    valLoss?: number;
    valAccuracy?: number;
  };
  urlsProcessed?: number;
  totalUrls?: number;
}

export interface CharacterCNNURLTrainingResult {
  success: boolean;
  error?: string;
  model?: any;
  metrics?: {
    trainAccuracy: number;
    trainLoss: number;
    valAccuracy: number;
    valLoss: number;
  };
  testMetrics?: {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
  };
  datasetInfo?: {
    totalUrls: number;
    phishingUrls: number;
    legitimateUrls: number;
    trainingSamples: number;
    testSamples: number;
  };
}

export function CharacterCNNURLTraining() {
  const [isTraining, setIsTraining] = useState(false);
  const [progress, setProgress] = useState<CharacterCNNURLTrainingProgress | null>(null);
  const [trainingResult, setTrainingResult] = useState<CharacterCNNURLTrainingResult | null>(null);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>(
    URL_DATASET_URLS.map(d => d.name)
  );

  // Character-CNN specific configuration
  const [charEmbedding, setCharEmbedding] = useState(16);
  const [maxSequenceLength, setMaxSequenceLength] = useState(200);
  const [numFilters, setNumFilters] = useState(128);
  const [filterSizes, setFilterSizes] = useState('3,4,5');
  const [epochs, setEpochs] = useState(15);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.001);
  const [dropout, setDropout] = useState(0.3);
  const [balanceData, setBalanceData] = useState(true);

  const handleStartTraining = async () => {
    if (selectedDatasets.length === 0) {
      toast.error('Please select at least one dataset');
      return;
    }

    setIsTraining(true);
    setProgress(null);
    setTrainingResult(null);

    try {
      // Initialize training service
      const trainingService = new CharacterCNNTrainingService();
      const dataProcessor = new URLDataProcessor();

      // Get selected dataset URLs
      const selectedUrls = URL_DATASET_URLS
        .filter(d => selectedDatasets.includes(d.name))
        .map(d => d.url);

      // Load and process data
      setProgress({
        currentStep: 'Loading URL data from CSV files...',
        progress: 5,
        message: 'Fetching and parsing CSV files'
      });

      const processedData = await dataProcessor.loadAndProcessURLs(selectedUrls);

      if (!processedData || processedData.urls.length === 0) {
        throw new Error('Failed to load or process URL data from CSV files');
      }

      setProgress({
        currentStep: 'Data processing complete',
        progress: 15,
        message: `Loaded ${processedData.urls.length} URLs from ${selectedDatasets.length} dataset(s)`
      });

      // Train Character-CNN model
      const result = await trainingService.trainURLModel(
        {
          urlData: processedData,
          modelConfig: {
            charEmbedding,
            maxSequenceLength,
            numFilters,
            filterSizes: filterSizes.split(',').map(Number),
            dropout,
            learningRate,
            epochs,
            batchSize
          },
          testSplit: 0.2,
          balanceData
        },
        (prog: CharacterCNNTrainingProgress) => {
          setProgress(prog);
        }
      );

      setTrainingResult(result);

      if (result.success) {
        toast.success('Character-CNN model training completed!');
      } else {
        toast.error(`Training failed: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Training error: ${errorMsg}`);
      setTrainingResult({
        success: false,
        error: errorMsg
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
      <Card className="border-blue-500/30 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Network className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle>Character-CNN URL Detection</CardTitle>
              <CardDescription>
                Train a Character-level CNN model specifically for phishing URL detection using TensorFlow.js
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 border-blue-500 bg-blue-500/10">
            <AlertDescription className="text-blue-700">
              <strong>Model Type:</strong> Character-level Convolutional Neural Network (CNN) optimized for URL pattern recognition
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="datasets" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="datasets">Datasets</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
            </TabsList>

            {/* Datasets Tab */}
            <TabsContent value="datasets" className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-3">URL Phishing Detection Datasets</h3>
                <div className="space-y-2">
                  {URL_DATASET_URLS.map((dataset) => (
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
                          <p className="text-xs text-muted-foreground">{dataset.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline">CSV</Badge>
                    </div>
                  ))}
                </div>
                <Alert className="mt-4">
                  <AlertDescription>
                    <strong>{selectedDatasets.length} dataset(s) selected.</strong> The Character-CNN model will be trained on URL patterns from all selected sources.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-4">
              <div className="space-y-6">
                {/* Character-CNN Architecture */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    Character-CNN Architecture
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Character Embedding Dimension</label>
                      <input
                        type="number"
                        value={charEmbedding}
                        onChange={(e) => setCharEmbedding(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        min="8"
                        max="128"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Vector size for each character (8-128)</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Max Sequence Length</label>
                      <input
                        type="number"
                        value={maxSequenceLength}
                        onChange={(e) => setMaxSequenceLength(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        min="50"
                        max="500"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Maximum URL characters to process (50-500)</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Number of Filters</label>
                      <input
                        type="number"
                        value={numFilters}
                        onChange={(e) => setNumFilters(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        min="64"
                        max="512"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Convolution filters per layer (64-512)</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Filter Sizes</label>
                      <input
                        type="text"
                        value={filterSizes}
                        onChange={(e) => setFilterSizes(e.target.value)}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        placeholder="3,4,5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Comma-separated filter sizes (e.g., 3,4,5)</p>
                    </div>
                  </div>
                </div>

                {/* Training Hyperparameters */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Training Hyperparameters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Epochs</label>
                      <input
                        type="number"
                        value={epochs}
                        onChange={(e) => setEpochs(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        min="1"
                        max="100"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Training iterations</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Batch Size</label>
                      <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        min="8"
                        max="256"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Samples per batch</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Learning Rate</label>
                      <input
                        type="number"
                        value={learningRate}
                        onChange={(e) => setLearningRate(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        step="0.0001"
                        min="0.00001"
                        max="0.01"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Model learning rate</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Dropout Rate</label>
                      <input
                        type="number"
                        value={dropout}
                        onChange={(e) => setDropout(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 border rounded-md"
                        step="0.05"
                        min="0"
                        max="0.5"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Regularization dropout (0-0.5)</p>
                    </div>
                  </div>
                </div>

                {/* Data Options */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Data Processing</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={balanceData}
                      onChange={(e) => setBalanceData(e.target.checked)}
                      className="w-4 h-4"
                      id="balance"
                    />
                    <label htmlFor="balance" className="text-sm font-medium cursor-pointer">
                      Balance Dataset (equal phishing/legitimate samples)
                    </label>
                  </div>
                </div>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Character-CNN Architecture:</strong> 
                    Character embedding → Multiple convolutional filters → Max pooling → Fully connected layers → Sigmoid output for binary classification
                  </AlertDescription>
                </Alert>
              </div>
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
                    Start Character-CNN Training
                  </Button>
                )}

                {isTraining && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-3 p-4 bg-accent/50 rounded-lg">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div>
                        <p className="font-medium">{progress?.currentStep || 'Training in progress...'}</p>
                        <p className="text-sm text-muted-foreground">{progress?.message}</p>
                      </div>
                    </div>

                    <Progress value={progress?.progress || 0} className="h-2" />

                    {progress?.currentEpoch && progress?.totalEpochs && (
                      <div className="text-center text-sm text-muted-foreground">
                        Epoch {progress.currentEpoch} of {progress.totalEpochs}
                      </div>
                    )}

                    {progress?.urlsProcessed && progress?.totalUrls && (
                      <div className="text-center text-sm text-muted-foreground">
                        URLs processed: {progress.urlsProcessed} / {progress.totalUrls}
                      </div>
                    )}

                    {progress?.metrics && (
                      <div className="grid grid-cols-2 gap-3">
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Training Loss</p>
                            <p className="text-2xl font-bold">{progress.metrics.loss.toFixed(4)}</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4">
                            <p className="text-xs text-muted-foreground">Training Accuracy</p>
                            <p className="text-2xl font-bold">{(progress.metrics.accuracy * 100).toFixed(1)}%</p>
                          </CardContent>
                        </Card>
                        {progress.metrics.valLoss !== undefined && (
                          <Card>
                            <CardContent className="pt-4">
                              <p className="text-xs text-muted-foreground">Val Loss</p>
                              <p className="text-2xl font-bold">{progress.metrics.valLoss.toFixed(4)}</p>
                            </CardContent>
                          </Card>
                        )}
                        {progress.metrics.valAccuracy !== undefined && (
                          <Card>
                            <CardContent className="pt-4">
                              <p className="text-xs text-muted-foreground">Val Accuracy</p>
                              <p className="text-2xl font-bold">{(progress.metrics.valAccuracy * 100).toFixed(1)}%</p>
                            </CardContent>
                          </Card>
                        )}
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
                            <strong>Character-CNN training completed successfully!</strong>
                          </AlertDescription>
                        </Alert>

                        {trainingResult.testMetrics && (
                          <>
                            <div className="mt-4">
                              <h3 className="text-sm font-semibold mb-3">Test Results</h3>
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
                            </div>
                          </>
                        )}

                        {trainingResult.datasetInfo && (
                          <Card>
                            <CardContent className="pt-4 space-y-2">
                              <p className="text-sm font-medium">Dataset Information</p>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Total URLs:</span>
                                  <span className="ml-2 font-medium">{trainingResult.datasetInfo.totalUrls}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Phishing:</span>
                                  <span className="ml-2 font-medium">{trainingResult.datasetInfo.phishingUrls}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Legitimate:</span>
                                  <span className="ml-2 font-medium">{trainingResult.datasetInfo.legitimateUrls}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Training Samples:</span>
                                  <span className="ml-2 font-medium">{trainingResult.datasetInfo.trainingSamples}</span>
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
