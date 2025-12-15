import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { getUserAnalytics, type UserAnalyticsResponse } from '../lib/api'
import { blink } from '../lib/blink'
import { computeGuestAnalytics, getGuestScans, onGuestScansUpdated } from '../lib/guest-scans'
import { Activity, Loader2, TrendingUp, Shield, AlertTriangle, CheckCircle2, BarChart3 } from 'lucide-react'
import { Badge } from './ui/badge'

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<UserAnalyticsResponse['analytics'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribeAuth = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await loadAnalytics(state.user.id)
      } else {
        setAnalytics(computeGuestAnalytics(getGuestScans()))
        setLoading(false)
      }
    })

    const unsubscribeGuest = onGuestScansUpdated(() => {
      if (!blink.auth.isAuthenticated()) {
        setAnalytics(computeGuestAnalytics(getGuestScans()))
      }
    })

    return () => {
      unsubscribeAuth()
      unsubscribeGuest()
    }
  }, [])

  const loadAnalytics = async (userId: string) => {
    setLoading(true)
    try {
      const response = await getUserAnalytics(userId)
      setAnalytics(response.analytics)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }


  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    )
  }

  if (!analytics || analytics.totalScans === 0) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <Card className="glass-card border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
            <CardContent className="py-16 text-center">
              <BarChart3 className="w-16 h-16 text-primary/50 mx-auto mb-4" />
              <p className="text-muted-foreground font-mono">
                No analytics data available. Execute scans to populate dashboard.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-display uppercase tracking-wider neon-glow mb-2">
            /Security Analytics/
          </h2>
          <p className="text-muted-foreground font-mono">
            <span className="text-primary">{'>'}</span> Real-time threat detection statistics
          </p>

          {!user && (
            <Alert className="mt-4 glass-card border border-primary/30">
              <Activity className="w-4 h-4 text-primary" />
              <AlertDescription className="font-mono text-xs">
                <span className="text-primary">{'>'}</span> Guest mode: analytics are based on scans saved in this browser.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card border-2 border-primary/30 hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="font-mono text-xs uppercase">Total Scans</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold neon-glow">
                {analytics.totalScans}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-2 border-success/30 hover:shadow-[0_0_30px_hsl(var(--success)/0.4)] transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="font-mono text-xs uppercase">Safe Content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-success">
                {analytics.threatCounts.safe}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {analytics.threatDistribution.safe}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-2 border-warning/30 hover:shadow-[0_0_30px_hsl(var(--warning)/0.4)] transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="font-mono text-xs uppercase">Suspicious</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-warning">
                {analytics.threatCounts.suspicious}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {analytics.threatDistribution.suspicious}% of total
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-2 border-destructive/30 hover:shadow-[0_0_30px_hsl(var(--destructive)/0.4)] transition-all">
            <CardHeader className="pb-3">
              <CardDescription className="font-mono text-xs uppercase">Dangerous</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-display font-bold text-destructive">
                {analytics.threatCounts.dangerous}
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {analytics.threatDistribution.dangerous}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Scan Type Distribution */}
        <Card className="glass-card border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
          <CardHeader>
            <CardTitle className="font-display uppercase tracking-wider">
              /Scan Type Distribution/
            </CardTitle>
            <CardDescription className="font-mono">
              <span className="text-primary">{'>'}</span> Analysis by content type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(analytics.scanTypeCounts).map(([type, count]) => (
                <div
                  key={type}
                  className="p-4 rounded-lg border-2 border-primary/20 glass-card hover:border-primary/50 transition-all"
                >
                  <div className="text-2xl font-display font-bold neon-glow mb-1">{count}</div>
                  <div className="text-sm font-mono uppercase text-muted-foreground">{type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Scans */}
        {analytics.recentScans.length > 0 && (
          <Card className="glass-card border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
            <CardHeader>
              <CardTitle className="font-display uppercase tracking-wider">
                /Recent Activity/
              </CardTitle>
              <CardDescription className="font-mono">
                <span className="text-primary">{'>'}</span> Latest 5 scan results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className="flex items-center gap-4 p-3 rounded-lg border border-primary/20 glass-card"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/50">
                      {scan.threatLevel === 'safe' && <CheckCircle2 className="w-5 h-5 text-success" />}
                      {scan.threatLevel === 'suspicious' && <AlertTriangle className="w-5 h-5 text-warning" />}
                      {scan.threatLevel === 'dangerous' && <Shield className="w-5 h-5 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm uppercase tracking-wide">
                          {scan.scanType}
                        </span>
                        <Badge
                          variant={
                            scan.threatLevel === 'safe'
                              ? 'default'
                              : scan.threatLevel === 'suspicious'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="font-mono"
                        >
                          {scan.threatLevel}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        Confidence: {scan.confidence}%
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(scan.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Average Confidence */}
        <Card className="glass-card border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
          <CardHeader>
            <CardTitle className="font-display uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              /Detection Confidence/
            </CardTitle>
            <CardDescription className="font-mono">
              <span className="text-primary">{'>'}</span> Average AI confidence score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <div className="text-5xl font-display font-bold neon-glow">
                {analytics.averageConfidence.toFixed(1)}
              </div>
              <div className="text-2xl font-mono text-muted-foreground mb-2">%</div>
            </div>
            <div className="w-full bg-primary/20 rounded-full h-3 mt-4 border border-primary/50">
              <div
                className="bg-primary h-full rounded-full shadow-[0_0_15px_hsl(var(--primary)/0.8)] transition-all duration-1000"
                style={{ width: `${analytics.averageConfidence}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
