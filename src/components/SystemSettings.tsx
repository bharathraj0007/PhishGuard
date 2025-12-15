import { Settings, Database, Shield, Activity, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card'
import { Badge } from './ui/badge'
import { AdminPasswordChange } from './AdminPasswordChange'

export function SystemSettings() {
  return (
    <div className="space-y-6">
      {/* Admin Password Change */}
      <AdminPasswordChange />

      {/* System Information */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="font-display text-2xl text-primary uppercase tracking-wider">System Information</CardTitle>
              <CardDescription className="font-mono">&gt; Platform configuration and status</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-3">Platform Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Application Name</span>
                  <span className="font-mono text-sm text-primary">PhishGuard</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Version</span>
                  <Badge variant="outline" className="font-mono">v1.0.0</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Environment</span>
                  <Badge variant="default" className="font-mono">Production</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Status</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">
                    <Activity className="w-3 h-3 mr-1" />
                    Online
                  </Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-3">Backend Services</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Database</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Active</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Edge Functions</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">9 Active</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">AI Detection</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Operational</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Authentication</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Enabled</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Configuration */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="font-display text-2xl text-primary uppercase tracking-wider">Database Schema</CardTitle>
              <CardDescription className="font-mono">&gt; Active database tables</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium mb-2">users</h4>
              <p className="text-sm text-muted-foreground font-mono">
                User accounts and authentication data
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono text-xs">id</Badge>
                <Badge variant="outline" className="font-mono text-xs">email</Badge>
                <Badge variant="outline" className="font-mono text-xs">display_name</Badge>
                <Badge variant="outline" className="font-mono text-xs">role</Badge>
                <Badge variant="outline" className="font-mono text-xs">email_verified</Badge>
                <Badge variant="outline" className="font-mono text-xs">created_at</Badge>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium mb-2">phishing_scans</h4>
              <p className="text-sm text-muted-foreground font-mono">
                Scan records and threat analysis results
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono text-xs">id</Badge>
                <Badge variant="outline" className="font-mono text-xs">user_id</Badge>
                <Badge variant="outline" className="font-mono text-xs">scan_type</Badge>
                <Badge variant="outline" className="font-mono text-xs">content</Badge>
                <Badge variant="outline" className="font-mono text-xs">threat_level</Badge>
                <Badge variant="outline" className="font-mono text-xs">confidence</Badge>
                <Badge variant="outline" className="font-mono text-xs">indicators</Badge>
                <Badge variant="outline" className="font-mono text-xs">created_at</Badge>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium mb-2">password_reset_tokens</h4>
              <p className="text-sm text-muted-foreground font-mono">
                Password reset token management
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline" className="font-mono text-xs">id</Badge>
                <Badge variant="outline" className="font-mono text-xs">user_id</Badge>
                <Badge variant="outline" className="font-mono text-xs">token_hash</Badge>
                <Badge variant="outline" className="font-mono text-xs">expires_at</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="font-display text-2xl text-primary uppercase tracking-wider">Security Configuration</CardTitle>
              <CardDescription className="font-mono">&gt; Platform security settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-3">Authentication</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Email/Password Auth</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Enabled</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Social Auth</span>
                  <Badge variant="outline" className="border-gray-500 text-gray-500 font-mono">Disabled</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Email Verification</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Required</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Password Reset</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Enabled</Badge>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-mono text-sm text-muted-foreground uppercase tracking-wider mb-3">Access Control</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Role-Based Access</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Active</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">Admin Role</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Configured</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">User Role</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Configured</Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-primary/10">
                  <span className="font-mono text-sm">JWT Token Auth</span>
                  <Badge variant="outline" className="border-green-500 text-green-500 font-mono">Active</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edge Functions */}
      <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-primary" />
            <div>
              <CardTitle className="font-display text-2xl text-primary uppercase tracking-wider">Edge Functions</CardTitle>
              <CardDescription className="font-mono">&gt; Deployed backend services</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">analyze-phishing</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">scan-history</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">user-analytics</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">batch-analysis</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">export-scans</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">rate-limiter</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">admin-analytics</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">admin-users</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-muted/50">
              <h4 className="font-mono text-sm font-medium">admin-scans</h4>
              <Badge variant="outline" className="mt-2 border-green-500 text-green-500 font-mono text-xs">
                <Activity className="w-2 h-2 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
