/**
 * Dataset Training Pipeline Component
 * 
 * Complete UI for:
 * 1. Populating datasets from CSV/JSON
 * 2. Fetching training data
 * 3. Training models with TensorFlow.js
 * 4. Monitoring progress and results
 */

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { 
  Database, 
  Upload, 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

// Import services
import { 
  populateDatasetFromContent, 
  populateSampleDatasets,
  SAMPLE_DATASETS 
} from '@/lib/ml/kaggle-dataset-populator';
import { 
  fetchActiveDatasets,
  fetchTrainingDataForDataset,
  fetchTrainingDataByScanType,
  getDatasetStatistics 
} from '@/lib/ml/training-data-fetcher';
import { 
  convertToTensors,
  convertToCharTensors,
  convertURLsToTensors,
  balanceDataset 
} from '@/lib/ml/tfjs-data-processor';
import { 
  trainModelPipeline,
  type TrainingProgress 
} from '@/lib/ml/browser-model-trainer';

export function DatasetTrainingPipeline() {
  const [activeTab, setActiveTab] = useState('populate');
  
  // Populate state
  const [csvContent, setCsvContent] = useState('');
  const [datasetType, setDatasetType] = useState<'url' | 'email' | 'sms'>('url');
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [isPopulating, setIsPopulating] = useState(false);
  const [populateResult, setPopulateResult] = useState<any>(null);
  
  // Datasets state
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [datasetStats, setDatasetStats] = useState<any>(null);
  
  // Training state
  const [modelType, setModelType] = useState<'simple' | 'char-cnn' | 'feature'>('simple');
  const [epochs, setEpochs] = useState(10);
  const [batchSize, setBatchSize] = useState(32);
  const [learningRate, setLearningRate] = useState(0.001);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null);
  const [trainingResult, setTrainingResult] = useState<any>(null);
  
  // Load datasets on mount
  useEffect(() => {
    loadDatasets();
  }, []);
  
  // Load dataset stats when selected
  useEffect(() => {
    if (selectedDatasetId) {
      loadDatasetStats(selectedDatasetId);
    }
  }, [selectedDatasetId]);
  
  const loadDatasets = async () => {
    try {
      const data = await fetchActiveDatasets();
      setDatasets(data);
      if (data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
    }
  };
  
  const loadDatasetStats = async (datasetId: string) => {
    try {
      const stats = await getDatasetStatistics(datasetId);
      setDatasetStats(stats);
    } catch (error) {
      console.error('Error loading dataset stats:', error);
    }
  };
  
  const handlePopulateSample = async () => {
    setIsPopulating(true);
    try {
      await populateSampleDatasets('admin');
      toast.success('Sample datasets populated successfully!');
      await loadDatasets();
      setActiveTab('datasets');
    } catch (error) {
      console.error('Error populating sample datasets:', error);
      toast.error('Failed to populate sample datasets');
    } finally {
      setIsPopulating(false);
    }
  };
  
  const handlePopulateCustom = async () => {
    if (!csvContent || !datasetName) {
      toast.error('Please provide CSV content and dataset name');
      return;
    }
    
    setIsPopulating(true);
    try {
      const result = await populateDatasetFromContent(
        csvContent,
        'csv',
        {
          name: datasetName,
          description: datasetDescription,
          datasetType,
          recordCount: 0,
          uploadedBy: 'admin'
        }
      );
      
      setPopulateResult(result);
      toast.success(`Dataset populated: ${result.recordCount} records`);
      await loadDatasets();
      
      // Clear form
      setCsvContent('');
      setDatasetName('');
      setDatasetDescription('');
    } catch (error) {
      console.error('Error populating dataset:', error);
      toast.error('Failed to populate dataset');
    } finally {
      setIsPopulating(false);
    }
  };
  
  const handleTrainModel = async () => {
    if (!selectedDatasetId) {
      toast.error('Please select a dataset');
      return;
    }
    
    setIsTraining(true);
    setTrainingProgress(null);
    setTrainingResult(null);
    
    try {
      // Fetch training data
      toast.info('Fetching training data...');
      const trainingData = await fetchTrainingDataForDataset(selectedDatasetId);
      
      if (!trainingData) {
        toast.error('No training data found');
        return;
      }
      
      toast.info(`Loaded ${trainingData.texts.length} records`);
      
      // Balance dataset
      const balanced = balanceDataset(trainingData.texts, trainingData.labels);
      toast.info(`Balanced dataset: ${balanced.texts.length} records`);
      
      // Convert to tensors
      toast.info('Converting to TensorFlow.js tensors...');
      let processedData;
      
      if (modelType === 'char-cnn') {
        processedData = convertToCharTensors(balanced.texts, balanced.labels, 200);
      } else if (modelType === 'feature' && trainingData.metadata.datasetType === 'url') {
        processedData = convertURLsToTensors(balanced.texts, balanced.labels);
      } else {
        processedData = convertToTensors(balanced.texts, balanced.labels, 100, 5000);
      }
      
      toast.success('Data preprocessed successfully!');
      
      // Train model
      toast.info('Starting model training...');
      const result = await trainModelPipeline(
        modelType,
        processedData,
        {
          epochs,
          batchSize,
          learningRate,
          validationSplit: 0.2
        },
        {
          onEpochEnd: (epoch, progress) => {
            setTrainingProgress(progress);
          },
          onTrainingComplete: (result) => {
            setTrainingResult(result);
            toast.success(`Training complete! Accuracy: ${(result.finalAccuracy * 100).toFixed(2)}%`);
          }
        },
        {
          datasetId: selectedDatasetId,
          userId: 'admin',
          modelName: `${modelType}_${trainingData.metadata.datasetType}_model`
        }
      );
      
      // Cleanup tensors
      processedData.xTrain.dispose();
      processedData.yTrain.dispose();
      processedData.xTest.dispose();
      processedData.yTest.dispose();
      
    } catch (error) {
      console.error('Training error:', error);
      toast.error('Training failed: ' + (error as Error).message);
    } finally {
      setIsTraining(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Dataset Training Pipeline
          </CardTitle>
          <CardDescription>
            Populate datasets, fetch training data, and train ML models in the browser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="populate">
                <Upload className="h-4 w-4 mr-2" />
                Populate
              </TabsTrigger>
              <TabsTrigger value="datasets">
                <Database className="h-4 w-4 mr-2" />
                Datasets
              </TabsTrigger>
              <TabsTrigger value="train">
                <Brain className="h-4 w-4 mr-2" />
                Train
              </TabsTrigger>
            </TabsList>
            
            {/* Populate Tab */}
            <TabsContent value="populate" className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Quick Start</AlertTitle>
                <AlertDescription>
                  Use sample datasets for testing or upload your own CSV data
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <Button 
                  onClick={handlePopulateSample} 
                  disabled={isPopulating}
                  className="w-full"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Populate Sample Datasets (URL, Email, SMS)
                </Button>
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Upload Custom Dataset</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Dataset Name</Label>
                      <Input
                        value={datasetName}
                        onChange={(e) => setDatasetName(e.target.value)}
                        placeholder="My Phishing Dataset"
                      />
                    </div>
                    
                    <div>
                      <Label>Description</Label>
                      <Input
                        value={datasetDescription}
                        onChange={(e) => setDatasetDescription(e.target.value)}
                        placeholder="Description of the dataset"
                      />
                    </div>
                    
                    <div>
                      <Label>Dataset Type</Label>
                      <Select value={datasetType} onValueChange={(value: any) => setDatasetType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="url">URL</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>CSV Content (text, label format)</Label>
                      <Textarea
                        value={csvContent}
                        onChange={(e) => setCsvContent(e.target.value)}
                        placeholder={`text,label\n"Sample text",0\n"Phishing text",1`}
                        rows={8}
                        className="font-mono text-sm"
                      />
                    </div>
                    
                    <Button 
                      onClick={handlePopulateCustom} 
                      disabled={isPopulating}
                      className="w-full"
                    >
                      {isPopulating ? 'Populating...' : 'Populate Custom Dataset'}
                    </Button>
                  </div>
                </div>
                
                {populateResult && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Dataset Populated</AlertTitle>
                    <AlertDescription>
                      Successfully inserted {populateResult.recordCount} records
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
            
            {/* Datasets Tab */}
            <TabsContent value="datasets" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Select Dataset</Label>
                  <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          {dataset.name} ({dataset.datasetType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {datasetStats && (
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Total Records</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{datasetStats.totalRecords}</div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Phishing</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {datasetStats.phishingCount}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Legitimate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {datasetStats.legitimateCount}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Scan Types</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          {Object.entries(datasetStats.scanTypes).map(([type, count]) => (
                            <div key={type} className="text-sm">
                              {type}: {count as number}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Train Tab */}
            <TabsContent value="train" className="space-y-4">
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertTitle>Browser Training</AlertTitle>
                <AlertDescription>
                  Train TensorFlow.js models directly in your browser
                </AlertDescription>
              </Alert>
              
              <div className="space-y-4">
                <div>
                  <Label>Select Dataset</Label>
                  <Select value={selectedDatasetId} onValueChange={setSelectedDatasetId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Model Type</Label>
                  <Select value={modelType} onValueChange={(value: any) => setModelType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple Neural Network</SelectItem>
                      <SelectItem value="char-cnn">Character CNN</SelectItem>
                      <SelectItem value="feature">Feature-based (URLs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Epochs</Label>
                    <Input
                      type="number"
                      value={epochs}
                      onChange={(e) => setEpochs(Number(e.target.value))}
                      min={1}
                      max={100}
                    />
                  </div>
                  
                  <div>
                    <Label>Batch Size</Label>
                    <Input
                      type="number"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                      min={8}
                      max={128}
                    />
                  </div>
                  
                  <div>
                    <Label>Learning Rate</Label>
                    <Input
                      type="number"
                      value={learningRate}
                      onChange={(e) => setLearningRate(Number(e.target.value))}
                      step={0.0001}
                      min={0.0001}
                      max={0.1}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={handleTrainModel} 
                  disabled={isTraining || !selectedDatasetId}
                  className="w-full"
                >
                  {isTraining ? 'Training...' : 'Start Training'}
                </Button>
                
                {trainingProgress && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Training Progress - Epoch {trainingProgress.epoch}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Accuracy</span>
                          <span className="text-sm font-bold">
                            {(trainingProgress.accuracy * 100).toFixed(2)}%
                          </span>
                        </div>
                        <Progress value={trainingProgress.accuracy * 100} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Loss</div>
                          <div className="font-bold">{trainingProgress.loss.toFixed(4)}</div>
                        </div>
                        {trainingProgress.valAccuracy && (
                          <div>
                            <div className="text-muted-foreground">Val Accuracy</div>
                            <div className="font-bold">
                              {(trainingProgress.valAccuracy * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {trainingResult && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Training Complete!</AlertTitle>
                    <AlertDescription>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          <span>Final Accuracy: {(trainingResult.finalAccuracy * 100).toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Training Time: {(trainingResult.trainingTime / 1000).toFixed(1)}s</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Model ID: {trainingResult.modelVersionId}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
