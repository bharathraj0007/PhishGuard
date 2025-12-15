import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Mail, Lock, User, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { blink } from '../lib/blink'
import { toast } from 'sonner'

export function AdminSetupPage() {
  const [displayName, setDisplayName] = useState('Admin')
  const [email, setEmail] = useState('admin@phishguard.com')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [adminExists, setAdminExists] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    checkAdminExists()
  }, [])

  const checkAdminExists = async () => {
    try {
      // Check if any admin user exists
      const result = await blink.db.list('users', {
        filters: { role: 'admin' },
        limit: 1
      })
      setAdminExists(result && result.length > 0)
    } catch (error) {
      console.error('Error checking admin:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim()) {
      toast.error('Please enter admin display name')
      return
    }

    if (!email.trim()) {
      toast.error('Please enter admin email')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      // Create admin account with role
      const result = await blink.auth.signUp({
        email,
        password,
        displayName,
        role: 'admin'
      })
      
      if (!result) {
        toast.error('Failed to create admin account')
        setIsLoading(false)
        return
      }

      toast.success('Admin account created successfully!')
      
      // Navigate to admin dashboard
      navigate('/admin')
    } catch (error: any) {
      console.error('Admin creation error:', error)
      
      const errorMessage = error?.message || error?.toString() || 'Failed to create admin'
      
      if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
        toast.error('An account with this email already exists. Try logging in.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (adminExists) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="w-full max-w-md relative z-10 text-center">
          <div className="glass-card p-8 rounded-xl border border-primary/30">
            <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold uppercase tracking-wide mb-2 neon-glow">
              Admin Already Exists
            </h1>
            <p className="text-muted-foreground font-mono text-sm mb-6">
              An administrator account has already been set up.
            </p>
            <div className="space-y-3">
              <Button variant="matrix" className="w-full" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
                Back to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide mb-2 neon-glow">/ADMIN_SETUP/</h1>
          <p className="text-muted-foreground font-mono text-sm">&gt; create the administrator account</p>
        </div>

        {/* Setup Form */}
        <div className="glass-card p-8 rounded-xl border border-amber-500/30 shadow-[0_0_30px_hsl(45_100%_50%/0.3)] animate-fade-in animate-delay-200">
          <div className="flex items-center gap-2 mb-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-amber-500 font-mono">First-time admin setup</span>
          </div>
          
          <form onSubmit={handleCreateAdmin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="font-display uppercase text-xs tracking-wider">
                Admin Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Administrator"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 bg-background/50 border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-display uppercase text-xs tracking-wider">
                Admin Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@phishguard.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 bg-background/50 border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="font-display uppercase text-xs tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 bg-background/50 border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">&gt; minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-display uppercase text-xs tracking-wider">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pl-10 bg-background/50 border-primary/30 focus:border-primary focus:shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
                />
              </div>
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
                  Creating Admin...
                </>
              ) : (
                'Create Admin Account'
              )}
            </Button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            &lt; back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
