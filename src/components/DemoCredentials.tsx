import { useState } from 'react'
import { Copy, X } from 'lucide-react'
import { Button } from './ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

interface DemoCredentialsProps {
  onUseDemo?: (email: string, password: string) => void
}

export function DemoCredentials({ onUseDemo }: DemoCredentialsProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  // Demo credentials for support/testing
  const demoCredentials = [
    {
      name: 'Admin Demo',
      email: 'admin@phishguard.com',
      password: 'AdminPass123!@#',
      role: 'Administrator',
      description: 'Full admin access - manage users, datasets, models, and system settings'
    },
    {
      name: 'User Demo',
      email: 'demo@phishguard.com',
      password: 'DemoPass123!@',
      role: 'Standard User',
      description: 'Regular user account for testing phishing detection features'
    }
  ]

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    toast.success(`${label} copied to clipboard`)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleUseDemoCredentials = (email: string, password: string) => {
    if (onUseDemo) {
      onUseDemo(email, password)
      setOpen(false)
      toast.success('Demo credentials auto-filled')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-xs text-primary/60 hover:text-primary"
        >
          View Demo Credentials
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-background/95 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-wide neon-glow">
            /DEMO_CREDENTIALS/
          </DialogTitle>
          <DialogDescription className="font-mono text-sm">
            &gt; Support and testing credentials for PhishGuard demonstration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {demoCredentials.map((cred, index) => (
            <div 
              key={index}
              className="p-5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all duration-300 glass-card"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-display font-bold uppercase tracking-wide text-primary neon-glow">
                    {cred.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    {cred.description}
                  </p>
                  <div className="mt-2 inline-block">
                    <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary font-bold uppercase tracking-wider">
                      {cred.role}
                    </span>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-3 mb-4">
                {/* Email */}
                <div className="flex items-center justify-between p-3 bg-background/50 rounded border border-primary/20">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase">Email</label>
                    <p className="font-mono font-bold text-primary/80">{cred.email}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(cred.email, `${cred.name} Email`)}
                    className="p-2 hover:bg-primary/10 rounded transition-colors"
                    title="Copy email"
                  >
                    <Copy className={`w-4 h-4 ${copied === `${cred.name} Email` ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>

                {/* Password */}
                <div className="flex items-center justify-between p-3 bg-background/50 rounded border border-primary/20">
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase">Password</label>
                    <p className="font-mono font-bold text-primary/80">{cred.password}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(cred.password, `${cred.name} Password`)}
                    className="p-2 hover:bg-primary/10 rounded transition-colors"
                    title="Copy password"
                  >
                    <Copy className={`w-4 h-4 ${copied === `${cred.name} Password` ? 'text-primary' : 'text-muted-foreground'}`} />
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <Button
                onClick={() => handleUseDemoCredentials(cred.email, cred.password)}
                variant="cyber"
                size="sm"
                className="w-full"
              >
                Use These Credentials
              </Button>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/30">
          <p className="text-xs text-muted-foreground font-mono">
            <strong className="text-warning">Note:</strong> These demo credentials are for testing and support purposes only. 
            Do not share them in public environments. Each demo account has limited access scopes.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
