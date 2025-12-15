import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, Link as LinkIcon, Mail, MessageSquare, QrCode, Trash2, Calendar, TrendingUp, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { toast } from 'sonner'
import { adminAPI } from '../lib/api'
import type { ThreatLevel, ScanType } from '../types'

interface Scan {
  id: string
  userId: string
  scanType: ScanType
  content: string
  threatLevel: ThreatLevel
  confidence: number
  indicators: string
  analysis: string
  createdAt: string
  userEmail?: string
  userName?: string
}

export function ScanManagement({ isActive = true }: { isActive?: boolean }) {
  const [scans, setScans] = useState<Scan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [filterThreat, setFilterThreat] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [stats, setStats] = useState({
    totalScans: 0,
    dangerousCount: 0,
    suspiciousCount: 0,
    safeCount: 0,
    linkScans: 0,
    emailScans: 0,
    smsScans: 0,
    qrScans: 0,
    avgConfidence: 0,
    scansToday: 0,
    scans7Days: 0,
    scans30Days: 0,
  })

  useEffect(() => {
    if (!isActive) return
    loadScans()
    loadStats()
  }, [isActive, filterThreat, filterType])

  const loadScans = async () => {
    try {
      setLoading(true)
      const filters: any = { limit: 100, offset: 0 }
      if (filterThreat !== 'all') filters.threatLevel = filterThreat
      if (filterType !== 'all') filters.scanType = filterType
      
      const data = await adminAPI.listScans(filters)
      if (data && data.scans) {
        setScans(data.scans)
      } else {
        setScans([])
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to load scans'
      toast.error(errorMsg)
      console.error('Load scans error:', error)
      setScans([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await adminAPI.getScanStats()
      if (data && data.stats) {
        setStats({
          totalScans: data.stats.total_scans || 0,
          dangerousCount: data.stats.dangerous_count || 0,
          suspiciousCount: data.stats.suspicious_count || 0,
          safeCount: data.stats.safe_count || 0,
          linkScans: data.stats.link_scans || 0,
          emailScans: data.stats.email_scans || 0,
          smsScans: data.stats.sms_scans || 0,
          qrScans: data.stats.qr_scans || 0,
          avgConfidence: Math.round(data.stats.avg_confidence || 0),
          scansToday: data.stats.scans_today || 0,
          scans7Days: data.stats.scans_7days || 0,
          scans30Days: data.stats.scans_30days || 0,
        })
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error)
      const errorMsg = error?.message || 'Failed to load statistics'
      toast.error(errorMsg)
    }
  }

  const handleViewDetails = (scan: Scan) => {
    setSelectedScan(scan)
    setDetailsDialogOpen(true)
  }

  const handleDelete = (scan: Scan) => {
    setSelectedScan(scan)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedScan) return

    try {
      await adminAPI.deleteScan(selectedScan.id)
      toast.success('Scan deleted successfully')
      setDeleteDialogOpen(false)
      loadScans()
      loadStats()
    } catch (error) {
      toast.error('Failed to delete scan')
      console.error(error)
    }
  }

  const getThreatIcon = (level: ThreatLevel) => {
    switch (level) {
      case 'dangerous':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'suspicious':
        return <Shield className="w-5 h-5 text-yellow-500" />
      case 'safe':
        return <CheckCircle className="w-5 h-5 text-green-500" />
    }
  }

  const getScanTypeIcon = (type: ScanType) => {
    switch (type) {
      case 'link':
        return <LinkIcon className="w-4 h-4" />
      case 'email':
        return <Mail className="w-4 h-4" />
      case 'sms':
        return <MessageSquare className="w-4 h-4" />
      case 'qr':
        return <QrCode className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <span className="text-3xl font-bold text-primary">{stats.totalScans}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Dangerous</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <span className="text-3xl font-bold text-red-500">{stats.dangerousCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Suspicious</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-yellow-500" />
              <span className="text-3xl font-bold text-yellow-500">{stats.suspiciousCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider">Safe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <span className="text-3xl font-bold text-green-500">{stats.safeCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan Type Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <LinkIcon className="w-4 h-4" /> Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-primary">{stats.linkScans}</span>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Mail className="w-4 h-4" /> Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-primary">{stats.emailScans}</span>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-primary">{stats.smsScans}</span>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <QrCode className="w-4 h-4" /> QR Codes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold text-primary">{stats.qrScans}</span>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Scan List */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-2xl text-primary uppercase tracking-wider">Scan Management</CardTitle>
              <CardDescription className="font-mono">&gt; View and manage all phishing scans</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40 font-mono">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="link">Links</SelectItem>
                  <SelectItem value="email">Emails</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="qr">QR Codes</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterThreat} onValueChange={setFilterThreat}>
                <SelectTrigger className="w-40 font-mono">
                  <SelectValue placeholder="All Threats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Threats</SelectItem>
                  <SelectItem value="dangerous">Dangerous</SelectItem>
                  <SelectItem value="suspicious">Suspicious</SelectItem>
                  <SelectItem value="safe">Safe</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-primary/30">
                    <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Content</th>
                    <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">User</th>
                    <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Threat</th>
                    <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Confidence</th>
                    <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-4 font-mono text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-b border-primary/10 hover:bg-primary/5">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getScanTypeIcon(scan.scanType)}
                          <span className="font-mono text-sm capitalize">{scan.scanType}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="truncate font-mono text-sm">{scan.content}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-sm">
                          <div className="font-medium">{scan.userName || 'Anonymous'}</div>
                          <div className="text-xs text-muted-foreground">{scan.userEmail}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getThreatIcon(scan.threatLevel)}
                          <Badge
                            variant={
                              scan.threatLevel === 'dangerous'
                                ? 'destructive'
                                : scan.threatLevel === 'suspicious'
                                ? 'secondary'
                                : 'outline'
                            }
                            className="font-mono capitalize"
                          >
                            {scan.threatLevel}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{Math.round(scan.confidence)}%</td>
                      <td className="py-3 px-4 font-mono text-sm text-muted-foreground">
                        {new Date(scan.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(scan)}
                            className="hover:bg-primary/20 font-mono"
                          >
                            Details
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(scan)}
                            className="hover:bg-destructive/20 text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-primary uppercase tracking-wider">Scan Details</DialogTitle>
            <DialogDescription className="font-mono">&gt; Full analysis report</DialogDescription>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-4">
              <div>
                <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-2">Content</h3>
                <p className="font-mono text-sm bg-muted p-3 rounded-lg">{selectedScan.content}</p>
              </div>
              <div>
                <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-2">Analysis</h3>
                <p className="text-sm">{selectedScan.analysis}</p>
              </div>
              <div>
                <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-2">Indicators</h3>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(selectedScan.indicators).map((indicator: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="font-mono text-xs">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-2">Threat Level</h3>
                  <div className="flex items-center gap-2">
                    {getThreatIcon(selectedScan.threatLevel)}
                    <span className="font-mono capitalize">{selectedScan.threatLevel}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-2">Confidence</h3>
                  <span className="font-mono">{Math.round(selectedScan.confidence)}%</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)} className="font-mono">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-destructive uppercase tracking-wider">Delete Scan</DialogTitle>
            <DialogDescription className="font-mono">
              &gt; Are you sure you want to delete this scan record?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="font-mono">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className="font-mono">
              Delete Scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}