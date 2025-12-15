import { useState } from 'react'
import { Key, Lock, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Alert, AlertDescription } from './ui/alert'
import { blink } from '../lib/blink'
import { adminSecurity } from '../lib/admin-security'
import { toast } from 'sonner'

export function AdminPasswordChange() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [isChanging, setIsChanging] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<{ valid: boolean; error?: string } | null>(null)

  const handlePasswordChange = (value: string) => {
    setNewPassword(value)
    if (value) {
      const strength = adminSecurity.validatePasswordStrength(value)
      setPasswordStrength(strength)
    } else {
      setPasswordStrength(null)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    // Check password strength
    const strengthCheck = adminSecurity.validatePasswordStrength(newPassword)
    if (!strengthCheck.valid) {
      toast.error(strengthCheck.error || 'Password does not meet security requirements')
      return
    }

    setIsChanging(true)

    try {
      // Change password using Blink auth
      await blink.auth.changePassword(currentPassword, newPassword)
      
      toast.success('Password changed successfully')
      
      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStrength(null)
      
    } catch (error: any) {
      console.error('Password change error:', error)
      
      const errorMessage = error?.message || error?.toString() || 'Failed to change password'
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('current password')) {
        toast.error('Current password is incorrect')
      } else if (errorMessage.includes('same')) {
        toast.error('New password must be different from current password')
      } else {
        toast.error('Failed to change password. Please try again.')
      }
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <Card className="border-primary/30 bg-background/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display uppercase">
          <Key className="w-5 h-5 text-primary" />
          Change Admin Password
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          Update your admin password with a strong, secure password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChangePassword} className="space-y-5">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="current-password" className="font-display uppercase text-xs tracking-wider">
              Current Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="current-password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChanging}
                className="pl-10 pr-10 bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="new-password" className="font-display uppercase text-xs tracking-wider">
              New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => handlePasswordChange(e.target.value)}
                required
                disabled={isChanging}
                className="pl-10 pr-10 bg-background/50 border-primary/30 focus:border-primary"
              />
            </div>
            
            {/* Password Strength Indicator */}
            {passwordStrength && (
              <div className={`text-xs font-mono flex items-center gap-2 ${
                passwordStrength.valid ? 'text-green-500' : 'text-destructive'
              }`}>
                {passwordStrength.valid ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Password meets security requirements</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3" />
                    <span>{passwordStrength.error}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="font-display uppercase text-xs tracking-wider">
              Confirm New Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showPasswords ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isChanging}
                className="pl-10 pr-10 bg-background/50 border-primary/30 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(!showPasswords)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive font-mono">Passwords do not match</p>
            )}
          </div>

          {/* Security Requirements */}
          <Alert className="bg-primary/10 border-primary/30">
            <AlertDescription className="text-xs font-mono space-y-1">
              <p className="font-bold mb-2">Password Requirements:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>At least 12 characters long</li>
                <li>At least one uppercase letter (A-Z)</li>
                <li>At least one lowercase letter (a-z)</li>
                <li>At least one number (0-9)</li>
                <li>At least one special character (!@#$%^&*)</li>
                <li>Not a common or weak password</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="matrix"
            className="w-full"
            disabled={isChanging || !passwordStrength?.valid}
          >
            {isChanging ? 'Changing Password...' : 'Change Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
