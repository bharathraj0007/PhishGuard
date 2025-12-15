import { useState, useRef } from 'react'
import { Scanner } from '../components/Scanner'
import { History } from '../components/History'
import { Insights } from '../components/Insights'
import { AnalyticsDashboard } from '../components/AnalyticsDashboard'
import { Button } from '../components/ui/button'
import { Shield, History as HistoryIcon, BarChart3, Activity } from 'lucide-react'

type DashboardTab = 'scanner' | 'history' | 'insights' | 'analytics'

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('scanner')
  const scannerRef = useRef<HTMLDivElement>(null)

  const scrollToScanner = () => {
    setActiveTab('scanner')
    setTimeout(() => {
      scannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Dashboard Header */}
        <div className="mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-wider matrix-text">
                /Security_Dashboard/
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                &gt; Scan, analyze, and protect
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-primary/30 overflow-x-auto">
          <Button
            variant={activeTab === 'scanner' ? 'cyber' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('scanner')}
            className="flex items-center gap-2 rounded-b-none"
          >
            <Shield className="w-4 h-4" />
            <span className="font-display uppercase">Scanner</span>
          </Button>
          
          <Button
            variant={activeTab === 'history' ? 'cyber' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('history')}
            className="flex items-center gap-2 rounded-b-none"
          >
            <HistoryIcon className="w-4 h-4" />
            <span className="font-display uppercase">History</span>
          </Button>
          
          <Button
            variant={activeTab === 'analytics' ? 'cyber' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('analytics')}
            className="flex items-center gap-2 rounded-b-none"
          >
            <Activity className="w-4 h-4" />
            <span className="font-display uppercase">Analytics</span>
          </Button>
          
          <Button
            variant={activeTab === 'insights' ? 'cyber' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('insights')}
            className="flex items-center gap-2 rounded-b-none"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="font-display uppercase">Insights</span>
          </Button>
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'scanner' && (
            <div ref={scannerRef}>
              <Scanner />
            </div>
          )}
          
          {activeTab === 'history' && <History />}
          
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          
          {activeTab === 'insights' && <Insights onScanClick={scrollToScanner} />}
        </div>
      </div>
    </div>
  )
}
