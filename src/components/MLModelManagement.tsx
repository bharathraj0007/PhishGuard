import { useState, useEffect } from 'react'
import { Brain, Upload, Play, TestTube, Database, TrendingUp, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Progress } from './ui/progress'
import { toast } from 'sonner'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const API_URLS = {
  datasets: 'https://eky2mdxr-pc3138jybbfh.deno.dev',
  training: 'https://eky2mdxr-r7kzprae1t00.deno.dev',
  testing: 'https://eky2mdxr-dzvvqsy2100w.deno.dev'
}

interface Dataset {
  id: string
  name: string
  description: string
  dataset_type: string
  record_count: number
  status: string
  created_at: string
}

interface ModelVersion {
  id: string
  version_number: string
  description: string
  status: string
  is_active: number
  metrics: string
  training_duration: number
  created_at: string
}

interface ModelTest {
  id: string
  test_name: string
  test_type: string
  status: string
  metrics: string
  results: string
  created_at: string
}

export function MLModelManagement() {
  const [activeTab, setActiveTab] = useState('datasets')
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [models, setModels] = useState<ModelVersion[]>([])
  const [tests, setTests] = useState<ModelTest[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')

  // Dataset creation form
  const [datasetName, setDatasetName] = useState('')
  const [datasetDesc, setDatasetDesc] = useState('')
  const [datasetType, setDatasetType] = useState('mixed')
  const [csvData, setCsvData] = useState('')
  
  // Training form
  const [versionNumber, setVersionNumber] = useState('')
  const [trainingDesc, setTrainingDesc] = useState('')

  // Testing form
  const [testName, setTestName] = useState('')
  const [testType, setTestType] = useState('accuracy')

  useEffect(() => {
    loadDatasets()
    loadModels()
  }, [])

  const loadDatasets = async () => {
    try {
      const res = await fetch(`${API_URLS.datasets}/datasets`)
      const data = await res.json()
      if (data.success) {
        setDatasets(data.datasets || [])
      }
    } catch (error) {
      console.error('Failed to load datasets:', error)
    }
  }

  const loadModels = async () => {
    try {
      const res = await fetch(`${API_URLS.training}/models`)
      const data = await res.json()
      if (data.success) {
        setModels(data.models || [])
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const loadTests = async (modelId: string) => {
    try {
      const res = await fetch(`${API_URLS.testing}/tests/${modelId}`)
      const data = await res.json()
      if (data.success) {
        setTests(data.tests || [])
      }
    } catch (error) {
      console.error('Failed to load tests:', error)
    }
  }

  const createDataset = async () => {
    if (!datasetName.trim()) {
      toast.error('Please enter a dataset name')
      return
    }

    setLoading(true)
    try {
      const userId = localStorage.getItem('userId') || 'admin'
      
      const res = await fetch(`${API_URLS.datasets}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: datasetName,
          description: datasetDesc,
          datasetType,
          userId
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Dataset created successfully')
        setDatasetName('')
        setDatasetDesc('')
        setSelectedDataset(data.datasetId)
        loadDatasets()
      } else {
        toast.error(data.error || 'Failed to create dataset')
      }
    } catch (error) {
      toast.error('Failed to create dataset')
    } finally {
      setLoading(false)
    }
  }

  const uploadCSV = async () => {
    if (!selectedDataset || !csvData.trim()) {
      toast.error('Please select a dataset and provide CSV data')
      return
    }

    setLoading(true)
    try {
      // Parse CSV
      const parseRes = await fetch(`${API_URLS.datasets}/parse-csv`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData })
      })

      const parseData = await parseRes.json()
      if (!parseData.success) {
        toast.error(parseData.error || 'Failed to parse CSV')
        return
      }

      // Upload records
      const uploadRes = await fetch(`${API_URLS.datasets}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: selectedDataset,
          records: parseData.records
        })
      })

      const uploadData = await uploadRes.json()
      if (uploadData.success) {
        toast.success(`Uploaded ${uploadData.recordCount} records`)
        setCsvData('')
        loadDatasets()
      } else {
        toast.error(uploadData.error || 'Failed to upload records')
      }
    } catch (error) {
      toast.error('Failed to process CSV data')
    } finally {
      setLoading(false)
    }
  }

  const startTraining = async () => {
    if (!selectedDataset || !versionNumber.trim()) {
      toast.error('Please select a dataset and enter version number')
      return
    }

    setLoading(true)
    try {
      const userId = localStorage.getItem('userId') || 'admin'
      
      const res = await fetch(`${API_URLS.training}/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: selectedDataset,
          versionNumber,
          description: trainingDesc,
          userId,
          config: {
            epochs: 10,
            batchSize: 32,
            learningRate: 0.001
          }
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Model training completed successfully')
        setVersionNumber('')
        setTrainingDesc('')
        loadModels()
      } else {
        toast.error(data.error || 'Training failed')
      }
    } catch (error) {
      toast.error('Failed to start training')
    } finally {
      setLoading(false)
    }
  }

  const runTest = async () => {
    if (!selectedModel || !testName.trim()) {
      toast.error('Please select a model and enter test name')
      return
    }

    setLoading(true)
    try {
      const userId = localStorage.getItem('userId') || 'admin'
      
      const res = await fetch(`${API_URLS.testing}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelVersionId: selectedModel,
          testName,
          testType,
          testDatasetId: selectedDataset || undefined,
          userId,
          customTests: !selectedDataset ? [
            {
              content: 'http://secure-login.com/verify?token=abc123',
              scanType: 'link',
              expectedThreat: 'phishing'
            },
            {
              content: 'https://www.google.com',
              scanType: 'link',
              expectedThreat: 'safe'
            }
          ] : undefined
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Test completed successfully')
        setTestName('')
        loadTests(selectedModel)
      } else {
        toast.error(data.error || 'Test failed')
      }
    } catch (error) {
      toast.error('Failed to run test')
    } finally {
      setLoading(false)
    }
  }

  const deployModel = async (modelId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URLS.training}/deploy/${modelId}`, {
        method: 'POST'
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Model deployed successfully')
        loadModels()
      } else {
        toast.error(data.error || 'Deployment failed')
      }
    } catch (error) {
      toast.error('Failed to deploy model')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      ready: 'default',
      training: 'secondary',
      completed: 'default',
      deployed: 'default',
      failed: 'destructive',
      error: 'destructive'
    }
    
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50">
          <Brain className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-display font-bold text-primary uppercase tracking-wider">
            ML Model Management
          </h2>
          <p className="text-sm text-muted-foreground font-mono">&gt; Train and test phishing detection models</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-background/60 backdrop-blur-sm border border-primary/30">
          <TabsTrigger value="datasets" className="font-mono uppercase text-xs">
            <Database className="w-4 h-4 mr-2" />
            Datasets
          </TabsTrigger>
          <TabsTrigger value="training" className="font-mono uppercase text-xs">
            <Play className="w-4 h-4 mr-2" />
            Training
          </TabsTrigger>
          <TabsTrigger value="models" className="font-mono uppercase text-xs">
            <Brain className="w-4 h-4 mr-2" />
            Models
          </TabsTrigger>
          <TabsTrigger value="testing" className="font-mono uppercase text-xs">
            <TestTube className="w-4 h-4 mr-2" />
            Testing
          </TabsTrigger>
        </TabsList>

        {/* Datasets Tab */}
        <TabsContent value="datasets" className="space-y-6">
          <Card className="border-primary/30 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display uppercase text-primary">Create Training Dataset</CardTitle>
              <CardDescription>Upload training data for model development</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataset-name">Dataset Name</Label>
                  <Input
                    id="dataset-name"
                    placeholder="e.g., Phishing Links v1"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataset-type">Dataset Type</Label>
                  <Select value={datasetType} onValueChange={setDatasetType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Links</SelectItem>
                      <SelectItem value="email">Emails</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="qr">QR Codes</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataset-desc">Description</Label>
                <Input
                  id="dataset-desc"
                  placeholder="Optional description"
                  value={datasetDesc}
                  onChange={(e) => setDatasetDesc(e.target.value)}
                />
              </div>
              <Button onClick={createDataset} disabled={loading} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Create Dataset
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display uppercase text-primary">Upload Training Data (CSV)</CardTitle>
              <CardDescription>
                Format: content,scanType,isPhishing,threatLevel
                <br />
                Example: http://evil.com,link,true,dangerous
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="select-dataset">Select Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name} ({ds.record_count} records)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="csv-data">CSV Data</Label>
                <Textarea
                  id="csv-data"
                  placeholder="Paste CSV data here..."
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>
              <Button onClick={uploadCSV} disabled={loading || !selectedDataset} className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV Data
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display uppercase text-primary">Available Datasets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {datasets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No datasets created yet</p>
                ) : (
                  datasets.map((ds) => (
                    <div key={ds.id} className="flex items-center justify-between p-4 border border-primary/20 rounded-lg bg-background/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{ds.name}</span>
                          {getStatusBadge(ds.status)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {ds.dataset_type} • {ds.record_count} records
                        </p>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {new Date(ds.created_at).toLocaleDateString()}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-6">
          <Card className="border-primary/30 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display uppercase text-primary">Train New Model</CardTitle>
              <CardDescription>Create a new model version using training data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="train-dataset">Training Dataset</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    {datasets.filter(ds => ds.status === 'ready').map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name} ({ds.record_count} records)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Version Number</Label>
                  <Input
                    id="version"
                    placeholder="e.g., 1.0.0"
                    value={versionNumber}
                    onChange={(e) => setVersionNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="train-desc">Description</Label>
                  <Input
                    id="train-desc"
                    placeholder="Optional"
                    value={trainingDesc}
                    onChange={(e) => setTrainingDesc(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={startTraining} disabled={loading || !selectedDataset} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Start Training
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card className="border-primary/30 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display uppercase text-primary">Model Versions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No models trained yet</p>
                ) : (
                  models.map((model) => {
                    const metrics = model.metrics ? JSON.parse(model.metrics) : {}
                    return (
                      <div key={model.id} className="border border-primary/20 rounded-lg p-4 bg-background/50 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-lg">v{model.version_number}</span>
                              {getStatusBadge(model.status)}
                              {Number(model.is_active) > 0 && (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/50">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{model.description}</p>
                          </div>
                          {model.status === 'completed' && Number(model.is_active) === 0 && (
                            <Button onClick={() => deployModel(model.id)} size="sm" disabled={loading}>
                              <TrendingUp className="w-4 h-4 mr-2" />
                              Deploy
                            </Button>
                          )}
                        </div>
                        
                        {metrics.estimatedAccuracy && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Accuracy</span>
                              <span className="font-mono">{(metrics.estimatedAccuracy * 100).toFixed(1)}%</span>
                            </div>
                            <Progress value={metrics.estimatedAccuracy * 100} />
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-primary/10">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Training Examples</p>
                            <p className="font-mono font-semibold">{metrics.trainingExamples || 0}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-mono font-semibold">{model.training_duration || 0}s</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Created</p>
                            <p className="font-mono text-xs">{new Date(model.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card className="border-primary/30 bg-background/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="font-display uppercase text-primary">Test Model Performance</CardTitle>
              <CardDescription>Evaluate model accuracy and performance metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-model">Select Model</Label>
                <Select value={selectedModel} onValueChange={(value) => {
                  setSelectedModel(value)
                  loadTests(value)
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.filter(m => m.status === 'completed' || m.status === 'deployed').map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        v{m.version_number} {Number(m.is_active) > 0 && '(Active)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-name">Test Name</Label>
                  <Input
                    id="test-name"
                    placeholder="e.g., Accuracy Test 1"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-type">Test Type</Label>
                  <Select value={testType} onValueChange={setTestType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="accuracy">Accuracy</SelectItem>
                      <SelectItem value="precision">Precision</SelectItem>
                      <SelectItem value="recall">Recall</SelectItem>
                      <SelectItem value="f1_score">F1 Score</SelectItem>
                      <SelectItem value="confusion_matrix">Confusion Matrix</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-dataset">Test Dataset (Optional)</Label>
                <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                  <SelectTrigger>
                    <SelectValue placeholder="Use default test data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Default test data</SelectItem>
                    {datasets.filter(ds => ds.status === 'ready').map((ds) => (
                      <SelectItem key={ds.id} value={ds.id}>
                        {ds.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runTest} disabled={loading || !selectedModel} className="w-full">
                <TestTube className="w-4 h-4 mr-2" />
                Run Test
              </Button>
            </CardContent>
          </Card>

          {selectedModel && (
            <Card className="border-primary/30 bg-background/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="font-display uppercase text-primary">Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No tests run yet</p>
                  ) : (
                    tests.map((test) => {
                      const metrics = test.metrics ? JSON.parse(test.metrics) : {}
                      const results = test.results ? JSON.parse(test.results) : {}
                      
                      return (
                        <div key={test.id} className="border border-primary/20 rounded-lg p-4 bg-background/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{test.test_name}</span>
                                {getStatusBadge(test.status)}
                              </div>
                              <p className="text-xs text-muted-foreground capitalize">{test.test_type}</p>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                              {new Date(test.created_at).toLocaleDateString()}
                            </Badge>
                          </div>

                          {test.status === 'completed' && metrics && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-primary/10">
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Accuracy</p>
                                <p className="font-mono font-semibold">{results.accuracy?.toFixed(1) || 0}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Precision</p>
                                <p className="font-mono font-semibold">{results.precision?.toFixed(1) || 0}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">Recall</p>
                                <p className="font-mono font-semibold">{results.recall?.toFixed(1) || 0}%</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">F1 Score</p>
                                <p className="font-mono font-semibold">{results.f1Score?.toFixed(1) || 0}%</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
