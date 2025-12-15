import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { blink } from '@/lib/blink'

interface DatasetInfo {
  name: string
  url: string
  label: string
}

interface TrainingMetrics {
  finalLoss: number
  finalAccuracy: number
  finalValLoss: number
  finalValAccuracy: number
  precision: number
  recall: number
  f1Score: number
}

interface TrainingResult {
  success: boolean
  message: string
  modelId: string
  training: {
    epochs: number
    batchSize: number
    validationSplit: number
  }
  dataset: {
    totalRecords: number
    trainingRecords: number
    validationRecords: number
    phishingCount: number
    legitimateCount: number
    phishingPercentage: number
  }
  metrics?: TrainingMetrics
}

interface DatasetResult {
  success: boolean
  datasetName: string
  totalRecords: number
  phishingCount: number
  legitimateCount: number
  phishingPercentage: number
  averageLength: number
  minLength: number
  maxLength: number
  sampleRecords: Array<{ text: string; label: string }>
  message: string
}

const DATASETS: DatasetInfo[] = [
  {
    name: 'SMS Spam Dataset (spam.csv)',
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Fspam__24a49fea.csv?alt=media&token=c25b8324-8b11-4f6e-94b1-5c23b7206218',
    label: 'spam-dataset'
  },
  {
    name: 'Combined SMS Dataset (combined_dataset.csv)',
    url: 'https://firebasestorage.googleapis.com/v0/b/blink-451505.firebasestorage.app/o/user-uploads%2FnJwyGNe3NNPeopmn5KADHBcF4672%2Fcombined_dataset__7dc3a3af.csv?alt=media&token=26a9d933-3258-481b-91fa-e3a962a1a436',
    label: 'combined-dataset'
  }
]

export function BiLSTMSMSTraining() {
  const [selectedDataset, setSelectedDataset] = useState<DatasetInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTraining, setIsTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [datasetInfo, setDatasetInfo] = useState<DatasetResult | null>(null)
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null)
  const [trainingProgress, setTrainingProgress] = useState(0)

  const [config, setConfig] = useState({
    epochs: 10,
    batchSize: 32,
    validationSplit: 0.2
  })

  const handleLoadDataset = async (dataset: DatasetInfo) => {
    setSelectedDataset(dataset)
    setIsLoading(true)
    setError(null)
    setDatasetInfo(null)

    try {
      // Call edge function to load CSV data
      const response = await fetch('https://eky2mdxr-ba194aemtb77.deno.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvUrl: dataset.url,
          datasetName: dataset.name
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to load dataset: ${response.statusText}`)
      }

      const data: DatasetResult = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to process dataset')
      }

      setDatasetInfo(data)
      setSuccess(`Dataset loaded successfully! Total records: ${data.totalRecords}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dataset'
      setError(message)
      console.error('Error loading dataset:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetTraining = () => {
    setSelectedDataset(null)
    setDatasetInfo(null)
    setTrainingResult(null)
    setError(null)
    setSuccess(null)
    setTrainingProgress(0)
    setIsTraining(false)
    setIsLoading(false)
  }

  const handleStartTraining = async () => {
    if (!selectedDataset || !datasetInfo) {
      setError('Please load a dataset first')
      return
    }

    setIsTraining(true)
    setError(null)
    setSuccess(null)
    setTrainingResult(null)
    setTrainingProgress(0)

    try {
      // Simulate training progress
      const progressInterval = setInterval(() => {
        setTrainingProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 20
        })
      }, 500)

      // Call edge function to train Bi-LSTM model
      const response = await fetch('https://eky2mdxr-r7kzprae1t00.deno.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvUrl: selectedDataset.url,
          epochs: config.epochs,
          batchSize: config.batchSize,
          validationSplit: config.validationSplit,
          datasetName: selectedDataset.name
        })
      })

      clearInterval(progressInterval)
      setTrainingProgress(100)

      if (!response.ok) {
        throw new Error(`Training failed: ${response.statusText}`)
      }

      const data: TrainingResult = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Training failed')
      }

      setTrainingResult(data)
      setSuccess(
        `Model trained successfully! Model ID: ${data.modelId}\nF1 Score: ${(data.metrics?.f1Score || 0).toFixed(3)}`
      )

      // Save training record to database
      await blink.db.modelVersions.create({
        versionNumber: `bilstm-sms-v${Date.now()}`,
        description: `Bi-LSTM SMS Phishing Detection - ${selectedDataset.name}`,
        trainingDatasetId: 'sms-phishing-dataset',
        trainingStartedAt: new Date().toISOString(),
        trainingCompletedAt: new Date().toISOString(),
        status: 'completed',
        isActive: 1,
        metrics: JSON.stringify(data.metrics || {}),
        config: JSON.stringify(config),
        createdBy: 'admin'
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Training failed'
      setError(message)
      console.error('Error during training:', err)
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bi-LSTM SMS Phishing Detection</CardTitle>
          <CardDescription>Train a Bidirectional LSTM model specifically for SMS phishing detection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dataset Selection */}
          <div className="space-y-4">
            <h3 className="font-semibold">Step 1: Select Dataset</h3>
            <div className="grid gap-3">
              {DATASETS.map((dataset) => (
                <Button
                  key={dataset.label}
                  variant={selectedDataset?.label === dataset.label ? 'default' : 'outline'}
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => handleLoadDataset(dataset)}
                  disabled={isLoading || isTraining}
                >
                  <div className="text-left">
                    <div className="font-medium">{dataset.name}</div>
                    <div className="text-xs opacity-70">Click to load and inspect dataset</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Dataset Information */}
          {datasetInfo && (
            <Card className="bg-secondary/50">
              <CardHeader>
                <CardTitle className="text-lg">Dataset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                    <div className="text-2xl font-bold">{datasetInfo.totalRecords.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phishing Rate</div>
                    <div className="text-2xl font-bold">{datasetInfo.phishingPercentage.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phishing SMS</div>
                    <div className="text-2xl font-bold">{datasetInfo.phishingCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Legitimate SMS</div>
                    <div className="text-2xl font-bold">{datasetInfo.legitimateCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Average Length</div>
                    <div className="text-2xl font-bold">{datasetInfo.averageLength.toFixed(0)} chars</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Max Length</div>
                    <div className="text-2xl font-bold">{datasetInfo.maxLength} chars</div>
                  </div>
                </div>

                {/* Sample Records */}
                <div className="space-y-2">
                  <div className="text-sm font-medium">Sample Records</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {datasetInfo.sampleRecords.slice(0, 5).map((record, idx) => (
                      <div key={idx} className="text-sm p-2 bg-background rounded border">
                        <div className="flex items-start gap-2">
                          <Badge variant={record.label === 'spam' ? 'destructive' : 'default'} className="mt-1">
                            {record.label}
                          </Badge>
                          <div className="text-xs text-muted-foreground flex-1">{record.text}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Training Configuration */}
          {datasetInfo && (
            <div className="space-y-4">
              <h3 className="font-semibold">Step 2: Configure Training</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Epochs</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={config.epochs}
                    onChange={(e) => setConfig({ ...config, epochs: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={isTraining}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Batch Size</label>
                  <input
                    type="number"
                    min="8"
                    max="128"
                    value={config.batchSize}
                    onChange={(e) => setConfig({ ...config, batchSize: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={isTraining}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Validation Split</label>
                  <input
                    type="number"
                    min="0.1"
                    max="0.5"
                    step="0.1"
                    value={config.validationSplit}
                    onChange={(e) => setConfig({ ...config, validationSplit: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={isTraining}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Training Progress */}
          {isTraining && (
            <div className="space-y-3">
              <h3 className="font-semibold">Training in Progress...</h3>
              <Progress value={trainingProgress} className="h-2" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Training Bi-LSTM model on {datasetInfo?.totalRecords.toLocaleString()} SMS messages...
              </div>
            </div>
          )}

          {/* Training Results */}
          {trainingResult && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Training Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Model ID</div>
                  <div className="font-mono text-sm">{trainingResult.modelId}</div>
                </div>

                <Tabs defaultValue="metrics" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
                    <TabsTrigger value="config">Training Config</TabsTrigger>
                  </TabsList>

                  <TabsContent value="metrics" className="space-y-3">
                    {trainingResult.metrics && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-background rounded border">
                          <div className="text-xs text-muted-foreground">Training Accuracy</div>
                          <div className="text-2xl font-bold">
                            {(trainingResult.metrics.finalAccuracy * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-background rounded border">
                          <div className="text-xs text-muted-foreground">Validation Accuracy</div>
                          <div className="text-2xl font-bold">
                            {(trainingResult.metrics.finalValAccuracy * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-3 bg-background rounded border">
                          <div className="text-xs text-muted-foreground">Precision</div>
                          <div className="text-2xl font-bold">{(trainingResult.metrics.precision * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-background rounded border">
                          <div className="text-xs text-muted-foreground">Recall</div>
                          <div className="text-2xl font-bold">{(trainingResult.metrics.recall * 100).toFixed(1)}%</div>
                        </div>
                        <div className="p-3 bg-background rounded border col-span-2">
                          <div className="text-xs text-muted-foreground">F1 Score</div>
                          <div className="text-2xl font-bold">{(trainingResult.metrics.f1Score * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="config" className="space-y-2">
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Epochs:</span>
                        <span className="font-medium">{trainingResult.training.epochs}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Batch Size:</span>
                        <span className="font-medium">{trainingResult.training.batchSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Validation Split:</span>
                        <span className="font-medium">{(trainingResult.training.validationSplit * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Records:</span>
                        <span className="font-medium">{trainingResult.dataset.totalRecords.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Training Records:</span>
                        <span className="font-medium">{trainingResult.dataset.trainingRecords.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Validation Records:</span>
                        <span className="font-medium">{trainingResult.dataset.validationRecords.toLocaleString()}</span>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && !isTraining && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleStartTraining}
              disabled={!datasetInfo || isTraining || isLoading}
              className="gap-2"
            >
              {isTraining && <Loader2 className="h-4 w-4 animate-spin" />}
              {isTraining ? 'Training...' : 'Start Training'}
            </Button>
            {trainingResult && (
              <Button variant="outline" onClick={handleResetTraining}>
                Train Another Model
              </Button>
            )}
          </div>

          {/* Model Architecture Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Bi-LSTM Architecture
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <div>• <strong>Embedding Layer:</strong> Converts characters to dense vectors (128 dimensions)</div>
              <div>• <strong>Bidirectional LSTM:</strong> Processes SMS text from both directions for context</div>
              <div>• <strong>Second Bi-LSTM:</strong> Additional layer for deep feature extraction (128 units each)</div>
              <div>• <strong>Dense Layers:</strong> 64 units with ReLU activation + dropout for regularization</div>
              <div>• <strong>Output:</strong> Sigmoid activation for binary classification (0-1 probability)</div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

export default BiLSTMSMSTraining
