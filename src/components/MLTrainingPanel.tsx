import { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Alert, AlertDescription } from './ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Zap,
  Database,
  Brain
} from 'lucide-react'
import { toast } from 'sonner'
import type { Dataset, DatasetSplit } from '../lib/ml/dataset-loader'
import {
  loadFromFile,
  splitDataset,
  balanceDataset,
  getDatasetStats,
  validateDataset
} from '../lib/ml/dataset-loader'
import { getMLService, type MLTrainingProgress } from '../lib/ml/unified-ml-service'

export function MLTrainingPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'email' | 'sms' | 'url'>('email')
  
  // Dataset state
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [datasetSplit, setDatasetSplit] = useState<DatasetSplit | null>(null)
  const [isLoadingDataset, setIsLoadingDataset] = useState(false)
  const [datasetStats, setDatasetStats] = useState<ReturnType<typeof getDatasetStats> | null>(null)

  // Training state
  const [isTraining, setIsTraining] = useState(false)
  const [trainingProgress, setTrainingProgress] = useState<MLTrainingProgress | null>(null)
  const [trainingResult, setTrainingResult] = useState<any>(null)
  const [modelStatus, setModelStatus] = useState(getMLService().getModelStatus())

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      toast.error('Please upload a CSV or JSON file')
      return
    }

    setIsLoadingDataset(true)
    try {
      const loadedDataset = await loadFromFile(file)
      
      // Validate dataset
      const validation = validateDataset(loadedDataset)
      if (!validation.valid) {
        toast.error(`Dataset validation failed:\n${validation.errors.join('\n')}`)
        setIsLoadingDataset(false)
        return
      }

      // Balance and split dataset
      const balanced = balanceDataset(loadedDataset)
      const split = splitDataset(balanced, 0.2, true)
      const stats = getDatasetStats(split.train)

      setDataset(balanced)
      setDatasetSplit(split)
      setDatasetStats(stats)

      toast.success(`Dataset loaded: ${balanced.metadata.totalSamples} samples`)
    } catch (error) {
      toast.error(`Failed to load dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingDataset(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleTrainModel = async () => {
    if (!datasetSplit) {
      toast.error('Please load a dataset first')
      return
    }

    setIsTraining(true)
    setTrainingResult(null)

    try {
      const mlService = getMLService()
      let result

      switch (activeTab) {
        case 'email':
          result = await mlService.trainEmail(
            datasetSplit.train.texts,
            datasetSplit.train.labels,
            (progress) => setTrainingProgress(progress)
          )
          break
        case 'sms':
          result = await mlService.trainSMS(
            datasetSplit.train.texts,
            datasetSplit.train.labels,
            (progress) => setTrainingProgress(progress)
          )
          break
        case 'url':
          result = await mlService.trainURL(
            datasetSplit.train.texts,
            datasetSplit.train.labels,
            (progress) => setTrainingProgress(progress)
          )
          break
      }

      setTrainingResult(result)
      setModelStatus(mlService.getModelStatus())

      if (result?.success) {
        toast.success(result.message)
      } else {
        toast.error(result?.message || 'Training failed')
      }
    } catch (error) {
      toast.error(`Training error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTraining(false)
    }
  }

  const getThreatTypeLabel = (type: string): string => {
    switch (type) {
      case 'email': return 'Email Phishing'
      case 'sms': return 'SMS Phishing'
      case 'url': return 'URL Phishing'
      default: return type
    }
  }

  const getModelReadyStatus = (type: 'email' | 'sms' | 'url'): boolean => {
    switch (type) {
      case 'email': return modelStatus.email.ready
      case 'sms': return modelStatus.sms.ready
      case 'url': return modelStatus.url.ready
    }
  }

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <Card className="glass-card shadow-[0_0_40px_hsl(var(--primary)/0.3)] border-2 border-primary/30 animate-scale-in">
          <CardHeader className="text-center pb-8">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-lg bg-primary/20 mx-auto border-2 border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.5)]">
              <Brain className="w-10 h-10 text-primary neon-glow" />
            </div>
            <CardTitle className="text-4xl font-display uppercase tracking-wider neon-glow">/Model Training/</CardTitle>
            <CardDescription className="text-lg mt-3 font-mono">
              <span className="text-primary">{'>'}</span> Train ML models on your own datasets
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email">Email Model</TabsTrigger>
                <TabsTrigger value="sms">SMS Model</TabsTrigger>
                <TabsTrigger value="url">URL Model</TabsTrigger>
              </TabsList>

              {(['email', 'sms', 'url'] as const).map((type) => (
                <TabsContent key={type} value={type} className="space-y-6 mt-6">
                  {/* Model Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Model Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          {getModelReadyStatus(type) ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                              <span className="text-sm font-medium text-green-600">Ready</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-5 h-5 text-yellow-500" />
                              <span className="text-sm font-medium text-yellow-600">Not trained</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {type === 'email' && `Vocab: ${modelStatus.email.vocabularySize} terms`}
                          {type === 'sms' && `Vocab: ${modelStatus.sms.vocabularySize} tokens`}
                          {type === 'url' && `Charset: ${modelStatus.url.charsetSize} chars`}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Dataset Info</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {datasetStats ? (
                          <div className="space-y-1 text-sm">
                            <p className="font-medium">{datasetStats.totalSamples} samples</p>
                            <p className="text-xs text-muted-foreground">
                              {datasetStats.phishingSamples} phishing / {datasetStats.legitimateSamples} legitimate
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No dataset loaded</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Dataset Upload */}
                  <div>
                    <label className="text-sm font-medium mb-3 block">
                      Load Training Dataset
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                    >
                      <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">Click to upload CSV or JSON</p>
                      <p className="text-xs text-muted-foreground">
                        Format: text column + label column (0/1, true/false, phishing/legitimate)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.json"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Dataset Stats */}
                  {datasetStats && (
                    <Card className="bg-muted/50 border-border">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          Dataset Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Samples</p>
                            <p className="text-lg font-bold">{datasetStats.totalSamples}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phishing Ratio</p>
                            <p className="text-lg font-bold">
                              {(datasetStats.phishingRatio * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Avg Text Length</p>
                            <p className="text-lg font-bold">{datasetStats.avgTextLength}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Max Length</p>
                            <p className="text-lg font-bold">{datasetStats.maxTextLength}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Training Progress */}
                  {isTraining && trainingProgress && (
                    <Card className="bg-primary/10 border-primary/30">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Training in Progress
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Epoch {trainingProgress.epoch} / {trainingProgress.totalEpochs}</span>
                            <span className="font-bold">
                              {((trainingProgress.epoch / trainingProgress.totalEpochs) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-secondary transition-all"
                              style={{
                                width: `${(trainingProgress.epoch / trainingProgress.totalEpochs) * 100}%`
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Loss</p>
                            <p className="font-bold">{trainingProgress.loss.toFixed(4)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Accuracy</p>
                            <p className="font-bold">{(trainingProgress.accuracy * 100).toFixed(2)}%</p>
                          </div>
                          {trainingProgress.valLoss !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground">Val Loss</p>
                              <p className="font-bold">{trainingProgress.valLoss.toFixed(4)}</p>
                            </div>
                          )}
                          {trainingProgress.valAccuracy !== undefined && (
                            <div>
                              <p className="text-xs text-muted-foreground">Val Accuracy</p>
                              <p className="font-bold">{(trainingProgress.valAccuracy * 100).toFixed(2)}%</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Training Result */}
                  {trainingResult && !isTraining && (
                    <Alert className={trainingResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                      <div className="flex items-start gap-3">
                        {trainingResult.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                        )}
                        <div>
                          <p className={`font-bold ${trainingResult.success ? 'text-green-900' : 'text-red-900'}`}>
                            {trainingResult.message}
                          </p>
                          {trainingResult.metrics && (
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-xs opacity-75">Accuracy</p>
                                <p className="font-bold">
                                  {(trainingResult.metrics.accuracy * 100).toFixed(2)}%
                                </p>
                              </div>
                              <div>
                                <p className="text-xs opacity-75">Loss</p>
                                <p className="font-bold">{trainingResult.metrics.loss.toFixed(4)}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Alert>
                  )}

                  {/* Train Button */}
                  <Button
                    onClick={handleTrainModel}
                    disabled={!datasetSplit || isTraining || isLoadingDataset}
                    className="w-full"
                    size="lg"
                    variant="cyber"
                  >
                    {isTraining ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Training {getThreatTypeLabel(activeTab)}...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Train {getThreatTypeLabel(activeTab)} Model
                      </>
                    )}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>

            {/* Info Box */}
            <Alert className="bg-primary/10 border-primary/30">
              <Database className="w-4 h-4" />
              <AlertDescription className="text-sm">
                <strong>Dataset Format:</strong> CSV or JSON with two columns: text content and label (0=legitimate, 1=phishing).
                Models are trained entirely in your browser with no data sent to servers.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
