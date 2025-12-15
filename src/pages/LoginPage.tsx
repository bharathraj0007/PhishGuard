import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Mail, Lock, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { blink } from '../lib/blink'
import { toast } from 'sonner'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please enter both email and password')
      return
    }

    setIsLoading(true)

    try {
      // Sign in with email
      const result = await blink.auth.signInWithEmail(email, password)

      if (!result) {
        toast.error('Sign in failed. Please try again.')
        setIsLoading(false)
        return
      }

      // Ensure tokens are ready before reading session user
      try {
        await blink.auth.getValidToken()
      } catch {
        // best-effort
      }

      // Get user info to check role
      const user = await blink.auth.me()

      toast.success('Welcome back!')
      
      // Redirect based on user role
      if (user?.role === 'admin') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (error: any) {
      console.error('Sign in error:', error)
      
      const errorMessage = error?.message || error?.toString() || 'Failed to sign in'
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        toast.error('Invalid email or password')
      } else if (errorMessage.includes('credentials')) {
        toast.error('Invalid email or password')
      } else if (errorMessage.includes('verified')) {
        toast.error('Please verify your email first')
      } else if (errorMessage.includes('rate limit')) {
        toast.error('Too many attempts, try again later')
      } else if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        toast.error('No account found with this email')
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
          <h1 className="text-2xl font-display font-bold uppercase tracking-wide mb-2 neon-glow">/SIGN_IN/</h1>
          <p className="text-muted-foreground font-mono text-sm">&gt; sign in to access your dashboard</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8 rounded-xl border border-primary/30 shadow-[0_0_30px_hsl(var(--primary)/0.3)] animate-fade-in animate-delay-200">
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-display uppercase text-xs tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
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
                'Sign In'
              )}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-xs text-muted-foreground font-mono">
            &gt; new here?{' '}
            <Link to="/signup" className="text-primary hover:underline font-bold neon-glow">
              Create an account
            </Link>
          </p>
          <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors font-mono block">
            &lt; back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
