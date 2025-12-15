import { useState } from 'react'
import { Shield, Activity, Settings as SettingsIcon, Database, Brain } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { ScanManagement } from '../components/ScanManagement'
import { SystemSettings } from '../components/SystemSettings'
import { MLDatasetManagement } from '../components/MLDatasetManagement'
import BrowserMLTraining from '../components/BrowserMLTraining'
import { DatasetTrainingPipeline } from '../components/DatasetTrainingPipeline'

export function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('scans')

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.1),_transparent_50%)]">
      {/* Header */}
      <div className="border-b border-primary/30 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-primary uppercase tracking-wider">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground font-mono">&gt; Manage PhishGuard platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex gap-2 bg-background/60 backdrop-blur-sm border border-primary/30 p-2">
            <TabsTrigger 
              value="scans" 
              className="font-mono uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden lg:inline">Scans</span>
            </TabsTrigger>
            <TabsTrigger 
              value="datasets" 
              className="font-mono uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              <span className="hidden lg:inline">Datasets</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pipeline" 
              className="font-mono uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden lg:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ml-training" 
              className="font-mono uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              <span className="hidden lg:inline">ML Training</span>
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="font-mono uppercase tracking-wider data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2"
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scans" className="animate-fade-in">
            <ScanManagement isActive={activeTab === 'scans'} />
          </TabsContent>

          <TabsContent value="datasets" className="animate-fade-in">
            <MLDatasetManagement />
          </TabsContent>

          <TabsContent value="pipeline" className="animate-fade-in">
            <DatasetTrainingPipeline />
          </TabsContent>

          <TabsContent value="ml-training" className="animate-fade-in">
            <BrowserMLTraining />
          </TabsContent>

          <TabsContent value="settings" className="animate-fade-in">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
