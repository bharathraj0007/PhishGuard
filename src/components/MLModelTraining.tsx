import { useState, useEffect } from 'react'
import { Brain, Play, CheckCircle, XCircle, Clock, TrendingUp, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Progress } from './ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { toast } from 'react-hot-toast'
import { adminAPI } from '../lib/api'
import BiLSTMSMSTraining from './BiLSTMSMSTraining'
import { CSVUploadTraining } from './CSVUploadTraining'

interface ModelVersion {
  id: string
  versionNumber: string
  description: string
  status: string
  isActive: number
  metrics: string | null
  trainingDuration: number | null
  createdAt: string
  trainingStartedAt: string | null
  trainingCompletedAt: string | null
}

interface Dataset {
  id: string
  name: string
  recordCount: number
}

export function MLModelTraining() {
  const [models, setModels] = useState<ModelVersion[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState(false)
  const [showTrainDialog, setShowTrainDialog] = useState(false)

  // Form state
  const [selectedDataset, setSelectedDataset] = useState('')
  const [versionNumber, setVersionNumber] = useState('')
  const [description, setDescription] = useState('')
  const [epochs, setEpochs] = useState('100')
  const [batchSize, setBatchSize] = useState('32')
  const [learningRate, setLearningRate] = useState('0.001')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [modelsResponse, datasetsResponse] = await Promise.all([
        adminAPI.listModels(),
        adminAPI.listDatasets(),
      ])
      setModels(modelsResponse.models || [])
      setDatasets(datasetsResponse.datasets || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load training data')
    } finally {
      setLoading(false)
    }
  }

  async function handleTrainModel() {
    if (!selectedDataset || !versionNumber.trim()) {
      toast.error('Please select a dataset and provide version number')
      return
    }

    setTraining(true)
    try {
      const response = await adminAPI.trainModel({
        datasetId: selectedDataset,
        versionNumber,
        description: description || undefined,
        config: {
          epochs: parseInt(epochs),
          batchSize: parseInt(batchSize),
          learningRate: parseFloat(learningRate),
        },
      })

      toast.success(`Model training started! Model ID: ${response.modelId}`)
      setShowTrainDialog(false)
      
      // Reset form
      setSelectedDataset('')
      setVersionNumber('')
      setDescription('')
      
      // Reload models
      setTimeout(() => loadData(), 2000)
    } catch (error) {
      console.error('Failed to train model:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start training')
    } finally {
      setTraining(false)
    }
  }

  async function handleDeployModel(modelId: string) {
    if (!confirm('Deploy this model to production? It will become the active model for phishing detection.')) {
      return
    }

    try {
      await adminAPI.deployModel(modelId)
      toast.success('Model deployed successfully!')
      loadData()
    } catch (error) {
      console.error('Failed to deploy model:', error)
      toast.error('Failed to deploy model')
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
      case 'deployed':
        return 'default'
      case 'training':
        return 'secondary'
      case 'failed':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'completed':
      case 'deployed':
        return <CheckCircle className="w-3 h-3" />
      case 'training':
        return <Clock className="w-3 h-3 animate-spin" />
      case 'failed':
        return <XCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  return (
    <div className="space-y-6">
      {/* Tabs Navigation */}
      <Tabs defaultValue="csv-upload" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="csv-upload">CSV Upload</TabsTrigger>
          <TabsTrigger value="general">Model Management</TabsTrigger>
          <TabsTrigger value="bilstm-sms">Bi-LSTM SMS</TabsTrigger>
        </TabsList>

        <TabsContent value="csv-upload" className="space-y-6">
          <CSVUploadTraining />
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Model Training
              </h2>
              <p className="text-sm text-muted-foreground font-mono mt-1">
                &gt; Train AI models for phishing detection
              </p>
            </div>

        <Dialog open={showTrainDialog} onOpenChange={setShowTrainDialog}>
          <DialogTrigger asChild>
            <Button className="font-mono uppercase tracking-wider gap-2">
              <Play className="w-4 h-4" />
              Train New Model
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-display text-primary uppercase">Train New Model</DialogTitle>
              <DialogDescription className="font-mono">
                Configure and start training a new phishing detection model
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="dataset" className="font-mono uppercase text-xs">Training Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id} className="font-mono">
                        {dataset.name} ({dataset.recordCount} records)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="version" className="font-mono uppercase text-xs">Version Number</Label>
                <Input
                  id="version"
                  value={versionNumber}
                  onChange={(e) => setVersionNumber(e.target.value)}
                  placeholder="e.g., 1.0.0"
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="description" className="font-mono uppercase text-xs">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this model version..."
                  className="font-mono"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="epochs" className="font-mono uppercase text-xs">Epochs</Label>
                  <Input
                    id="epochs"
                    type="number"
                    value={epochs}
                    onChange={(e) => setEpochs(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="batch" className="font-mono uppercase text-xs">Batch Size</Label>
                  <Input
                    id="batch"
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label htmlFor="lr" className="font-mono uppercase text-xs">Learning Rate</Label>
                  <Input
                    id="lr"
                    type="number"
                    step="0.0001"
                    value={learningRate}
                    onChange={(e) => setLearningRate(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>

              <Button 
                onClick={handleTrainModel} 
                disabled={training}
                className="w-full font-mono uppercase"
              >
                {training ? 'Starting Training...' : 'Start Training'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Models List */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wider text-sm">Model Versions</CardTitle>
          <CardDescription className="font-mono text-xs">
            {models.length} model version(s) trained
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground font-mono">
              Loading models...
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-mono">No models trained yet</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Train your first model to get started
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono uppercase text-xs">Version</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Status</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Accuracy</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Duration</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Created</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map((model) => {
                  const metrics = model.metrics ? JSON.parse(model.metrics) : null
                  const accuracy = metrics?.estimatedAccuracy 
                    ? (metrics.estimatedAccuracy * 100).toFixed(1) + '%'
                    : 'N/A'

                  return (
                    <TableRow key={model.id}>
                      <TableCell className="font-mono">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            v{model.versionNumber}
                            {Number(model.isActive) > 0 && (
                              <Badge variant="default" className="text-xs uppercase">
                                <Zap className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                          {model.description && (
                            <div className="text-xs text-muted-foreground">{model.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusColor(model.status)}
                          className="uppercase text-xs gap-1"
                        >
                          {getStatusIcon(model.status)}
                          {model.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-primary" />
                          {accuracy}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatDuration(model.trainingDuration)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(model.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {model.status === 'completed' && Number(model.isActive) === 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeployModel(model.id)}
                            className="font-mono uppercase text-xs"
                          >
                            Deploy
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="bilstm-sms" className="space-y-6">
          <BiLSTMSMSTraining />
        </TabsContent>
      </Tabs>
    </div>
  )
}
