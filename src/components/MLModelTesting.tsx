import { useState, useEffect } from 'react'
import { TestTube, Play, BarChart3, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Progress } from './ui/progress'
import { toast } from 'react-hot-toast'
import { adminAPI } from '../lib/api'

interface ModelTest {
  id: string
  modelVersionId: string
  testName: string
  testType: string
  status: string
  results: string | null
  metrics: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

interface ModelVersion {
  id: string
  versionNumber: string
}

interface Dataset {
  id: string
  name: string
}

export function MLModelTesting() {
  const [tests, setTests] = useState<ModelTest[]>([])
  const [models, setModels] = useState<ModelVersion[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [selectedTest, setSelectedTest] = useState<ModelTest | null>(null)

  // Form state
  const [selectedModel, setSelectedModel] = useState('')
  const [testName, setTestName] = useState('')
  const [testType, setTestType] = useState<'validation' | 'performance' | 'accuracy' | 'custom'>('accuracy')
  const [testDataset, setTestDataset] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [testsResponse, modelsResponse, datasetsResponse] = await Promise.all([
        adminAPI.listTests(),
        adminAPI.listModels(),
        adminAPI.listDatasets(),
      ])
      setTests(testsResponse.tests || [])
      setModels(modelsResponse.models || [])
      setDatasets(datasetsResponse.datasets || [])
    } catch (error) {
      console.error('Failed to load data:', error)
      toast.error('Failed to load testing data')
    } finally {
      setLoading(false)
    }
  }

  async function handleRunTest() {
    if (!selectedModel || !testName.trim()) {
      toast.error('Please select a model and provide test name')
      return
    }

    setTesting(true)
    try {
      const response = await adminAPI.testModel({
        modelVersionId: selectedModel,
        testName,
        testType,
        testDatasetId: testDataset || undefined,
      })

      toast.success(`Test started! Test ID: ${response.testId}`)
      setShowTestDialog(false)
      
      // Reset form
      setSelectedModel('')
      setTestName('')
      setTestDataset('')
      
      // Reload tests
      setTimeout(() => loadData(), 2000)
    } catch (error) {
      console.error('Failed to run test:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start test')
    } finally {
      setTesting(false)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
        return 'default'
      case 'running':
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
        return <CheckCircle className="w-3 h-3" />
      case 'running':
        return <Clock className="w-3 h-3 animate-spin" />
      case 'failed':
        return <XCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  function formatMetrics(metricsStr: string | null) {
    if (!metricsStr) return null
    try {
      const metrics = JSON.parse(metricsStr)
      return {
        accuracy: (metrics.accuracy * 100).toFixed(1) + '%',
        precision: (metrics.precision * 100).toFixed(1) + '%',
        recall: (metrics.recall * 100).toFixed(1) + '%',
        f1Score: (metrics.f1Score * 100).toFixed(1) + '%',
      }
    } catch {
      return null
    }
  }

  async function viewTestDetails(test: ModelTest) {
    setSelectedTest(test)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <TestTube className="w-6 h-6" />
            Model Testing
          </h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            &gt; Evaluate model performance and accuracy
          </p>
        </div>

        <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
          <DialogTrigger asChild>
            <Button className="font-mono uppercase tracking-wider gap-2">
              <Play className="w-4 h-4" />
              Run Test
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="font-display text-primary uppercase">Run Model Test</DialogTitle>
              <DialogDescription className="font-mono">
                Test a trained model's performance and accuracy
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="model" className="font-mono uppercase text-xs">Model Version</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.filter(m => m.versionNumber).map((model) => (
                      <SelectItem key={model.id} value={model.id} className="font-mono">
                        v{model.versionNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-name" className="font-mono uppercase text-xs">Test Name</Label>
                <Input
                  id="test-name"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  placeholder="e.g., Accuracy Test Q4 2024"
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="test-type" className="font-mono uppercase text-xs">Test Type</Label>
                <Select value={testType} onValueChange={(v: any) => setTestType(v)}>
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="accuracy">Accuracy Test</SelectItem>
                    <SelectItem value="validation">Validation Test</SelectItem>
                    <SelectItem value="performance">Performance Test</SelectItem>
                    <SelectItem value="custom">Custom Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="test-dataset" className="font-mono uppercase text-xs">
                  Test Dataset (Optional)
                </Label>
                <Select value={testDataset} onValueChange={setTestDataset}>
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Use random test data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" className="font-mono">Random Test Data</SelectItem>
                    {datasets.map((dataset) => (
                      <SelectItem key={dataset.id} value={dataset.id} className="font-mono">
                        {dataset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleRunTest} 
                disabled={testing}
                className="w-full font-mono uppercase"
              >
                {testing ? 'Starting Test...' : 'Run Test'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tests List */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wider text-sm">Test Results</CardTitle>
          <CardDescription className="font-mono text-xs">
            {tests.length} test(s) executed
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground font-mono">
              Loading tests...
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-8">
              <TestTube className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-mono">No tests run yet</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Run your first test to evaluate model performance
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono uppercase text-xs">Test Name</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Type</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Status</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Accuracy</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Date</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => {
                  const metrics = formatMetrics(test.metrics)

                  return (
                    <TableRow key={test.id}>
                      <TableCell className="font-mono">
                        <div className="font-medium">{test.testName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-xs">
                          {test.testType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getStatusColor(test.status)}
                          className="uppercase text-xs gap-1"
                        >
                          {getStatusIcon(test.status)}
                          {test.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {metrics ? (
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            {metrics.accuracy}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(test.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {test.status === 'completed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewTestDetails(test)}
                            className="font-mono uppercase text-xs"
                          >
                            <BarChart3 className="w-3 h-3 mr-1" />
                            View
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

      {/* Test Details Dialog */}
      <Dialog open={!!selectedTest} onOpenChange={(open) => !open && setSelectedTest(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-primary uppercase">
              {selectedTest?.testName}
            </DialogTitle>
            <DialogDescription className="font-mono">
              Detailed test results and metrics
            </DialogDescription>
          </DialogHeader>

          {selectedTest && selectedTest.metrics && (
            <div className="space-y-6 py-4">
              {(() => {
                const metrics = formatMetrics(selectedTest.metrics)
                const results = selectedTest.results ? JSON.parse(selectedTest.results) : null
                
                return (
                  <>
                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card className="bg-background/60">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-mono uppercase">Accuracy</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">{metrics?.accuracy}</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-background/60">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-mono uppercase">Precision</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">{metrics?.precision}</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-background/60">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-mono uppercase">Recall</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">{metrics?.recall}</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-background/60">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-mono uppercase">F1 Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">{metrics?.f1Score}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Analysis */}
                    {results?.evaluation?.analysis && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-mono uppercase text-xs text-primary mb-2">Strengths</h4>
                          <ul className="list-disc list-inside space-y-1 font-mono text-sm">
                            {results.evaluation.analysis.strengths.map((s: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-mono uppercase text-xs text-primary mb-2">Weaknesses</h4>
                          <ul className="list-disc list-inside space-y-1 font-mono text-sm">
                            {results.evaluation.analysis.weaknesses.map((w: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{w}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-mono uppercase text-xs text-primary mb-2">Recommendations</h4>
                          <ul className="list-disc list-inside space-y-1 font-mono text-sm">
                            {results.evaluation.analysis.recommendations.map((r: string, i: number) => (
                              <li key={i} className="text-muted-foreground">{r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
