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
import { Shield, RefreshCw, PlayCircle, StopCircle } from 'lucide-react';
import { blink } from '@/lib/blink';
import { toast } from 'sonner';
import { formatDistanceToNow } from '@/lib/date-utils';

interface ModelVersion {
  id: string;
  version_number: string;
  model_type: string;
  status: string;
  is_active: number;
  metrics: string | null;
  training_duration: number | null;
  training_completed_at: string | null;
  created_at: string;
}

export default function ModelManagement() {
  const [models, setModels] = useState<ModelVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const allModels = await blink.db.modelVersions.list({
        orderBy: { createdAt: 'desc' },
      });
      setModels(allModels as unknown as ModelVersion[]);
    } catch (error) {
      console.error('Error loading models:', error);
      toast.error('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const toggleModelStatus = async (modelId: string, currentStatus: number) => {
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      await blink.db.modelVersions.update(modelId, { isActive: newStatus });
      toast.success(newStatus === 1 ? 'Model activated' : 'Model deactivated');
      loadModels();
    } catch (error) {
      console.error('Error toggling model:', error);
      toast.error('Failed to update model status');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      trained: 'default',
      training: 'default',
      pending: 'secondary',
      failed: 'destructive',
      deployed: 'default',
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || 'outline'}>{status}</Badge>;
  };

  const getMetricsDisplay = (metricsStr: string | null) => {
    if (!metricsStr) return 'N/A';
    try {
      const metrics = JSON.parse(metricsStr);
      if (metrics.accuracy) return `${Math.round(metrics.accuracy * 100)}%`;
      if (metrics.loss) return `Loss: ${metrics.loss.toFixed(4)}`;
      return 'Trained';
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Model Versions</CardTitle>
                  <CardDescription>Manage ML model versions and deployments</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-lg px-4 py-1">
                    {models.length} Models
                  </Badge>
                  <Button onClick={loadModels} variant="outline" size="sm">
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
                      <TableHead>Version</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading models...
                        </TableCell>
                      </TableRow>
                    ) : models.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          <Shield className="mx-auto h-12 w-12 mb-2 opacity-20" />
                          <p>No models found</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      models.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell>
                            <div className="font-medium font-mono">{model.version_number}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{model.model_type}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(model.status)}</TableCell>
                          <TableCell>
                            <Badge variant={model.is_active === 1 ? 'default' : 'outline'}>
                              {model.is_active === 1 ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{getMetricsDisplay(model.metrics)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {model.training_duration
                              ? `${Math.round(model.training_duration / 1000)}s`
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {model.training_completed_at
                              ? formatDistanceToNow(model.training_completed_at, {
                                  addSuffix: true,
                                })
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleModelStatus(model.id, model.is_active)}
                            >
                              {model.is_active === 1 ? (
                                <>
                                  <StopCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <PlayCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
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
    </div>
  );
}
