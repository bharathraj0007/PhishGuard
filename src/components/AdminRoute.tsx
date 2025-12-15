import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { blink } from '../lib/blink'
import { adminSecurity } from '../lib/admin-security'
import { Shield, Loader2, AlertTriangle } from 'lucide-react'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged(async (state) => {
      try {
        setIsAuthenticated(state.isAuthenticated)
        setLoading(state.isLoading)
        
        if (state.user) {
          // Verify admin session with enhanced security
          const isValidAdmin = await adminSecurity.verifyAdminSession()
          setIsAdmin(isValidAdmin)
          
          // Log security event
          if (!isValidAdmin) {
            console.warn('⚠️ Unauthorized admin access attempt detected:', state.user.id)
          }
        } else {
          setIsAdmin(false)
        }
      } catch (error) {
        console.error('Admin auth verification error:', error)
        setIsAdmin(false)
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
            <span>&gt; Verifying admin access...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin-login" replace />
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in max-w-md">
          <div className="w-16 h-16 rounded-lg bg-destructive/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_hsl(var(--destructive)/0.4)] border border-destructive/50">
            <AlertTriangle className="w-9 h-9 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2 font-display text-primary uppercase tracking-wider">
            Access Denied
          </h1>
          <p className="text-muted-foreground font-mono mb-6">
            &gt; You don't have permission to access this area. Admin privileges required.
          </p>
          <a 
            href="/dashboard" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-mono hover:scale-105 transition-transform shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
