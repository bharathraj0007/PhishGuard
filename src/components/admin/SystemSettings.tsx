import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Save, RefreshCw } from 'lucide-react';
import { blink } from '@/lib/blink';
import { toast } from 'sonner';

interface SystemSetting {
  id: string;
  settingKey: string;
  settingValue: string;
  settingType: string;
  description: string | null;
}

export default function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const allSettings = await blink.db.systemSettings.list();
      const settingsMap: Record<string, string> = {};
      (allSettings as unknown as SystemSetting[]).forEach((setting: SystemSetting) => {
        settingsMap[setting.settingKey] = setting.settingValue;
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string, type: string = 'string') => {
    try {
      const existing = await blink.db.systemSettings.list({
        where: { settingKey: key },
      }) as unknown as SystemSetting[];

      if (existing.length > 0) {
        await blink.db.systemSettings.update(existing[0].id, {
          settingValue: value,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await blink.db.systemSettings.create({
          settingKey: key,
          settingValue: value,
          settingType: type,
          description: null,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);

      // Save all settings
      await Promise.all([
        updateSetting('max_scans_per_day', settings.max_scans_per_day || '100', 'number'),
        updateSetting('enable_email_notifications', settings.enable_email_notifications || 'true', 'boolean'),
        updateSetting('require_email_verification', settings.require_email_verification || 'false', 'boolean'),
        updateSetting('ml_confidence_threshold', settings.ml_confidence_threshold || '0.7', 'number'),
        updateSetting('auto_retrain_models', settings.auto_retrain_models || 'false', 'boolean'),
        updateSetting('scan_history_retention_days', settings.scan_history_retention_days || '90', 'number'),
      ]);

      toast.success('Settings saved successfully');
      loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSwitchChange = (key: string, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked.toString() }));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Settings
              </CardTitle>
              <CardDescription>Configure system-wide settings and preferences</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={loadSettings} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button onClick={saveSettings} size="sm" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scan Limits */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Scan Limits</h3>
              <p className="text-sm text-muted-foreground">
                Configure scanning limits and quotas
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="max_scans">Max Scans Per Day (Per User)</Label>
                <Input
                  id="max_scans"
                  type="number"
                  value={settings.max_scans_per_day || '100'}
                  onChange={(e) => handleInputChange('max_scans_per_day', e.target.value)}
                  placeholder="100"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of scans a user can perform per day
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="retention">Scan History Retention (Days)</Label>
                <Input
                  id="retention"
                  type="number"
                  value={settings.scan_history_retention_days || '90'}
                  onChange={(e) => handleInputChange('scan_history_retention_days', e.target.value)}
                  placeholder="90"
                />
                <p className="text-xs text-muted-foreground">
                  Number of days to keep scan history before auto-deletion
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ML Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">Machine Learning</h3>
              <p className="text-sm text-muted-foreground">
                Configure ML model behavior and training
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="confidence">ML Confidence Threshold</Label>
                <Input
                  id="confidence"
                  type="number"
                  step="0.1"
                  min="0"
                  max="1"
                  value={settings.ml_confidence_threshold || '0.7'}
                  onChange={(e) => handleInputChange('ml_confidence_threshold', e.target.value)}
                  placeholder="0.7"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum confidence threshold for phishing detection (0.0 - 1.0)
                </p>
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="auto_retrain">Auto-Retrain Models</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically retrain models when new datasets are added
                  </p>
                </div>
                <Switch
                  id="auto_retrain"
                  checked={settings.auto_retrain_models === 'true'}
                  onCheckedChange={(checked) => handleSwitchChange('auto_retrain_models', checked)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* User Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">User Management</h3>
              <p className="text-sm text-muted-foreground">
                Configure user authentication and notifications
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="email_verify">Require Email Verification</Label>
                  <p className="text-xs text-muted-foreground">
                    Users must verify their email before accessing the system
                  </p>
                </div>
                <Switch
                  id="email_verify"
                  checked={settings.require_email_verification === 'true'}
                  onCheckedChange={(checked) =>
                    handleSwitchChange('require_email_verification', checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label htmlFor="email_notif">Enable Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Send email notifications for important events
                  </p>
                </div>
                <Switch
                  id="email_notif"
                  checked={settings.enable_email_notifications === 'true'}
                  onCheckedChange={(checked) =>
                    handleSwitchChange('enable_email_notifications', checked)
                  }
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
