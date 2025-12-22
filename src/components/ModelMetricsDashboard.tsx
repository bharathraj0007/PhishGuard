/**
 * Model Metrics Dashboard Component
 * 
 * Displays ML model performance metrics, validation results, and live testing
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import {
  Brain,
  CheckCircle,
  XCircle,
  TrendingUp,
  Activity,
  Target,
  Zap,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { getValidationService, type ValidationReport } from '../lib/ml/model-validation-service';
import { getDeploymentService } from '../lib/ml/model-deployment-service';
import type { ScanType } from '../types';
import { toast } from 'sonner';

export function ModelMetricsDashboard() {
  const [activeTab, setActiveTab] = useState<ScanType>('link');
  const [validationReports, setValidationReports] = useState<Record<ScanType, ValidationReport | null>>({
    link: null,
    email: null,
    sms: null,
    qr: null
  });
  const [isValidating, setIsValidating] = useState<Record<ScanType, boolean>>({
    link: false,
    email: false,
    sms: false,
    qr: false
  });
  const [modelStatus, setModelStatus] = useState<Record<ScanType, boolean>>({
    link: false,
    email: false,
    sms: false,
    qr: false
  });

  useEffect(() => {
    checkModelStatus();
  }, []);

  const checkModelStatus = () => {
    const deploymentService = getDeploymentService();
    const status = deploymentService.getModelStatus();
    setModelStatus(status);
  };

  const validateModel = async (scanType: ScanType) => {
    setIsValidating(prev => ({ ...prev, [scanType]: true }));
    
    try {
      const validationService = getValidationService();
      const report = await validationService.validateModel(scanType, 200);
      
      setValidationReports(prev => ({ ...prev, [scanType]: report }));
      
      if (report.validated) {
        toast.success(`${scanType.toUpperCase()} model validation passed!`);
      } else {
        toast.warning(`${scanType.toUpperCase()} model needs improvement`);
      }
    } catch (error) {
      toast.error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Validation error:', error);
    } finally {
      setIsValidating(prev => ({ ...prev, [scanType]: false }));
    }
  };

  const renderMetricsCard = (scanType: ScanType) => {
    const report = validationReports[scanType];
    const isLoading = isValidating[scanType];
    const modelAvailable = modelStatus[scanType];

    if (!modelAvailable) {
      return (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Model not trained yet</p>
              <p className="text-sm text-muted-foreground">
                Train this model first to see validation metrics.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Validating model with test dataset...</p>
          <p className="text-sm text-muted-foreground mt-2">This may take 30-60 seconds</p>
        </div>
      );
    }

    if (!report) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Activity className="w-16 h-16 text-muted-foreground" />
          <div className="text-center">
            <h3 className="font-semibold text-lg mb-2">No validation data</h3>
            <p className="text-muted-foreground mb-4">
              Validate the model to see performance metrics
            </p>
            <Button onClick={() => validateModel(scanType)}>
              <Target className="w-4 h-4 mr-2" />
              Validate Model
            </Button>
          </div>
        </div>
      );
    }

    const { metrics, liveTests } = report;
    const liveAccuracy = liveTests.filter(t => t.correct).length / liveTests.length;

    return (
      <div className="space-y-6">
        {/* Validation Status */}
        <Alert className={report.validated ? 'bg-success/10 border-success' : 'bg-warning/10 border-warning'}>
          {report.validated ? (
            <CheckCircle className="w-4 h-4 text-success" />
          ) : (
            <AlertCircle className="w-4 h-4 text-warning" />
          )}
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {report.validated ? 'Model Validated ✓' : 'Model Needs Improvement'}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(report.timestamp).toLocaleDateString()}
              </span>
            </div>
          </AlertDescription>
        </Alert>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <TrendingUp className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{(metrics.accuracy * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Target className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{(metrics.precision * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Precision</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Activity className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{(metrics.recall * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">Recall</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <Zap className="w-8 h-8 text-primary mb-2" />
                <div className="text-2xl font-bold">{(metrics.f1Score * 100).toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground">F1-Score</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confusion Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confusion Matrix</CardTitle>
            <CardDescription>Model prediction breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <div className="text-sm text-muted-foreground mb-1">True Positives</div>
                <div className="text-2xl font-bold text-success">{metrics.confusionMatrix.truePositive}</div>
                <div className="text-xs text-muted-foreground mt-1">Correctly detected phishing</div>
              </div>
              <div className="p-4 rounded-lg bg-success/10 border border-success/30">
                <div className="text-sm text-muted-foreground mb-1">True Negatives</div>
                <div className="text-2xl font-bold text-success">{metrics.confusionMatrix.trueNegative}</div>
                <div className="text-xs text-muted-foreground mt-1">Correctly detected safe</div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="text-sm text-muted-foreground mb-1">False Positives</div>
                <div className="text-2xl font-bold text-destructive">{metrics.confusionMatrix.falsePositive}</div>
                <div className="text-xs text-muted-foreground mt-1">Safe marked as phishing</div>
              </div>
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="text-sm text-muted-foreground mb-1">False Negatives</div>
                <div className="text-2xl font-bold text-destructive">{metrics.confusionMatrix.falseNegative}</div>
                <div className="text-xs text-muted-foreground mt-1">Phishing marked as safe</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Testing Results */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Live Test Results</CardTitle>
                <CardDescription>Real-world sample predictions</CardDescription>
              </div>
              <Badge variant={liveAccuracy >= 0.8 ? 'default' : 'destructive'}>
                {(liveAccuracy * 100).toFixed(0)}% Accuracy
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {liveTests.map((test, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    test.correct
                      ? 'bg-success/5 border-success/30'
                      : 'bg-destructive/5 border-destructive/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {test.correct ? (
                      <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono truncate">{test.input}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>
                          Predicted: <strong className={test.predicted === 'phishing' ? 'text-destructive' : 'text-success'}>
                            {test.predicted}
                          </strong>
                        </span>
                        <span>
                          Actual: <strong>{test.actualLabel}</strong>
                        </span>
                        <span>
                          Confidence: {(test.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dataset Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dataset Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Test Samples</div>
                <div className="text-xl font-semibold">{report.datasetSize}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Threshold</div>
                <div className="text-xl font-semibold">{metrics.threshold}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => validateModel(scanType)}
            variant="outline"
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-validate Model
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          Model Performance Metrics
        </h2>
        <p className="text-muted-foreground mt-2">
          Comprehensive validation metrics for trained ML models
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScanType)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="link">
            URL
            {modelStatus.link && <Badge variant="default" className="ml-2 h-5 px-1 text-xs">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="email">
            Email
            {modelStatus.email && <Badge variant="default" className="ml-2 h-5 px-1 text-xs">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sms">
            SMS
            {modelStatus.sms && <Badge variant="default" className="ml-2 h-5 px-1 text-xs">✓</Badge>}
          </TabsTrigger>
          <TabsTrigger value="qr">
            QR Code
            {modelStatus.qr && <Badge variant="default" className="ml-2 h-5 px-1 text-xs">✓</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="link" className="mt-6">
          {renderMetricsCard('link')}
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          {renderMetricsCard('email')}
        </TabsContent>

        <TabsContent value="sms" className="mt-6">
          {renderMetricsCard('sms')}
        </TabsContent>

        <TabsContent value="qr" className="mt-6">
          {renderMetricsCard('qr')}
        </TabsContent>
      </Tabs>

      <Alert>
        <Brain className="w-4 h-4" />
        <AlertDescription>
          <strong>About Validation:</strong> Models are validated against held-out test datasets and real-world samples.
          Metrics above 70% indicate good performance. Re-validate after retraining to see improvements.
        </AlertDescription>
      </Alert>
    </div>
  );
}
