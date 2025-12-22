import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { blink } from '../lib/blink'
import { clearGuestScans, getGuestScans, onGuestScansUpdated } from '../lib/guest-scans'
import { History as HistoryIcon, Link, Mail, MessageSquare, QrCode, Loader2, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from '../lib/date-utils'
import type { PhishingScan } from '../types'
import { Button } from './ui/button'
import { getUserScans } from '../lib/phishing-detector'

export function History() {
  const [scans, setScans] = useState<PhishingScan[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const unsubscribeAuth = blink.auth.onAuthStateChanged(async (state) => {
      setUser(state.user)
      if (state.user) {
        await loadScans(state.user.id)
      } else {
        setScans(getGuestScans())
        setLoading(false)
      }
    })

    const unsubscribeGuest = onGuestScansUpdated(() => {
      if (!blink.auth.isAuthenticated()) {
        setScans(getGuestScans())
      }
    })

    return () => {
      unsubscribeAuth()
      unsubscribeGuest()
    }
  }, [])

  const loadScans = async (userId: string) => {
    setLoading(true)
    try {
      const userScans = await getUserScans(userId, 20)
      setScans(userScans as any)
    } catch (error) {
      console.error('Failed to load scans:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScanIcon = (type: string) => {
    switch (type) {
      case 'url':
      case 'link': return <Link className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      case 'sms': return <MessageSquare className="w-4 h-4" />
      case 'qr': return <QrCode className="w-4 h-4" />
      default: return null
    }
  }

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'safe': return 'bg-success text-success-foreground'
      case 'suspicious': return 'bg-warning text-warning-foreground'
      case 'dangerous': return 'bg-destructive text-destructive-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }


  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        <Card className="glass-card border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-6">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2 font-display uppercase tracking-wider">
                  <HistoryIcon className="w-6 h-6 text-primary" />
                  /Scan Archive/
                </CardTitle>
                <CardDescription className="font-mono">
                  <span className="text-primary">{'>'}</span> {user ? 'Previous threat detection records' : 'Local scan history (saved in this browser)'}
                </CardDescription>
              </div>

              {!user && scans.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-mono"
                  onClick={() => {
                    clearGuestScans()
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scans.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                <p className="text-muted-foreground font-mono">No scan records found. Initialize first scan to populate archive.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scans.map((scan) => (
                  <div
                    key={scan.id}
                    className="p-4 rounded-lg border-2 border-primary/20 hover:border-primary/50 transition-all glass-card hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 border border-primary/50 shadow-[0_0_15px_hsl(var(--primary)/0.4)]">
                        {getScanIcon(scan.scanType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-display font-bold uppercase text-sm tracking-wide">{scan.scanType} Scan</span>
                              <Badge className={`${getThreatColor(scan.threatLevel)} border font-mono`}>
                                {scan.threatLevel}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate font-mono">
                              {scan.content}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                            {formatDistanceToNow(scan.createdAt, { addSuffix: true })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-mono">
                          <span className="text-muted-foreground">Confidence: {scan.confidence}%</span>
                          {scan.indicators.length > 0 && (
                            <>
                              <span className="text-primary">|</span>
                              <span className="text-muted-foreground">
                                {scan.indicators.length} indicator{scan.indicators.length !== 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
