import { useState, useRef } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, X, Play, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Progress } from './ui/progress'
import { Badge } from './ui/badge'
import { toast } from 'react-hot-toast'
import { adminAPI } from '../lib/api'

interface CSVPreview {
  headers: string[]
  rows: string[][]
  totalRows: number
}

type ScanType = 'link' | 'email' | 'sms' | 'qr'

export function CSVUploadTraining() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [scanType, setScanType] = useState<ScanType>('link')
  const [uploading, setUploading] = useState(false)
  const [training, setTraining] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      processFile(droppedFile)
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  function processFile(selectedFile: File) {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
      toast.error('File size must be less than 50MB')
      return
    }

    setFile(selectedFile)

    // Read and preview CSV
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.trim().split('\n').filter(line => line.trim())
        
        if (lines.length < 2) {
          toast.error('CSV file must contain headers and at least one row')
          return
        }

        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1, 11).map(line => 
          line.split(',').map(cell => cell.trim())
        )

        setPreview({
          headers,
          rows,
          totalRows: lines.length - 1
        })

        toast.success(`CSV loaded: ${lines.length - 1} rows found`)
      } catch (error) {
        console.error('Failed to parse CSV:', error)
        toast.error('Failed to parse CSV file')
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    reader.readAsText(selectedFile)
  }

  function clearFile() {
    setFile(null)
    setPreview(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  async function handleUploadAndTrain() {
    if (!file || !preview) {
      toast.error('Please select a CSV file first')
      return
    }

    // Validate CSV structure
    const requiredHeaders = ['content', 'isphishing']
    const headers = preview.headers.map(h => h.toLowerCase())
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    
    if (missingHeaders.length > 0) {
      toast.error(`Missing required columns: ${missingHeaders.join(', ')}`)
      return
    }

    setUploading(true)
    setUploadProgress(10)

    try {
      // Read full file content
      const text = await file.text()
      const lines = text.trim().split('\n').filter(line => line.trim())
      const headerLine = lines[0].toLowerCase().split(',').map(h => h.trim())
      
      setUploadProgress(30)

      // Parse all records
      const records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const record: any = {}
        
        headerLine.forEach((header, index) => {
          record[header] = values[index] || ''
        })

        return {
          content: record.content,
          scanType: scanType,
          isPhishing: record.isphishing?.toLowerCase() === 'true' || record.isphishing === '1',
          threatLevel: record.threatlevel || undefined,
          indicators: record.indicators ? record.indicators.split(';').filter(Boolean) : undefined,
          notes: record.notes || undefined,
        }
      }).filter(r => r.content)

      if (records.length === 0) {
        throw new Error('No valid records found in CSV')
      }

      setUploadProgress(60)

      // Upload dataset
      const datasetName = `${scanType.toUpperCase()} Training - ${new Date().toISOString().split('T')[0]}`
      const response = await adminAPI.uploadDataset({
        name: datasetName,
        description: `Uploaded from CSV: ${file.name}`,
        datasetType: 'mixed',
        records,
      })

      setUploadProgress(100)
      toast.success(`Dataset uploaded: ${records.length} records`)

      // Start training automatically
      setUploading(false)
      setTraining(true)

      const trainingResponse = await adminAPI.trainModel({
        datasetId: response.datasetId,
        versionNumber: `${scanType}-v${Date.now()}`,
        description: `Auto-trained from CSV upload: ${file.name}`,
        config: {
          epochs: 100,
          batchSize: 32,
          learningRate: 0.001,
        },
      })

      toast.success(`Training started! Model ID: ${trainingResponse.modelId}`)
      
      // Clear form
      setTimeout(() => {
        clearFile()
        setTraining(false)
      }, 2000)

    } catch (error) {
      console.error('Failed to upload and train:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
      setTraining(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wider text-lg flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Upload CSV for ML Training
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Upload a CSV file to train the ML model for phishing detection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scan Type Selection */}
          <div>
            <Label className="font-mono uppercase text-xs">Detection Type</Label>
            <Select value={scanType} onValueChange={(v: ScanType) => setScanType(v)}>
              <SelectTrigger className="font-mono mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">URL/Link Detection</SelectItem>
                <SelectItem value="email">Email Detection</SelectItem>
                <SelectItem value="sms">SMS Detection</SelectItem>
                <SelectItem value="qr">QR Code Detection</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Select which type of phishing detection to train
            </p>
          </div>

          {/* Upload Area */}
          <div>
            <Label className="font-mono uppercase text-xs">CSV File</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mt-2 border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-muted-foreground/30 hover:border-primary/50'
              }`}
            >
              {!file ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-sm">
                      Drag and drop your CSV file here
                    </p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      or click to browse
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-mono uppercase text-xs"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground font-mono">
                    Maximum file size: 50MB
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    className="font-mono uppercase text-xs"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* CSV Requirements */}
          <Card className="border-muted-foreground/20 bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                CSV Format Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs font-mono space-y-1">
                <p className="font-medium">Required columns:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li><code className="text-primary">content</code> - The URL, email, SMS text, or QR data</li>
                  <li><code className="text-primary">isPhishing</code> - true/false or 1/0</li>
                </ul>
              </div>
              <div className="text-xs font-mono space-y-1 pt-2">
                <p className="font-medium">Optional columns:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li><code>threatLevel</code> - safe, suspicious, or dangerous</li>
                  <li><code>indicators</code> - semicolon-separated indicators</li>
                  <li><code>notes</code> - additional notes</li>
                </ul>
              </div>
              <div className="text-xs font-mono pt-2 p-2 bg-background/50 rounded border border-muted-foreground/20">
                <p className="font-medium mb-1">Example CSV:</p>
                <code className="text-muted-foreground">
                  content,isPhishing,threatLevel,indicators,notes<br />
                  http://phishing-site.com,true,dangerous,suspicious-domain;no-https,Known scam<br />
                  https://google.com,false,safe,trusted-domain,Legitimate site
                </code>
              </div>
            </CardContent>
          </Card>

          {/* CSV Preview */}
          {preview && (
            <Card className="border-primary/30 bg-background/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-mono uppercase flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  CSV Preview
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  Showing first 10 rows of {preview.totalRows} total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-primary/30">
                        {preview.headers.map((header, idx) => (
                          <th key={idx} className="text-left p-2 font-medium text-primary uppercase">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-muted">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="p-2 text-muted-foreground max-w-xs truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {(uploading || training) && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between text-sm font-mono">
                  <span>{training ? 'Training model...' : 'Uploading dataset...'}</span>
                  <span className="text-primary">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </CardContent>
            </Card>
          )}

          {/* Action Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={clearFile}
              disabled={!file || uploading || training}
              className="font-mono uppercase"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadAndTrain}
              disabled={!file || uploading || training}
              className="font-mono uppercase gap-2"
            >
              {uploading || training ? (
                <>
                  <span className="animate-spin">⟳</span>
                  {uploading ? 'Uploading...' : 'Training...'}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Upload & Train Model
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
