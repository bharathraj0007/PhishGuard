/**
 * QR Code Phishing Detection Component
 * Admin interface for analyzing QR codes for phishing
 * Uses QR Decoder + URL Model algorithm
 */

import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Spinner } from './ui/spinner';
import { Upload, Zap, AlertTriangle, CheckCircle, Loader2, Copy, Download } from 'lucide-react';
import { getQRPhishingService } from '../lib/ml/qr-phishing-service';
import { getQRDatasetProcessor } from '../lib/ml/qr-dataset-processor';
import toast from 'react-hot-toast';

export function QRPhishingDetection() {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  
  // Single QR analysis
  const [qrImage, setQrImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Batch analysis
  const [batchImages, setBatchImages] = useState<File[]>([]);
  const [isBatchAnalyzing, setIsBatchAnalyzing] = useState(false);
  const [batchResults, setBatchResults] = useState<any>(null);
  const [batchProgress, setBatchProgress] = useState(0);

  // Dataset info
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);

  const qrService = getQRPhishingService();
  const datasetProcessor = getQRDatasetProcessor();

  /**
   * Handle single QR image upload
   */
  const handleSingleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setQrImage(file);
    setAnalysis(null);
  };

  /**
   * Analyze single QR code
   */
  const analyzeQRCode = async () => {
    if (!qrImage) {
      toast.error('Please select a QR code image');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await qrService.analyzeQRImage(qrImage);
      setAnalysis(result);

      if (result.isPhishing) {
        toast.error('⚠️ Phishing QR code detected!');
      } else {
        toast.success('✓ QR code appears safe');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze QR code');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Handle batch image upload
   */
  const handleBatchUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please select image files');
      return;
    }

    setBatchImages(imageFiles);
    setBatchResults(null);
  };

  /**
   * Analyze batch of QR codes
   */
  const analyzeBatchQRCodes = async () => {
    if (batchImages.length === 0) {
      toast.error('Please select QR code images');
      return;
    }

    setIsBatchAnalyzing(true);
    setBatchProgress(0);

    try {
      const results = await qrService.batchAnalyzeQRImages(batchImages);
      setBatchResults(results);

      const message = `✓ Analyzed ${results.totalProcessed} QR codes\n` +
        `${results.phishingDetected} phishing, ${results.clean} clean`;
      toast.success(message);
    } catch (error) {
      console.error('Batch analysis error:', error);
      toast.error('Failed to analyze batch');
    } finally {
      setIsBatchAnalyzing(false);
      setBatchProgress(0);
    }
  };

  /**
   * Load dataset information
   */
  const loadDatasetInfo = async (type: 'archive14' | 'archive12') => {
    setIsLoadingDataset(true);
    try {
      // Call edge function
      const response = await fetch(
        'https://eky2mdxr--ml-qr-dataset-loader.functions.blink.new',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ datasetType: type, limit: 50 })
        }
      );

      if (!response.ok) throw new Error('Failed to load dataset');

      const data = await response.json();
      setDatasetInfo(data.metadata);
      toast.success(`Loaded ${type} dataset info`);
    } catch (error) {
      console.error('Dataset load error:', error);
      toast.error('Failed to load dataset information');
    } finally {
      setIsLoadingDataset(false);
    }
  };

  /**
   * Get threat color
   */
  const getThreatColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  /**
   * Export results
   */
  const exportResults = () => {
    if (!analysis && !batchResults) {
      toast.error('No results to export');
      return;
    }

    const data = analysis || batchResults;
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-analysis-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Results exported');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">QR Code Phishing Detection</h2>
        <p className="text-gray-600 mt-2">
          Analyze QR codes for phishing using QR Decoder + URL Model algorithm
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'single' | 'batch')} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="single">Single QR</TabsTrigger>
          <TabsTrigger value="batch">Batch Analysis</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
        </TabsList>

        {/* Single QR Analysis */}
        <TabsContent value="single" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyze Single QR Code</CardTitle>
              <CardDescription>
                Upload a QR code image to detect phishing attempts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition"
                onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="font-medium">Click to upload QR code image</p>
                <p className="text-sm text-gray-500">PNG, JPG, GIF (up to 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={handleSingleImageUpload}
                  accept="image/*"
                />
              </div>

              {/* Selected Image Preview */}
              {qrImage && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="font-medium mb-2">Selected: {qrImage.name}</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Size: {(qrImage.size / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setQrImage(null);
                        setAnalysis(null);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Clear
                    </Button>
                    <Button
                      onClick={analyzeQRCode}
                      disabled={isAnalyzing}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Analyze QR Code
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {analysis && (
                <div className={`border rounded-lg p-4 ${getThreatColor(analysis.threatLevel)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {analysis.isPhishing ? (
                        <AlertTriangle className="w-6 h-6" />
                      ) : (
                        <CheckCircle className="w-6 h-6" />
                      )}
                      <h3 className="font-bold text-lg">
                        {analysis.isPhishing ? '⚠️ PHISHING DETECTED' : '✓ SAFE'}
                      </h3>
                    </div>
                    <Badge variant="outline">
                      {analysis.threatLevel.toUpperCase()} RISK
                    </Badge>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium mb-1">Risk Score</p>
                      <div className="flex items-center gap-2">
                        <Progress value={analysis.riskScore} className="flex-1" />
                        <span className="font-bold w-12 text-right">{analysis.riskScore}/100</span>
                      </div>
                    </div>

                    {analysis.decodedURL && (
                      <div>
                        <p className="font-medium mb-1">Decoded URL</p>
                        <p className="bg-white bg-opacity-50 p-2 rounded text-xs font-mono break-all">
                          {analysis.decodedURL}
                        </p>
                      </div>
                    )}

                    {analysis.indicators && analysis.indicators.length > 0 && (
                      <div>
                        <p className="font-medium mb-2">Indicators ({analysis.indicators.length})</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.indicators.map((indicator, i) => (
                            <Badge key={i} variant="secondary">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.urlAnalysis && (
                      <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                        <p className="font-medium mb-2">URL Analysis Details</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Domain: {analysis.urlAnalysis.details.domainScore}/100</div>
                          <div>Path: {analysis.urlAnalysis.details.pathScore}/100</div>
                          <div>Parameters: {analysis.urlAnalysis.details.parameterScore}/100</div>
                          <div>Structure: {analysis.urlAnalysis.details.structureScore}/100</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={exportResults}
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Batch Analysis */}
        <TabsContent value="batch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch QR Code Analysis</CardTitle>
              <CardDescription>
                Analyze multiple QR codes at once for phishing detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Batch Upload */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition"
                onClick={() => document.getElementById('batch-input')?.click()}>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="font-medium">Click to upload QR code images</p>
                <p className="text-sm text-gray-500">Select multiple images for batch analysis</p>
                <input
                  id="batch-input"
                  type="file"
                  hidden
                  onChange={handleBatchUpload}
                  accept="image/*"
                  multiple
                />
              </div>

              {/* Selected Images */}
              {batchImages.length > 0 && (
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="font-medium mb-2">Selected {batchImages.length} images</p>
                  <div className="max-h-32 overflow-y-auto mb-4">
                    {batchImages.map((img, i) => (
                      <div key={i} className="text-sm text-gray-600 py-1">
                        {i + 1}. {img.name}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setBatchImages([])}
                      variant="outline"
                      size="sm"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={analyzeBatchQRCodes}
                      disabled={isBatchAnalyzing}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isBatchAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Analyze All
                        </>
                      )}
                    </Button>
                  </div>
                  {isBatchAnalyzing && (
                    <div className="mt-4">
                      <Progress value={batchProgress} />
                    </div>
                  )}
                </div>
              )}

              {/* Batch Results */}
              {batchResults && (
                <div className="space-y-4">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Zap className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      Analysis complete: {batchResults.summary.phishingRate * 100}% phishing rate
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold">{batchResults.totalProcessed}</p>
                          <p className="text-sm text-gray-600">Total Analyzed</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-red-600">{batchResults.phishingDetected}</p>
                          <p className="text-sm text-gray-600">Phishing Detected</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">{batchResults.clean}</p>
                          <p className="text-sm text-gray-600">Clean</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Avg Confidence: {(batchResults.summary.avgConfidence * 100).toFixed(1)}%</p>
                    <Progress value={batchResults.summary.avgConfidence * 100} />
                  </div>

                  <Button
                    onClick={exportResults}
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Batch Results
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Datasets */}
        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Datasets</CardTitle>
              <CardDescription>
                Load and view information about QR code training datasets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Archive14 - Phishing */}
                <Button
                  onClick={() => loadDatasetInfo('archive14')}
                  disabled={isLoadingDataset}
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-2"
                >
                  {isLoadingDataset ? (
                    <Spinner />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  )}
                  <div className="text-center">
                    <p className="font-bold">Archive14</p>
                    <p className="text-xs text-gray-600">Phishing QR Codes</p>
                  </div>
                </Button>

                {/* Archive12 - Benign */}
                <Button
                  onClick={() => loadDatasetInfo('archive12')}
                  disabled={isLoadingDataset}
                  variant="outline"
                  className="h-auto py-6 flex flex-col items-center gap-2"
                >
                  {isLoadingDataset ? (
                    <Spinner />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  )}
                  <div className="text-center">
                    <p className="font-bold">Archive12</p>
                    <p className="text-xs text-gray-600">Benign QR Codes</p>
                  </div>
                </Button>
              </div>

              {/* Dataset Info */}
              {datasetInfo && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Images</p>
                      <p className="text-2xl font-bold">{datasetInfo.totalImages}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Phishing</p>
                      <p className="text-2xl font-bold text-red-600">{datasetInfo.phishingCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Benign</p>
                      <p className="text-2xl font-bold text-green-600">{datasetInfo.benignCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Size</p>
                      <p className="text-2xl font-bold">{(datasetInfo.statistics.avgImageSize / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-medium mb-2">Versions</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(datasetInfo.versions).map(([version, count]: [string, any]) => (
                        <Badge key={version} variant="secondary">
                          {version}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {datasetInfo.sampleImages && (
                    <div>
                      <p className="font-medium mb-2">Sample Images</p>
                      <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                        {datasetInfo.sampleImages.map((img, i) => (
                          <p key={i} className="text-gray-600 truncate">{img}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Algorithm: QR Decoder + URL Model</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p>
              This component uses a combined approach for phishing QR code detection:
            </p>
            <div>
              <p className="font-medium">1. QR Decoder</p>
              <p className="text-gray-600 ml-4">Extracts and decodes URLs from QR code images using pattern recognition</p>
            </div>
            <div>
              <p className="font-medium">2. URL Phishing Model</p>
              <p className="text-gray-600 ml-4">Analyzes decoded URLs for phishing indicators including domain spoofing, suspicious paths, parameters, and structure anomalies</p>
            </div>
            <p className="text-gray-600 mt-4">
              Combined, these create a comprehensive phishing detection system specifically for QR codes with high accuracy across multiple QR versions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
