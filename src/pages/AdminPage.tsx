import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Activity, Database, Settings, BarChart, Brain } from 'lucide-react';
import UserManagement from '@/components/admin/UserManagement';
import ScanMonitoring from '@/components/admin/ScanMonitoring';
import SystemSettings from '@/components/admin/SystemSettings';
import DatasetManagement from '@/components/admin/DatasetManagement';
import ModelManagement from '@/components/admin/ModelManagement';
import AdminStats from '@/components/admin/AdminStats';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    // Force refresh of Overview tab when switching to it
    if (tab === 'overview') {
      setRefreshKey(prev => prev + 1);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage users, monitor scans, and configure system settings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-2">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="scans" className="gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Scans</span>
            </TabsTrigger>
            <TabsTrigger value="datasets" className="gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Datasets</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <Brain className="h-4 w-4" />
              <span className="hidden sm:inline">ML Training</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <AdminStats key={refreshKey} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="scans" className="space-y-6">
            <ScanMonitoring />
          </TabsContent>

          <TabsContent value="datasets" className="space-y-6">
            <DatasetManagement />
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <ModelManagement />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
