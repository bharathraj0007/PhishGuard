import { useState, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Textarea } from './ui/textarea'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Link, Mail, MessageSquare, QrCode, Shield, AlertTriangle, CheckCircle2, Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'
import type { ScanType, ScanResult } from '../types'
import { blink } from '../lib/blink'
import { addGuestScan } from '../lib/guest-scans'
import { analyzeContent, saveScan, analyzeURLWithFrontendModel, analyzeEmailWithMLModel } from '../lib/phishing-detector'
import { getQRPhishingService } from '../lib/ml/qr-phishing-service'
import { scanSMS, scanContentML } from '../lib/api-client'
import { toast } from 'sonner'

export function Scanner() {
  const [activeTab, setActiveTab] = useState<ScanType>('url')
  const [contentsByType, setContentsByType] = useState<Record<ScanType, string>>({
    url: '',
    email: '',
    sms: '',
    qr: '',
  })
  const content = contentsByType[activeTab] ?? ''
  const updateContent = (value: string) => {
    setContentsByType((prev) => ({ ...prev, [activeTab]: value }))
  }
  const [isScanning, setIsScanning] = useState(false)
  const [resultsByType, setResultsByType] = useState<Record<ScanType, ScanResult | null>>({
    url: null,
    email: null,
    sms: null,
    qr: null,
  })
  const result = resultsByType[activeTab]
  
  // QR Image upload state
  const [qrImageFile, setQrImageFile] = useState<File | null>(null)
  const [qrImagePreview, setQrImagePreview] = useState<string | null>(null)
  const [decodedURL, setDecodedURL] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleScan = async () => {
    // For QR tab, use image analysis if image is uploaded
    if (activeTab === 'qr' && qrImageFile) {
      await handleQRImageScan()
      return
    }

    if (!content.trim()) {
      toast.error('Please enter content to scan')
      return
    }

    setIsScanning(true)
    setResultsByType((prev) => ({ ...prev, [activeTab]: null }))

    try {
      const user = await blink.auth.me().catch(() => null)

      // Use ML models for inference
      let scanResult: ScanResult
      
      // CRITICAL: For URL scans, use FRONTEND TensorFlow.js model ONLY - NO FALLBACK
      if (activeTab === 'url') {
        console.log('🔵 URL scan: Using FRONTEND TensorFlow.js Character-CNN model (ML ONLY)')
        scanResult = await analyzeURLWithFrontendModel(content)
        console.log('✅ URL scan completed with frontend TensorFlow.js ML model')
        console.log('   - ML Model: Character-level CNN')
        console.log('   - NO heuristic fallback used')
        
        // Save to history if user is logged in
        if (user) {
          await saveScan(user.id, activeTab, content, scanResult)
        }
      } else if (activeTab === 'email') {
        // CRITICAL: For Email scans, use TRAINED BiLSTM model (95.96% accuracy)
        console.log('📧 EMAIL scan: Using trained BiLSTM ML model')
        console.log('   - Model: Bidirectional LSTM')
        console.log('   - Training: 18,634 samples')
        console.log('   - Vocabulary: 20,000 words')
        console.log('   - Accuracy: 95.96%')
        
        // Use the analyzeEmailWithMLModel function which has built-in fallback
        scanResult = await analyzeEmailWithMLModel(content)
        
        console.log('✅ Email scan completed with BiLSTM ML model')
        console.log('   - Threat Level:', scanResult.threatLevel)
        console.log('   - Confidence:', scanResult.confidence, '%')
        
        // Save to history if user is logged in
        if (user) {
          await saveScan(user.id, activeTab, content, scanResult)
        }
      } else if (activeTab === 'sms') {
        // CRITICAL: For SMS scans, use backend ML inference via analyze-phishing endpoint
        console.log('📱 SMS scan: Using backend ML inference (Bi-LSTM pattern detection)')
        console.log('   - Endpoint: analyze-phishing')
        console.log('   - Analysis: ML-based pattern matching')
        
        try {
          scanResult = await scanSMS(content, user?.id, !!user)
          console.log('✅ SMS scan completed with backend ML analysis')
          console.log('   - Threat Level:', scanResult.threatLevel)
          console.log('   - Confidence:', scanResult.confidence, '%')
        } catch (mlError) {
          console.warn('SMS backend analysis failed, falling back to heuristic analysis:', mlError)
          // Fall back to local heuristic analysis if backend fails
          scanResult = {
            threatLevel: 'safe',
            confidence: 50,
            indicators: ['⚠️ Could not perform ML analysis, using heuristic patterns'],
            analysis: 'SMS analysis failed. Please try again or use heuristic analysis.',
            recommendations: ['Try scanning again', 'Check your network connection']
          }
          
          // Save manually if backend didn't save
          if (user) {
            await saveScan(user.id, activeTab, content, scanResult)
          }
        }
      } else if (activeTab === 'qr') {
        // For QR text/URL - analyze as a URL using the QR phishing service
        console.log('📱 QR text analysis: Using QR phishing service for URL analysis')
        const qrService = getQRPhishingService()
        const qrAnalysis = await qrService.analyzeQRFromData(content)
        
        // Map QR analysis to ScanResult format
        let threatLevel: 'safe' | 'suspicious' | 'dangerous' = 'safe'
        if (qrAnalysis.threatLevel === 'critical' || qrAnalysis.threatLevel === 'high') {
          threatLevel = 'dangerous'
        } else if (qrAnalysis.threatLevel === 'medium') {
          threatLevel = 'suspicious'
        }
        
        scanResult = {
          threatLevel,
          confidence: Math.round(qrAnalysis.confidence * 100),
          indicators: qrAnalysis.indicators,
          analysis: `QR Content Phishing Analysis\n\n📄 Decoded Content: ${content}\n\n🎯 Risk Assessment:\n• Risk Score: ${qrAnalysis.riskScore}/100\n• Threat Level: ${threatLevel.toUpperCase()}\n• Confidence: ${Math.round(qrAnalysis.confidence * 100)}%\n\n🔍 Analysis Method: TensorFlow.js Character-CNN ML Model\n\n📋 Detected Indicators:\n${qrAnalysis.indicators.map(i => `• ${i}`).join('\n')}`,
          recommendations: threatLevel === 'dangerous'
            ? ['🚫 Do NOT click or visit this URL', '⚠️ Report the content to security team', '🗑️ Delete if received in suspicious context']
            : threatLevel === 'suspicious'
            ? ['⚠️ Verify the URL destination before clicking', '🔍 Check the sender and context', '🛡️ Use additional security tools if unsure']
            : ['✅ Content appears legitimate', '👁️ Safe to proceed with caution', '🔗 Always verify URLs match expected destinations']
        }
        
        // Save to history if user is logged in
        if (user) {
          await saveScan(user.id, activeTab, content, scanResult)
        }
      } else {
        // For other content types - use backend ML API
        try {
          scanResult = await scanContentML({
            content,
            scanType: activeTab,
            userId: user?.id,
            saveToHistory: !!user, // Save to DB if user is logged in
          })
          
          console.log('✅ Used backend ML inference for', activeTab)
        } catch (mlError) {
          console.warn('Backend ML API failed, falling back to client-side analysis:', mlError)
          // Fall back to client-side analysis if backend fails
          scanResult = await analyzeContent(content, activeTab)
          
          // Save manually if backend didn't save
          if (user) {
            await saveScan(user.id, activeTab, content, scanResult)
          }
        }
      }

      setResultsByType((prev) => ({ ...prev, [activeTab]: scanResult }))

      if (!user) {
        // Guest mode: store local scan history in this browser
        addGuestScan({ scanType: activeTab, content, result: scanResult })
      }

      toast.success('Scan completed successfully')
    } catch (error) {
      toast.error('Failed to analyze content. Please try again.')
      console.error(error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleQRImageScan = async () => {
    console.log('🎯 [Scanner] QR Image Scan Started');
    if (!qrImageFile) {
      toast.error('Please upload a QR code image')
      console.warn('🔴 [Scanner] No QR image file selected');
      return
    }

    console.log('📋 [Scanner] QR Image file details:', {
      name: qrImageFile.name,
      size: `${(qrImageFile.size / 1024).toFixed(1)} KB`,
      type: qrImageFile.type
    });

    setIsScanning(true)
    setResultsByType((prev) => ({ ...prev, qr: null }))
    setDecodedURL(null)

    try {
      const user = await blink.auth.me().catch(() => null)
      console.log('👤 [Scanner] User context:', user ? 'Authenticated' : 'Guest mode');

      // ALWAYS use client-side QR decoding first for reliability
      // The backend QR decoder is unreliable - use frontend jsQR library
      console.log('\n📱 [Scanner] Starting client-side QR decoding with jsQR...');
      
      const qrService = getQRPhishingService()
      const analysis = await qrService.analyzeQRImage(qrImageFile)

      console.log('📊 [Scanner] QR Service analysis complete:', {
        status: analysis.status,
        decodedURL: analysis.decodedURL ? analysis.decodedURL.substring(0, 50) + '...' : 'null',
        threatLevel: analysis.threatLevel,
        riskScore: analysis.riskScore
      });

      // Handle decode errors
      if (analysis.status === 'decode_error') {
        console.error('❌ [Scanner] QR decode failed - no QR code pattern found');
        console.error('📋 [Scanner] Analysis status:', analysis.status);
        console.error('⚠️  [Scanner] Error message:', analysis.errorMessage);
        
        // Show a more helpful error message with suggestions
        const errorMsg = analysis.errorMessage || 'Failed to decode QR code. Please ensure the image contains a valid QR code.'
        toast.error(errorMsg)
        
        // Set a result with error details for display
        const errorResult: ScanResult = {
          threatLevel: 'safe',
          confidence: 0,
          indicators: ['QR decode error - no QR code pattern detected'],
          analysis: `❌ QR Code Decoding Failed\n\nReason: ${errorMsg}\n\n💡 Troubleshooting Tips:\n• Ensure the image contains a clear QR code\n• Try adjusting the image brightness or contrast\n• Make sure the QR code is not damaged or obscured\n• Try uploading a higher resolution image\n• Ensure the QR code is centered in the image`,
          recommendations: [
            'Upload a clearer QR code image',
            'Ensure good lighting when capturing the image',
            'Try a different QR code',
            'Check that the entire QR code is visible'
          ]
        }
        
        setResultsByType((prev) => ({ ...prev, qr: errorResult }))
        setIsScanning(false)
        return
      }

      // Handle unsupported content (non-URL QR codes)
      if (analysis.status === 'unsupported_content') {
        console.warn('⚠️  [Scanner] QR code contains non-URL content');
        setDecodedURL(analysis.decodedURL)
        
        // Show the decoded content even if it's not a URL
        const scanResult: ScanResult = {
          threatLevel: 'safe',
          confidence: 100,
          indicators: ['QR code decoded successfully', 'Content is not a URL - cannot analyze for phishing'],
          analysis: `QR Code Content Extracted:\n\n${analysis.decodedURL}\n\n⚠️ Note: This QR code does not contain a URL. Only URL-based QR codes can be analyzed for phishing threats.`,
          recommendations: [
            'QR code contains text/data, not a URL',
            'Manually verify the content if needed',
            'For URL analysis, scan a QR code containing a web link'
          ]
        }
        
        setResultsByType((prev) => ({ ...prev, qr: scanResult }))
        
        if (!user) {
          addGuestScan({ scanType: 'qr', content: analysis.decodedURL || 'QR Code (non-URL)', result: scanResult })
        }
        
        toast.success('QR code decoded successfully (non-URL content)')
        setIsScanning(false)
        return
      }

      // Handle analysis errors
      if (analysis.status === 'analysis_error') {
        console.error('❌ [Scanner] QR analysis error');
        
        const errorMsg = analysis.errorMessage || 'An error occurred while analyzing the QR code.'
        toast.error(errorMsg)
        
        // Set a result with error details for display
        const errorResult: ScanResult = {
          threatLevel: 'safe',
          confidence: 0,
          indicators: ['QR analysis error'],
          analysis: `⚠️ QR Code Analysis Error\n\nError: ${errorMsg}\n\nThe QR code was decoded successfully, but the phishing analysis could not be completed.\n\n💡 Please try again or contact support if the problem persists.`,
          recommendations: [
            'Try analyzing the QR code again',
            'Check your internet connection',
            'Contact support if the issue persists'
          ]
        }
        
        setResultsByType((prev) => ({ ...prev, qr: errorResult }))
        setIsScanning(false)
        return
      }

      // Success case - URL decoded and analyzed
      if (!analysis.decodedURL) {
        console.error('❌ [Scanner] No URL extracted despite success status');
        toast.error('Failed to extract URL from QR code.')
        setIsScanning(false)
        return
      }

      setDecodedURL(analysis.decodedURL)
      console.log('✅ [Scanner] QR code decoded successfully:', analysis.decodedURL.substring(0, 50) + '...');

      // Convert QR analysis to ScanResult format
      // Map QR threat levels to standard levels
      let threatLevel: 'safe' | 'suspicious' | 'dangerous' = 'safe'
      if (analysis.threatLevel === 'critical' || analysis.threatLevel === 'high') {
        threatLevel = 'dangerous'
      } else if (analysis.threatLevel === 'medium') {
        threatLevel = 'suspicious'
      }

      console.log('🎯 [Scanner] Threat level mapped:', {
        qrServiceLevel: analysis.threatLevel,
        mappedLevel: threatLevel,
        riskScore: analysis.riskScore,
        confidence: analysis.confidence
      });
      
      const scanResult: ScanResult = {
        threatLevel,
        confidence: Math.round(analysis.confidence * 100),
        indicators: analysis.indicators,
        analysis: `QR Code Phishing Analysis\n\n📱 Decoded URL: ${analysis.decodedURL}\n\n🎯 Risk Assessment:\n• Risk Score: ${analysis.riskScore}/100\n• Threat Level: ${threatLevel.toUpperCase()}\n• Confidence: ${Math.round(analysis.confidence * 100)}%\n\n🔍 Analysis Method: TensorFlow.js Character-CNN ML Model\n\n📋 Detected Indicators:\n${analysis.indicators.map(i => `• ${i}`).join('\n')}`,
        recommendations: threatLevel === 'dangerous'
          ? ['🚫 Do NOT click or visit this URL', '⚠️ Report the QR code to security team', '🗑️ Delete the image if received in suspicious context']
          : threatLevel === 'suspicious'
          ? ['⚠️ Verify the URL destination before clicking', '🔍 Check the sender and context', '🛡️ Use additional security tools if unsure']
          : ['✅ URL appears legitimate', '👁️ Safe to proceed with caution', '🔗 Always verify URLs match expected destinations']
      }

      setResultsByType((prev) => ({ ...prev, qr: scanResult }))

      if (user) {
        await saveScan(user.id, 'qr', analysis.decodedURL, scanResult)
        console.log('💾 [Scanner] QR scan saved to user history');
      } else {
        addGuestScan({ scanType: 'qr', content: analysis.decodedURL, result: scanResult })
        console.log('💾 [Scanner] QR scan saved to guest history');
      }

      toast.success('QR code analyzed successfully')
      console.log('✅ [Scanner] QR→URL→ML pipeline completed successfully');
      
    } catch (error) {
      console.error('\n❌ [Scanner] QR scan failed with exception');
      console.error('📋 [Scanner] Error:', error instanceof Error ? error.message : String(error));
      console.error('📚 [Scanner] Full error:', error);
      toast.error('Failed to analyze QR code. Please try again.')
    } finally {
      setIsScanning(false)
      console.log('🏁 [Scanner] QR scan operation finished\n');
    }
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setQrImageFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setQrImagePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    
    // Clear previous results
    setResultsByType((prev) => ({ ...prev, qr: null }))
    setDecodedURL(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const clearQRImage = () => {
    setQrImageFile(null)
    setQrImagePreview(null)
    setDecodedURL(null)
    setResultsByType((prev) => ({ ...prev, qr: null }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-success text-success-foreground'
      case 'suspicious': return 'bg-warning text-warning-foreground'
      case 'dangerous': return 'bg-destructive text-destructive-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  const getThreatIcon = (level: string) => {
    switch (level) {
      case 'safe': return <CheckCircle2 className="w-5 h-5" />
      case 'suspicious': return <AlertTriangle className="w-5 h-5" />
      case 'dangerous': return <Shield className="w-5 h-5" />
      default: return null
    }
  }

  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <Card className="glass-card shadow-[0_0_40px_hsl(var(--primary)/0.3)] border-2 border-primary/30 animate-scale-in">
          <CardHeader className="text-center pb-8">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-lg bg-primary/20 mx-auto border-2 border-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.5)]">
              <Shield className="w-10 h-10 text-primary neon-glow" />
            </div>
            <CardTitle className="text-4xl font-display uppercase tracking-wider neon-glow">/Threat Scanner/</CardTitle>
            <CardDescription className="text-lg mt-3 font-mono">
              <span className="text-primary">{'>'}</span> AI-powered phishing detection system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ScanType)}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="url">
                  <Link className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">URL</span>
                </TabsTrigger>
                <TabsTrigger value="email">
                  <Mail className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Email</span>
                </TabsTrigger>
                <TabsTrigger value="sms">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">SMS</span>
                </TabsTrigger>
                <TabsTrigger value="qr">
                  <QrCode className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">QR</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Enter URL to scan</label>
                  <Input
                    placeholder="https://example.com/suspicious-link"
                    value={content}
                    onChange={(e) => updateContent(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Paste email content</label>
                  <Textarea
                    placeholder="Paste the email subject, sender, and body content here..."
                    value={content}
                    onChange={(e) => updateContent(e.target.value)}
                    rows={8}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sms" className="space-y-4 mt-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Paste SMS/text message</label>
                  <Textarea
                    placeholder="Paste the SMS message content here..."
                    value={content}
                    onChange={(e) => updateContent(e.target.value)}
                    rows={6}
                  />
                </div>
              </TabsContent>

              <TabsContent value="qr" className="space-y-4 mt-6">
                {/* Image Upload Section */}
                <div className="space-y-4">
                  <label className="text-sm font-medium block">Upload QR Code Image</label>
                  
                  {!qrImagePreview ? (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-primary bg-primary/10 scale-105'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      }`}
                    >
                      <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground">
                        Supports PNG, JPG, JPEG, WebP (Max 10MB)
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="relative border-2 border-primary/30 rounded-lg p-4 bg-primary/5">
                      <button
                        onClick={clearQRImage}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-shrink-0">
                          <img
                            src={qrImagePreview}
                            alt="QR Code Preview"
                            className="w-48 h-48 object-contain rounded-lg border border-border"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium">{qrImageFile?.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Size: {qrImageFile ? (qrImageFile.size / 1024).toFixed(1) : 0} KB
                          </p>
                          {decodedURL && (
                            <div className="mt-3 p-3 rounded-lg bg-background border border-border">
                              <p className="text-xs font-medium mb-1 text-primary">Decoded URL:</p>
                              <p className="text-sm font-mono break-all">{decodedURL}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or manually enter</span>
                  </div>
                </div>

                {/* Manual Entry Section */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Enter QR code content/URL</label>
                  <Input
                    placeholder="Paste the URL or content from the QR code"
                    value={content}
                    onChange={(e) => updateContent(e.target.value)}
                    disabled={!!qrImageFile}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {qrImageFile 
                      ? 'Clear the uploaded image to manually enter content'
                      : 'Use your phone\'s camera or QR reader app to scan the code, then paste the result here'}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={handleScan}
              disabled={isScanning || (activeTab === 'qr' ? !qrImageFile && !content.trim() : !content.trim())}
              className="w-full mt-8"
              size="lg"
              variant="cyber"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  {activeTab === 'qr' && qrImageFile ? 'Decoding QR Code...' : 'Analyzing...'}
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5 mr-2" />
                  {activeTab === 'qr' && qrImageFile ? 'Analyze QR Image' : 'Execute Scan'}
                </>
              )}
            </Button>

            {result && (
              <div className="mt-10 space-y-6 animate-scale-in">
                <Alert className={`${getThreatColor(result.threatLevel)} border-2 shadow-[0_0_30px_hsl(var(--primary)/0.5)] rounded-xl`}>
                  <div className="flex items-start gap-4 p-2">
                    <div className="p-3 rounded-lg bg-background/30 border border-foreground/20">
                      {getThreatIcon(result.threatLevel)}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-display font-bold text-xl mb-2 uppercase tracking-wide">
                        {result.threatLevel} Content
                      </h4>
                      <p className="text-base opacity-95 font-mono font-medium">
                        Confidence: {result.confidence}%
                      </p>
                    </div>
                  </div>
                </Alert>

                {/* Decoded URL display for QR scans */}
                {activeTab === 'qr' && decodedURL && (
                  <Card className="glass-card border-2 border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                    <CardHeader>
                      <CardTitle className="text-lg font-display uppercase tracking-wider">📱 Decoded QR Code</CardTitle>
                      <CardDescription>Extracted content from the QR image</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-4 rounded-lg bg-background/50 border border-border/50 space-y-3">
                          <p className="text-xs font-medium text-primary uppercase tracking-wide">Extracted Content:</p>
                          <p className="text-sm font-mono break-all text-foreground/90 p-2 bg-background/50 rounded border border-border/30">{decodedURL}</p>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(decodedURL)
                                toast.success('Copied to clipboard')
                              }}
                              className="text-xs px-3 py-1.5 rounded bg-primary/20 hover:bg-primary/30 text-primary transition-colors font-medium"
                            >
                              Copy URL
                            </button>
                            {decodedURL.startsWith('http') && (
                              <a
                                href={decodedURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs px-3 py-1.5 rounded bg-secondary/20 hover:bg-secondary/30 text-secondary-foreground transition-colors font-medium"
                              >
                                Open in Browser
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="glass-card border-2 border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                  <CardHeader>
                    <CardTitle className="text-2xl font-display uppercase tracking-wider">Analysis Report</CardTitle>
                    {activeTab === 'qr' && (
                      <CardDescription className="mt-2 text-sm">
                        <span className="text-primary font-medium">QR Code Analysis Details</span> • Threat Level: <span className="font-bold text-muted-foreground">{result.threatLevel}</span> • Confidence: <span className="font-bold text-muted-foreground">{result.confidence}%</span>
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <pre className="text-base text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap">{result.analysis}</pre>

                    {result.indicators.length > 0 && (
                      <div>
                        <h5 className="font-display font-semibold text-lg mb-3 uppercase tracking-wide">Threat Indicators:</h5>
                        <div className="flex flex-wrap gap-3">
                          {result.indicators.map((indicator, idx) => (
                            <Badge key={idx} variant="secondary" className="px-4 py-2 text-sm rounded-lg font-mono border border-primary/30">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.recommendations.length > 0 && (
                      <div>
                        <h5 className="font-display font-semibold text-lg mb-3 uppercase tracking-wide">Security Actions:</h5>
                        <ul className="space-y-3">
                          {result.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0 shadow-[0_0_10px_hsl(var(--primary)/0.8)]" />
                              <span className="text-base text-muted-foreground leading-relaxed font-mono">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
