import { Shield, Info, ArrowRight, Key } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'

export function AdminAccessInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="text-xs text-primary/60 hover:text-primary gap-1"
        >
          <Info className="w-3 h-3" />
          How to access Admin?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-background/95 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.4)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display uppercase tracking-wide neon-glow text-xl">
            <Shield className="w-6 h-6 text-primary" />
            /ADMIN_ACCESS_GUIDE/
          </DialogTitle>
          <DialogDescription className="font-mono text-sm">
            &gt; Learn how to access the PhishGuard admin dashboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Quick Access Steps */}
          <div className="p-5 rounded-lg border border-primary/30 bg-primary/5 glass-card">
            <h3 className="font-display font-bold uppercase tracking-wide text-primary neon-glow mb-4">
              Quick Access Steps
            </h3>
            
            <div className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                  <span className="text-primary font-bold font-mono">1</span>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm">
                    <strong className="text-primary">Use Demo Credentials</strong>
                    <br />
                    Click "View Demo Credentials" button below the login form
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                  <span className="text-primary font-bold font-mono">2</span>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm">
                    <strong className="text-primary">Select "Admin Demo"</strong>
                    <br />
                    Choose the account with "Administrator" role badge
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                  <span className="text-primary font-bold font-mono">3</span>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm">
                    <strong className="text-primary">Auto-Fill & Sign In</strong>
                    <br />
                    Click "Use These Credentials" → Sign In
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/50">
                  <span className="text-primary font-bold font-mono">4</span>
                </div>
                <div className="flex-1">
                  <p className="font-mono text-sm">
                    <strong className="text-primary">Automatic Redirect</strong>
                    <br />
                    You'll be automatically redirected to the admin dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Credentials Box */}
          <div className="p-5 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 glass-card">
            <div className="flex items-start gap-3 mb-4">
              <Key className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-display font-bold uppercase tracking-wide text-primary neon-glow">
                  Admin Demo Credentials
                </h3>
                <p className="text-xs text-muted-foreground font-mono mt-1">
                  Use these for instant admin access
                </p>
              </div>
            </div>

            <div className="space-y-3 mt-4 pl-8">
              <div className="p-3 bg-background/50 rounded border border-primary/20">
                <label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Email</label>
                <p className="font-mono font-bold text-primary">admin@phishguard.com</p>
              </div>
              <div className="p-3 bg-background/50 rounded border border-primary/20">
                <label className="text-xs font-mono text-muted-foreground uppercase block mb-1">Password</label>
                <p className="font-mono font-bold text-primary">AdminPass123!@</p>
              </div>
            </div>
          </div>

          {/* Authentication Flow Diagram */}
          <div className="p-5 rounded-lg border border-primary/30 bg-background/50 glass-card">
            <h3 className="font-display font-bold uppercase tracking-wide text-primary neon-glow mb-4">
              Authentication Flow
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 bg-primary/10 rounded border border-primary/30">
                  <span className="font-mono text-sm font-bold">Login Page</span>
                </div>
                <ArrowRight className="w-4 h-4 text-primary" />
                <div className="px-4 py-2 bg-primary/10 rounded border border-primary/30">
                  <span className="font-mono text-sm font-bold">Authenticate</span>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-8">
                <ArrowRight className="w-4 h-4 text-primary" />
                <div className="px-4 py-2 bg-primary/10 rounded border border-primary/30">
                  <span className="font-mono text-sm font-bold">Check User Role</span>
                </div>
              </div>

              <div className="ml-16 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div className="px-4 py-2 bg-primary/20 rounded border border-primary/50">
                    <span className="font-mono text-sm font-bold text-primary">If role = 'admin'</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <div className="px-4 py-2 bg-primary/20 rounded border border-primary/50">
                    <span className="font-mono text-sm font-bold text-primary">/admin</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <div className="px-4 py-2 bg-muted/20 rounded border border-muted/50">
                    <span className="font-mono text-sm">If role = 'user'</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  <div className="px-4 py-2 bg-muted/20 rounded border border-muted/50">
                    <span className="font-mono text-sm">/dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Features Preview */}
          <div className="p-5 rounded-lg border border-primary/30 bg-background/50 glass-card">
            <h3 className="font-display font-bold uppercase tracking-wide text-primary neon-glow mb-4">
              Admin Dashboard Features
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Users Management */}
              <div className="p-4 bg-primary/5 rounded border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <span className="text-primary font-mono font-bold">U</span>
                </div>
                <h4 className="font-mono font-bold text-sm mb-2 uppercase">Users</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  View, edit, and manage all user accounts
                </p>
              </div>

              {/* Scans Management */}
              <div className="p-4 bg-primary/5 rounded border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <span className="text-primary font-mono font-bold">S</span>
                </div>
                <h4 className="font-mono font-bold text-sm mb-2 uppercase">Scans</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Monitor all phishing scans and threats
                </p>
              </div>

              {/* System Settings */}
              <div className="p-4 bg-primary/5 rounded border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mb-3">
                  <span className="text-primary font-mono font-bold">⚙</span>
                </div>
                <h4 className="font-mono font-bold text-sm mb-2 uppercase">Settings</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  View system status and configuration
                </p>
              </div>
            </div>
          </div>

          {/* Important Note */}
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-xs text-muted-foreground font-mono">
              <strong className="text-warning uppercase">Security Note:</strong> Only users with 'admin' role 
              can access the admin dashboard. Regular users will be redirected to the standard dashboard. 
              Demo credentials are for testing purposes only.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
