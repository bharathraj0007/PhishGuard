import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { blink } from '../lib/blink'
import { Shield, Loader2, AlertTriangle } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState<string>('')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      setIsAuthenticated(state.isAuthenticated)
      setLoading(state.isLoading)
      
      if (state.isAuthenticated && state.user) {
        setUserRole(state.user.role || 'user')
      }
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

  // Check admin requirement
  if (requireAdmin && userRole !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-fade-in max-w-md">
          <div className="w-16 h-16 rounded-lg bg-destructive/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_hsl(var(--destructive)/0.4)] border border-destructive/50">
            <AlertTriangle className="w-9 h-9 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access this page. This area is restricted to administrators only.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
