import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Mail, Lock, Loader2, AlertTriangle, Key, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Alert, AlertDescription } from '../components/ui/alert'
import { adminSecurity } from '../lib/admin-security'
import { blink } from '../lib/blink'
import { toast } from 'sonner'

export function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(5)
  const [showPasswordChangeWarning, setShowPasswordChangeWarning] = useState(false)
  const navigate = useNavigate()

  // Check if already authenticated as admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAdmin = await adminSecurity.verifyAdminSession()
        if (isAdmin) {
          navigate('/admin', { replace: true })
        }
      } catch {
        // Not authenticated, stay on login page
      }
    }
    checkAuth()
  }, [navigate])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please enter both email and password')
      return
    }

    setIsLoading(true)

    try {
      // Use secure admin authentication
      const result = await adminSecurity.validateAdminLogin(email, password)
      
      if (!result.success) {
        toast.error(result.error || 'Authentication failed')
        
        // Update remaining attempts
        const remaining = adminSecurity.getRemainingAttempts(email)
        setRemainingAttempts(remaining)
        
        if (remaining <= 2 && remaining > 0) {
          toast.warning(`Warning: ${remaining} attempts remaining before account lockout`)
        }
        
        return
      }

      // Check if password change is required
      if (result.requirePasswordChange) {
        setShowPasswordChangeWarning(true)
        toast.warning('You are using default credentials. Please change your password immediately.', {
          duration: 8000
        })
      } else {
        toast.success('Admin access granted')
      }
      
      // Navigate to admin dashboard
      setTimeout(() => {
        navigate('/admin', { replace: true })
      }, 500)
      
    } catch (error: any) {
      console.error('Admin login error:', error)
      toast.error('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,hsl(var(--background))_100%)]" />
      
      {/* Scanlines */}
      <div className="scanlines absolute inset-0 opacity-10 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.6)] border border-primary/50">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <span className="text-3xl font-display font-bold matrix-text uppercase tracking-wider">PhishGuard</span>
          </div>
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide mb-2 neon-glow">/ADMIN_ACCESS/</h1>
          <p className="text-muted-foreground font-mono text-sm">&gt; secure administrator authentication</p>
        </div>

        {/* Security Notice */}
        <Alert className="mb-6 bg-primary/10 border-primary/30 animate-fade-in">
          <Key className="h-4 w-4" />
          <AlertDescription className="font-mono text-xs">
            <strong>Security Notice:</strong> This is a secured admin panel. All login attempts are monitored and rate-limited.
          </AlertDescription>
        </Alert>

        {/* Password Change Warning */}
        {showPasswordChangeWarning && (
          <Alert className="mb-6 bg-destructive/10 border-destructive/30 animate-fade-in">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="font-mono text-xs text-destructive">
              <strong>Action Required:</strong> Change your default password immediately in Admin Settings &gt; Change Password
            </AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <div className="glass-card p-8 rounded-xl border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)] animate-fade-in animate-delay-200">
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="font-display uppercase text-xs tracking-wider">
                Admin Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@phishguard.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  className="pl-10 bg-background/50 border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="font-display uppercase text-xs tracking-wider">
                Admin Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pl-10 pr-10 bg-background/50 border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Attempts remaining: <span className={remainingAttempts <= 2 ? 'text-destructive font-bold' : 'text-primary'}>{remainingAttempts}</span>
              </p>
            </div>

            <Button
              type="submit"
              variant="matrix"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Secure Admin Sign In
                </>
              )}
            </Button>
          </form>

          {/* Security Info */}
          <div className="mt-6 pt-6 border-t border-primary/20">
            <div className="space-y-2 text-xs font-mono text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span>Encrypted connection</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse animate-delay-200" />
                <span>Rate-limited authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse animate-delay-400" />
                <span>Session monitoring active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-xs text-muted-foreground font-mono">
            Forgot credentials? Contact system administrator.
          </p>
          <Link to="/" className="text-xs text-primary hover:text-primary/80 transition-colors font-mono block">
            &lt; back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
