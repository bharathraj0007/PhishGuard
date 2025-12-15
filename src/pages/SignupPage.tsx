import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Mail, Lock, User, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { blink } from '../lib/blink'
import { toast } from 'sonner'

export function SignupPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!displayName.trim()) {
      toast.error('Please enter your display name')
      return
    }

    if (!email.trim()) {
      toast.error('Please enter your email')
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
      const result = await blink.auth.signUp({
        email,
        password,
        displayName
      })
      
      if (!result) {
        toast.error('Sign up failed. Please try again.')
        setIsLoading(false)
        return
      }

      // Get user info to check role
      const user = await blink.auth.me()
      
      toast.success('Account created successfully!')
      
      // Redirect based on user role
      if (user?.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('Sign up error:', error)
      
      const errorMessage = error?.message || error?.toString() || 'Failed to create account'
      
      if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
        toast.error('An account with this email already exists')
      } else if (errorMessage.includes('weak') || errorMessage.includes('password')) {
        toast.error('Password is too weak. Use at least 8 characters')
      } else if (errorMessage.includes('rate limit')) {
        toast.error('Too many attempts, try again later')
      } else if (errorMessage.includes('invalid') && errorMessage.includes('email')) {
        toast.error('Please enter a valid email address')
      } else {
        toast.error(errorMessage)
      }
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
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide mb-2 neon-glow">/CREATE_ACCOUNT/</h1>
          <p className="text-muted-foreground font-mono text-sm">&gt; join the defense network</p>
        </div>

        {/* Signup Form */}
        <div className="glass-card p-8 rounded-xl border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)] animate-fade-in animate-delay-200">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="font-display uppercase text-xs tracking-wider">
                Display Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Agent Name"
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
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="agent@phishguard.com"
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
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>


        </div>

        {/* Login Link */}
        <div className="text-center mt-6 animate-fade-in animate-delay-400">
          <p className="text-sm text-muted-foreground font-mono">
            &gt; already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-bold neon-glow">
              Sign In
            </Link>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4">
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
            &lt; back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
