import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Database, RefreshCw, Trash2, Eye } from 'lucide-react';
import { blink } from '@/lib/blink';
import { toast } from 'sonner';
import { formatDistanceToNow } from '@/lib/date-utils';

interface Dataset {
  id: string;
  name: string;
  description: string | null;
  dataset_type: string;
  record_count: number;
  status: string;
  is_active: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

interface TrainingRecord {
  id: string;
  dataset_id: string;
  content: string;
  scan_type: string;
  is_phishing: number;
  threat_level: string | null;
  indicators: string | null;
  notes: string | null;
  created_at: string;
}

export default function DatasetManagement() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showRecordsDialog, setShowRecordsDialog] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      setLoading(true);
      const allDatasets = await blink.db.trainingDatasets.list({
        orderBy: { createdAt: 'desc' },
      });
      setDatasets(allDatasets as unknown as Dataset[]);
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast.error('Failed to load datasets');
    } finally {
      setLoading(false);
    }
  };

  const toggleDatasetStatus = async (datasetId: string, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await blink.db.trainingDatasets.update(datasetId, { isActive: newStatus });
      toast.success(newStatus === 1 ? 'Dataset activated' : 'Dataset deactivated');
      loadDatasets();
    } catch (error) {
      console.error('Error toggling dataset:', error);
      toast.error('Failed to update dataset status');
    }
  };

  const deleteDataset = async (datasetId: string) => {
    if (!confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      return;
    }

    try {
      await blink.db.trainingDatasets.delete(datasetId);
      toast.success('Dataset deleted successfully');
      loadDatasets();
    } catch (error) {
      console.error('Error deleting dataset:', error);
      toast.error('Failed to delete dataset');
    }
  };

  const viewRecords = async (dataset: Dataset) => {
    try {
      setSelectedDataset(dataset);
      setRecordsLoading(true);
      const datasetRecords = await blink.db.trainingRecords.list({
        where: { datasetId: dataset.id },
        orderBy: { createdAt: 'desc' },
        limit: 100,
      });
      setRecords(datasetRecords as unknown as TrainingRecord[]);
      setShowRecordsDialog(true);
    } catch (error) {
      console.error('Error loading records:', error);
      toast.error('Failed to load training records');
    } finally {
      setRecordsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      processing: 'default',
      failed: 'destructive',
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getPhishingBadge = (isPhishing: number) => {
    return isPhishing === 1 ? (
      <Badge variant="destructive">Phishing</Badge>
    ) : (
      <Badge variant="secondary">Legitimate</Badge>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dataset Management</CardTitle>
              <CardDescription>Manage training datasets for ML models</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-lg px-4 py-1">
                {datasets.length} Datasets
              </Badge>
              <Button onClick={loadDatasets} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading datasets...
                    </TableCell>
                  </TableRow>
                ) : datasets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <Database className="mx-auto h-12 w-12 mb-2 opacity-20" />
                      <p>No datasets found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{dataset.name}</div>
                          {dataset.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {dataset.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{dataset.dataset_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{(dataset.record_count ?? 0).toLocaleString()}</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(dataset.status)}</TableCell>
                      <TableCell>
                        <Badge variant={dataset.is_active === 1 ? 'default' : 'outline'}>
                          {dataset.is_active === 1 ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(dataset.created_at, { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewRecords(dataset)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Records
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleDatasetStatus(dataset.id, dataset.is_active)}
                          >
                            {dataset.is_active === 1 ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDataset(dataset.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Training Records Dialog */}
      <Dialog open={showRecordsDialog} onOpenChange={setShowRecordsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Training Records - {selectedDataset?.name}</DialogTitle>
            <DialogDescription>
              Viewing {records.length} records from this dataset
            </DialogDescription>
          </DialogHeader>

          {recordsLoading ? (
            <div className="flex justify-center items-center py-12">
              <p className="text-muted-foreground">Loading records...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-12">
              <Database className="h-12 w-12 mb-2 opacity-20" />
              <p className="text-muted-foreground">No training records found for this dataset</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Content (Preview)</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Threat Level</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="max-w-xs truncate">
                        <div className="font-mono text-xs">{record.content.substring(0, 100)}...</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {record.scan_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPhishingBadge(record.is_phishing)}</TableCell>
                      <TableCell>
                        {record.threat_level ? (
                          <Badge variant="secondary" className="capitalize">
                            {record.threat_level}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(record.created_at, { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
