import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Progress } from './ui/progress'
import { Alert, AlertDescription } from './ui/alert'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Loader2, Database, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react'
import { blink } from '../lib/blink'
import { generateBatch, getSummaryStats } from '../lib/phishing-data-generator'
import type { ScanType } from '../types'
import toast from 'react-hot-toast'

type PopulationStatus = 'idle' | 'generating' | 'inserting' | 'complete' | 'error'

interface PopulationStats {
  total: number
  phishing: number
  legitimate: number
}

const SCAN_TYPES: ScanType[] = ['link', 'email', 'sms', 'qr']

export function DataPopulationPanel() {
  const [status, setStatus] = useState<PopulationStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [recordsPerType, setRecordsPerType] = useState(500)
  const [selectedTypes, setSelectedTypes] = useState<ScanType[]>(['link', 'email', 'sms', 'qr'])
  const [stats, setStats] = useState<Record<ScanType, PopulationStats>>({
    link: { total: 0, phishing: 0, legitimate: 0 },
    email: { total: 0, phishing: 0, legitimate: 0 },
    sms: { total: 0, phishing: 0, legitimate: 0 },
    qr: { total: 0, phishing: 0, legitimate: 0 }
  })
  const [error, setError] = useState<string | null>(null)
  const [totalInserted, setTotalInserted] = useState(0)

  const toggleScanType = (type: ScanType) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handlePopulate = async () => {
    if (selectedTypes.length === 0) {
      toast.error('Select at least one scan type')
      return
    }

    setStatus('generating')
    setError(null)
    setProgress(0)
    setTotalInserted(0)

    try {
      const datasetId = `ds_bulk_${Date.now()}`
      let inserted = 0

      // Generate batches for each scan type
      const allBatches: Record<ScanType, any[]> = {
        link: [],
        email: [],
        sms: [],
        qr: []
      }

      for (const type of selectedTypes) {
        const batch = generateBatch(datasetId, type, recordsPerType, 0.4)
        allBatches[type] = batch
      }

      const generatedStats = getSummaryStats(allBatches)

      setStatus('inserting')
      setProgress(10)

      // Insert records in batches of 100
      const batchSize = 100
      const totalToInsert = selectedTypes.reduce(
        (sum, type) => sum + allBatches[type].length,
        0
      )

      let processedRecords = 0

      for (const type of selectedTypes) {
        const records = allBatches[type]

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, Math.min(i + batchSize, records.length))

          // SDK automatically converts camelCase to snake_case
          await blink.db.trainingRecords.createMany(batch)

          inserted += batch.length
          processedRecords += batch.length
          setProgress(Math.min(90, 10 + (processedRecords / totalToInsert) * 80))
        }
      }

      setStats(generatedStats)
      setTotalInserted(inserted)
      setStatus('complete')
      setProgress(100)

      toast.success(`Successfully inserted ${inserted} records!`)

      // Auto-reset after 5 seconds
      setTimeout(() => {
        setStatus('idle')
        setProgress(0)
        setTotalInserted(0)
      }, 5000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      setStatus('error')
      toast.error(`Failed to populate database: ${message}`)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-primary" />
            <CardTitle>Bulk Data Population</CardTitle>
          </div>
          <CardDescription>
            Generate and insert 500+ realistic phishing and legitimate records for model training
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {status === 'complete' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Successfully populated database with {totalInserted} records!
              </AlertDescription>
            </Alert>
          )}

          {/* Configuration Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="records-count">Records per Scan Type</Label>
              <Input
                id="records-count"
                type="number"
                min={100}
                max={5000}
                step={100}
                value={recordsPerType}
                onChange={e => setRecordsPerType(Math.max(100, parseInt(e.target.value) || 500))}
                disabled={status !== 'idle'}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {recordsPerType * selectedTypes.length} total records will be generated
              </p>
            </div>

            <div>
              <Label className="mb-3 block">Select Scan Types to Populate</Label>
              <div className="grid grid-cols-2 gap-4">
                {SCAN_TYPES.map(type => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => toggleScanType(type)}
                      disabled={status !== 'idle'}
                    />
                    <Label
                      htmlFor={`type-${type}`}
                      className="cursor-pointer capitalize text-sm"
                    >
                      {type} ({recordsPerType} records)
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Progress Section */}
          {status !== 'idle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {status === 'generating' ? 'Generating records...' : 'Inserting into database...'}
                </span>
                <span className="text-sm text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {status === 'inserting' && (
                <p className="text-xs text-muted-foreground">
                  {totalInserted} / {recordsPerType * selectedTypes.length} records inserted
                </p>
              )}
            </div>
          )}

          {/* Statistics */}
          {status === 'complete' && (
            <div className="grid grid-cols-2 gap-3">
              {selectedTypes.map(type => (
                <div
                  key={type}
                  className="p-3 rounded-lg border border-primary/20 bg-primary/5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium capitalize">{type}</p>
                  </div>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>Total: {stats[type].total}</p>
                    <p className="text-orange-600">Phishing: {stats[type].phishing}</p>
                    <p className="text-green-600">Legitimate: {stats[type].legitimate}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handlePopulate}
            disabled={status !== 'idle' || selectedTypes.length === 0}
            className="w-full"
            size="lg"
          >
            {status === 'idle' ? (
              <>
                <Database className="w-4 h-4 mr-2" />
                Populate Database
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {status === 'generating' ? 'Generating...' : 'Inserting...'}
              </>
            )}
          </Button>

          {/* Info */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>About:</strong> This will generate realistic phishing (40%) and legitimate (60%) records for training ML models. Data is stored in the training_records table.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
