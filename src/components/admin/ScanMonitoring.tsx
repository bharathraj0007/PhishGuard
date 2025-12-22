import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, Eye } from 'lucide-react';
import { blink } from '@/lib/blink';
import { toast } from 'sonner';
import { formatDistanceToNow, safeISOString } from '@/lib/date-utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Scan {
  id: string;
  user_id: string;
  scan_type: string;
  content: string;
  threat_level: string;
  confidence: number;
  indicators: string;
  analysis: string;
  created_at: string;
}

export default function ScanMonitoring() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterThreat, setFilterThreat] = useState<string>('all');
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    try {
      setLoading(true);
      const allScans = await blink.db.phishingScans.list({
        where: { isDeleted: 0 },
        limit: 100,
        orderBy: { createdAt: 'desc' },
      });
      setScans(allScans as unknown as Scan[]);
    } catch (error) {
      console.error('Error loading scans:', error);
      toast.error('Failed to load scans');
    } finally {
      setLoading(false);
    }
  };

  const exportScans = async () => {
    try {
      const csv = [
        ['Date', 'Type', 'Threat Level', 'Confidence', 'Content', 'Analysis'].join(','),
        ...scans.map(scan =>
          [
            safeISOString(scan.created_at),
            scan.scan_type,
            scan.threat_level,
            `${Math.round(scan.confidence * 100)}%`,
            `"${scan.content.substring(0, 100).replace(/"/g, '""')}"`,
            `"${scan.analysis.substring(0, 100).replace(/"/g, '""')}"`,
          ].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `phishguard-scans-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Scans exported successfully');
    } catch (error) {
      console.error('Error exporting scans:', error);
      toast.error('Failed to export scans');
    }
  };

  const filteredScans = scans.filter(scan => {
    const matchesSearch =
      scan.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scan.analysis.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || scan.scan_type === filterType;
    const matchesThreat = filterThreat === 'all' || scan.threat_level === filterThreat;
    return matchesSearch && matchesType && matchesThreat;
  });

  const getThreatBadge = (level: string) => {
    const variants = {
      high: 'destructive',
      medium: 'default',
      low: 'secondary',
    } as const;
    return <Badge variant={variants[level as keyof typeof variants] || 'outline'}>{level}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Scan Monitoring</CardTitle>
              <CardDescription>Monitor all phishing detection scans in real-time</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-lg px-4 py-1">
                {scans.length} Total Scans
              </Badge>
              <Button onClick={exportScans} variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search scans..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="qr">QR Code</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterThreat} onValueChange={setFilterThreat}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by threat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Threats</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Threat</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading scans...
                    </TableCell>
                  </TableRow>
                ) : filteredScans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No scans found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredScans.map((scan) => (
                    <TableRow key={scan.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(scan.created_at, { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{(scan.scan_type ?? '').toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {scan.content.substring(0, 50)}...
                      </TableCell>
                      <TableCell>{getThreatBadge(scan.threat_level)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {Math.round(scan.confidence * 100)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedScan(scan)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedScan} onOpenChange={() => setSelectedScan(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Scan Details</DialogTitle>
            <DialogDescription>
              {selectedScan && formatDistanceToNow(selectedScan.created_at, { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>
          {selectedScan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Scan Type</div>
                  <Badge variant="outline">{(selectedScan.scan_type ?? '').toUpperCase()}</Badge>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Threat Level</div>
                  {getThreatBadge(selectedScan.threat_level)}
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Confidence</div>
                  <Badge variant="secondary">
                    {Math.round(selectedScan.confidence * 100)}%
                  </Badge>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">User ID</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {selectedScan.user_id.substring(0, 8)}...
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Content</div>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm break-words">{selectedScan.content}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Analysis</div>
                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm">{selectedScan.analysis}</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Indicators</div>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        try {
                          const indicators = JSON.parse(selectedScan.indicators);
                          return Array.isArray(indicators)
                            ? indicators.filter((ind): ind is string => typeof ind === 'string').map((indicator: string, idx: number) => (
                                <Badge key={idx} variant="secondary">
                                  {indicator}
                                </Badge>
                              ))
                            : <span className="text-sm text-muted-foreground">No indicators available</span>;
                        } catch {
                          return <span className="text-sm text-muted-foreground">Error parsing indicators</span>;
                        }
                      })()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
