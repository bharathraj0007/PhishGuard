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
import { analyzeContent, saveScan } from '../lib/phishing-detector'
import { getQRPhishingService } from '../lib/ml/qr-phishing-service'
import { toast } from 'sonner'

export function Scanner() {
  const [activeTab, setActiveTab] = useState<ScanType>('link')
  const [contentsByType, setContentsByType] = useState<Record<ScanType, string>>({
    link: '',
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
    link: null,
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
      // Optional: if an admin/user is logged in, we can still persist scans server-side.
      const user = await blink.auth.me().catch(() => null)

      const scanResult = await analyzeContent(content, activeTab)
      setResultsByType((prev) => ({ ...prev, [activeTab]: scanResult }))

      if (user) {
        await saveScan(user.id, activeTab, content, scanResult)
      } else {
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
    if (!qrImageFile) {
      toast.error('Please upload a QR code image')
      return
    }

    setIsScanning(true)
    setResultsByType((prev) => ({ ...prev, qr: null }))
    setDecodedURL(null)

    try {
      const qrService = getQRPhishingService()
      const analysis = await qrService.analyzeQRImage(qrImageFile)

      if (!analysis.decodedURL) {
        toast.error('Failed to decode QR code. Please ensure the image contains a valid QR code and try again.')
        console.error('QR decode failed - analysis:', analysis)
        setIsScanning(false)
        return
      }

      setDecodedURL(analysis.decodedURL)

      // Convert QR analysis to ScanResult format
      const scanResult: ScanResult = {
        threatLevel: analysis.isPhishing ? 'dangerous' : 'safe',
        confidence: Math.round(analysis.confidence * 100),
        indicators: analysis.indicators,
        analysis: `QR Code decoded to: ${analysis.decodedURL}\n\nRisk Score: ${analysis.riskScore}/100\nThreat Level: ${analysis.threatLevel.toUpperCase()}\n\n${analysis.urlAnalysis ? `URL Analysis:\n- Domain Score: ${analysis.urlAnalysis.details.domainScore}/100\n- Path Score: ${analysis.urlAnalysis.details.pathScore}/100\n- Parameter Score: ${analysis.urlAnalysis.details.parameterScore}/100` : 'No URL analysis available'}`,
        recommendations: analysis.isPhishing 
          ? ['Do not scan or click the QR code', 'Report the QR code to security team', 'Delete the image if suspicious']
          : ['QR code appears safe', 'Verify the destination before visiting']
      }

      setResultsByType((prev) => ({ ...prev, qr: scanResult }))

      // Save to history if authenticated
      const user = await blink.auth.me().catch(() => null)

      if (user) {
        await saveScan(user.id, 'qr', analysis.decodedURL, scanResult)
      } else {
        addGuestScan({ scanType: 'qr', content: analysis.decodedURL, result: scanResult })
      }

      toast.success('QR code analyzed successfully')
    } catch (error) {
      toast.error('Failed to analyze QR code. Please try again.')
      console.error(error)
    } finally {
      setIsScanning(false)
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
                <TabsTrigger value="link">
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

              <TabsContent value="link" className="space-y-4 mt-6">
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

                <Card className="glass-card border-2 border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                  <CardHeader>
                    <CardTitle className="text-2xl font-display uppercase tracking-wider">Analysis Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <p className="text-base text-muted-foreground leading-relaxed font-mono">{result.analysis}</p>

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
