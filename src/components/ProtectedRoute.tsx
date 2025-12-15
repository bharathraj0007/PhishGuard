import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { blink } from '../lib/blink'
import { Shield, Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setIsAuthenticated(state.isAuthenticated)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50">
            <Shield className="w-9 h-9 text-primary animate-pulse" />
          </div>
          <div className="flex items-center gap-2 justify-center text-muted-foreground font-mono">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>&gt; Authenticating...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
