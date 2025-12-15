import { useState, useEffect } from 'react'
import { Upload, Database, Trash2, Plus, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Badge } from './ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { toast } from 'react-hot-toast'
import { adminAPI } from '../lib/api'

interface Dataset {
  id: string
  name: string
  description: string
  datasetType: string
  recordCount: number
  status: string
  uploadedBy: string
  createdAt: string
}

interface ManualRecord {
  id: string
  content: string
  scanType: 'link' | 'email' | 'sms' | 'qr'
  isPhishing: boolean
  threatLevel?: string
  indicators?: string
  notes?: string
}

export function MLDatasetManagement() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  // Form state
  const [datasetName, setDatasetName] = useState('')
  const [datasetDescription, setDatasetDescription] = useState('')
  const [datasetType, setDatasetType] = useState<'phishing' | 'safe' | 'mixed'>('mixed')
  const [csvData, setCsvData] = useState('')
  const [uploadMethod, setUploadMethod] = useState<'csv' | 'manual'>('csv')
  
  // Manual entry state
  const [manualRecords, setManualRecords] = useState<ManualRecord[]>([])
  const [currentRecord, setCurrentRecord] = useState<Partial<ManualRecord>>({
    id: `record_${Date.now()}`,
    content: '',
    scanType: 'link',
    isPhishing: false,
    threatLevel: '',
    indicators: '',
    notes: ''
  })

  useEffect(() => {
    loadDatasets()
  }, [])

  async function loadDatasets() {
    try {
      const response = await adminAPI.listDatasets()
      setDatasets(response.datasets || [])
    } catch (error) {
      console.error('Failed to load datasets:', error)
      toast.error('Failed to load datasets')
    } finally {
      setLoading(false)
    }
  }

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvData(text)
      if (!datasetName) {
        setDatasetName(file.name.replace('.csv', ''))
      }
      toast.success('File loaded successfully')
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    reader.readAsText(file)
  }

  function addManualRecord() {
    if (!currentRecord.content?.trim()) {
      toast.error('Please enter content for the record')
      return
    }

    const newRecord: ManualRecord = {
      id: currentRecord.id || `record_${Date.now()}`,
      content: currentRecord.content,
      scanType: currentRecord.scanType || 'link',
      isPhishing: currentRecord.isPhishing || false,
      threatLevel: currentRecord.threatLevel,
      indicators: currentRecord.indicators,
      notes: currentRecord.notes,
    }

    setManualRecords([...manualRecords, newRecord])
    setCurrentRecord({
      id: `record_${Date.now()}`,
      content: '',
      scanType: 'link',
      isPhishing: false,
      threatLevel: '',
      indicators: '',
      notes: ''
    })
    toast.success('Record added to dataset')
  }

  function removeManualRecord(recordId: string) {
    setManualRecords(manualRecords.filter(r => r.id !== recordId))
    toast.success('Record removed')
  }

  async function handleUploadDataset() {
    if (!datasetName.trim()) {
      toast.error('Please provide dataset name')
      return
    }

    let records: any[] = []

    if (uploadMethod === 'csv') {
      if (!csvData.trim()) {
        toast.error('Please provide CSV data')
        return
      }

      // Parse CSV data
      const lines = csvData.trim().split('\n')
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim())
      
      // Validate headers
      const requiredHeaders = ['content', 'scantype', 'isphishing']
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Expected: content, scanType, isPhishing`)
      }

      // Parse records
      records = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const record: any = {}
        headers.forEach((header, index) => {
          record[header] = values[index] || ''
        })

        return {
          content: record.content,
          scanType: record.scantype.toLowerCase() as 'link' | 'email' | 'sms' | 'qr',
          isPhishing: record.isphishing.toLowerCase() === 'true' || record.isphishing === '1',
          threatLevel: record.threatlevel || undefined,
          indicators: record.indicators ? record.indicators.split(';').filter(Boolean) : undefined,
          notes: record.notes || undefined,
        }
      }).filter(r => r.content && r.scanType)
    } else {
      if (manualRecords.length === 0) {
        toast.error('Please add at least one record to the dataset')
        return
      }

      records = manualRecords.map(r => ({
        content: r.content,
        scanType: r.scanType,
        isPhishing: r.isPhishing,
        threatLevel: r.threatLevel || undefined,
        indicators: r.indicators ? r.indicators.split(';').filter(Boolean) : undefined,
        notes: r.notes || undefined,
      }))
    }

    if (records.length === 0) {
      throw new Error('No valid records found')
    }

    setUploading(true)
    try {
      await adminAPI.uploadDataset({
        name: datasetName,
        description: datasetDescription,
        datasetType,
        records,
      })

      toast.success(`Dataset uploaded successfully with ${records.length} records`)
      setShowUploadDialog(false)
      setDatasetName('')
      setDatasetDescription('')
      setCsvData('')
      setManualRecords([])
      setUploadMethod('csv')
      loadDatasets()
    } catch (error) {
      console.error('Failed to upload dataset:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload dataset')
    } finally {
      setUploading(false)
    }
  }

  async function handleDeleteDataset(datasetId: string) {
    if (!confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return
    }

    try {
      await adminAPI.deleteDataset(datasetId)
      toast.success('Dataset deleted successfully')
      loadDatasets()
    } catch (error) {
      console.error('Failed to delete dataset:', error)
      toast.error('Failed to delete dataset')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-primary uppercase tracking-wider flex items-center gap-2">
            <Database className="w-6 h-6" />
            Training Datasets
          </h2>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            &gt; Upload CSV files or manually add training data for ML models
          </p>
        </div>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="font-mono uppercase tracking-wider gap-2">
              <Upload className="w-4 h-4" />
              Upload Dataset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-primary uppercase">Upload Training Dataset</DialogTitle>
              <DialogDescription className="font-mono">
                Add training data for phishing detection models
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="dataset-name" className="font-mono uppercase text-xs">Dataset Name</Label>
                <Input
                  id="dataset-name"
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g., Phishing URLs 2024"
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="dataset-desc" className="font-mono uppercase text-xs">Description</Label>
                <Textarea
                  id="dataset-desc"
                  value={datasetDescription}
                  onChange={(e) => setDatasetDescription(e.target.value)}
                  placeholder="Describe this dataset..."
                  className="font-mono"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="dataset-type" className="font-mono uppercase text-xs">Dataset Type</Label>
                <Select value={datasetType} onValueChange={(v: any) => setDatasetType(v)}>
                  <SelectTrigger className="font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phishing">Phishing Only</SelectItem>
                    <SelectItem value="safe">Safe Only</SelectItem>
                    <SelectItem value="mixed">Mixed (Phishing + Safe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="font-mono uppercase text-xs">Upload Method</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={uploadMethod === 'csv' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('csv')}
                    className="flex-1 font-mono uppercase text-xs"
                  >
                    CSV Upload
                  </Button>
                  <Button
                    type="button"
                    variant={uploadMethod === 'manual' ? 'default' : 'outline'}
                    onClick={() => setUploadMethod('manual')}
                    className="flex-1 font-mono uppercase text-xs"
                  >
                    Manual Entry
                  </Button>
                </div>
              </div>

              {uploadMethod === 'csv' ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="csv-file" className="font-mono uppercase text-xs">CSV File</Label>
                    <div className="mt-2">
                      <Input
                        id="csv-file"
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="font-mono cursor-pointer"
                      />
                    </div>
                    {csvData && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                        ✓ File loaded: {csvData.split('\n').length - 1} rows
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="csv-data" className="font-mono uppercase text-xs">Or Paste CSV Data</Label>
                    <Textarea
                      id="csv-data"
                      value={csvData}
                      onChange={(e) => setCsvData(e.target.value)}
                      placeholder="content,scanType,isPhishing,threatLevel,indicators,notes&#10;http://phishing-site.com,link,true,dangerous,suspicious-domain;no-https,Known phishing site&#10;https://google.com,link,false,safe,trusted-domain,Legitimate site"
                      className="font-mono text-xs"
                      rows={8}
                    />
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-mono font-semibold text-primary">CSV Format Requirements:</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      <span className="text-primary">Required columns:</span> content, scanType, isPhishing<br />
                      <span className="text-primary">Optional columns:</span> threatLevel, indicators (semicolon-separated), notes<br />
                      <span className="text-primary">scanType values:</span> link, email, sms, qr<br />
                      <span className="text-primary">isPhishing values:</span> true, false, 1, 0<br />
                      <span className="text-primary">threatLevel values:</span> safe, suspicious, dangerous
                    </p>
                    <div className="text-xs font-mono bg-background rounded p-2 mt-2">
                      <span className="text-muted-foreground"># Example CSV:</span><br />
                      <span className="text-green-500">content,scanType,isPhishing,threatLevel,indicators,notes</span><br />
                      <span className="text-foreground">http://phish.com,link,true,dangerous,suspicious-domain;no-https,Phishing site</span><br />
                      <span className="text-foreground">https://google.com,link,false,safe,trusted-domain,Legitimate</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border border-dashed border-primary/30 rounded-lg p-4 space-y-3">
                    <h4 className="font-mono uppercase text-xs font-semibold text-primary">Add Records Manually</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="record-content" className="font-mono uppercase text-xs">Content</Label>
                        <Input
                          id="record-content"
                          value={currentRecord.content || ''}
                          onChange={(e) => setCurrentRecord({...currentRecord, content: e.target.value})}
                          placeholder="URL, email, SMS, or QR code..."
                          className="font-mono text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="record-scantype" className="font-mono uppercase text-xs">Scan Type</Label>
                        <Select 
                          value={currentRecord.scanType} 
                          onValueChange={(v) => setCurrentRecord({...currentRecord, scanType: v as any})}
                        >
                          <SelectTrigger className="font-mono text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="link">Link/URL</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="qr">QR Code</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label htmlFor="is-phishing" className="font-mono uppercase text-xs">Phishing?</Label>
                        <Select 
                          value={currentRecord.isPhishing ? 'true' : 'false'} 
                          onValueChange={(v) => setCurrentRecord({...currentRecord, isPhishing: v === 'true'})}
                        >
                          <SelectTrigger className="font-mono text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">Safe</SelectItem>
                            <SelectItem value="true">Phishing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="threat-level" className="font-mono uppercase text-xs">Threat Level</Label>
                        <Select 
                          value={currentRecord.threatLevel || ''} 
                          onValueChange={(v) => setCurrentRecord({...currentRecord, threatLevel: v})}
                        >
                          <SelectTrigger className="font-mono text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="safe">Safe</SelectItem>
                            <SelectItem value="suspicious">Suspicious</SelectItem>
                            <SelectItem value="dangerous">Dangerous</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="indicators" className="font-mono uppercase text-xs">Indicators</Label>
                        <Input
                          id="indicators"
                          value={currentRecord.indicators || ''}
                          onChange={(e) => setCurrentRecord({...currentRecord, indicators: e.target.value})}
                          placeholder="e.g., spam;bad-domain"
                          className="font-mono text-xs mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="record-notes" className="font-mono uppercase text-xs">Notes</Label>
                      <Textarea
                        id="record-notes"
                        value={currentRecord.notes || ''}
                        onChange={(e) => setCurrentRecord({...currentRecord, notes: e.target.value})}
                        placeholder="Optional notes about this record..."
                        className="font-mono text-xs mt-1"
                        rows={2}
                      />
                    </div>

                    <Button 
                      type="button"
                      onClick={addManualRecord}
                      className="w-full font-mono uppercase text-xs"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Record
                    </Button>
                  </div>

                  {manualRecords.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-mono uppercase text-xs font-semibold">Added Records ({manualRecords.length})</h4>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto border border-primary/20 rounded-lg p-3">
                        {manualRecords.map((record) => (
                          <div key={record.id} className="flex items-center justify-between p-2 bg-muted rounded border border-primary/20">
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs truncate">{record.content}</p>
                              <div className="flex gap-2 items-center mt-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">{record.scanType}</Badge>
                                <Badge 
                                  variant={record.isPhishing ? "default" : "secondary"} 
                                  className="text-xs"
                                >
                                  {record.isPhishing ? 'Phishing' : 'Safe'}
                                </Badge>
                                {record.threatLevel && (
                                  <Badge variant="outline" className="text-xs">{record.threatLevel}</Badge>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeManualRecord(record.id)}
                              className="text-destructive hover:text-destructive ml-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <Button 
                onClick={handleUploadDataset} 
                disabled={uploading || (uploadMethod === 'csv' ? !csvData : manualRecords.length === 0)}
                className="w-full font-mono uppercase"
              >
                {uploading ? 'Uploading...' : 'Upload Dataset'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Datasets List */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-display uppercase tracking-wider text-sm">Available Datasets</CardTitle>
          <CardDescription className="font-mono text-xs">
            {datasets.length} dataset(s) available for training
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground font-mono">
              Loading datasets...
            </div>
          ) : datasets.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-mono">No datasets uploaded yet</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                Upload a dataset to start training models
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono uppercase text-xs">Name</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Type</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-center">Records</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Status</TableHead>
                  <TableHead className="font-mono uppercase text-xs">Created</TableHead>
                  <TableHead className="font-mono uppercase text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {datasets.map((dataset) => (
                  <TableRow key={dataset.id}>
                    <TableCell className="font-mono">
                      <div>
                        <div className="font-medium">{dataset.name}</div>
                        {dataset.description && (
                          <div className="text-xs text-muted-foreground">{dataset.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <Badge variant="outline" className="uppercase">
                        {dataset.datasetType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-center">
                      {dataset.recordCount}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={dataset.status === 'ready' ? 'default' : 'secondary'}
                        className="uppercase text-xs"
                      >
                        {dataset.status === 'ready' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {dataset.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(dataset.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDataset(dataset.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
