import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Activity, Shield, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { blink } from '@/lib/blink';
import { Skeleton } from '@/components/ui/skeleton';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalScans: number;
  phishingDetected: number;
  safeScans: number;
  todayScans: number;
  avgConfidence: number;
  activeModels: number;
  scansByType: {
    email: number;
    sms: number;
    url: number;
    qr: number;
  };
  mlDetectionRate: number;
}

export default function AdminStats() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Load all stats in parallel
      const [users, scans] = await Promise.all([
        blink.db.users.list(),
        blink.db.phishingScans.list({ where: { isDeleted: 0 } }),
      ]);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const activeUsers = users.filter(u => {
        if (!u.last_sign_in) return false;
        const lastSignIn = new Date(u.last_sign_in);
        const daysSinceLastSignIn = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceLastSignIn <= 30;
      }).length;

      const todayScans = scans.filter(s => {
        const scanDate = new Date(s.created_at);
        return scanDate >= todayStart;
      }).length;

      const phishingScans = scans.filter(s => 
        s.threat_level === 'high' || s.threat_level === 'medium'
      );

      const avgConfidence = scans.length > 0
        ? scans.reduce((sum, s) => sum + s.confidence, 0) / scans.length
        : 0;

      // Calculate scans by type
      const scansByType = {
        email: scans.filter(s => s.scan_type === 'email').length,
        sms: scans.filter(s => s.scan_type === 'sms').length,
        url: scans.filter(s => s.scan_type === 'link').length,
        qr: scans.filter(s => s.scan_type === 'qr').length,
      };

      // Calculate ML detection rate (phishing detected / total scans)
      const mlDetectionRate = scans.length > 0
        ? (phishingScans.length / scans.length) * 100
        : 0;

      setStats({
        totalUsers: users.length,
        activeUsers,
        totalScans: scans.length,
        phishingDetected: phishingScans.length,
        safeScans: scans.length - phishingScans.length,
        todayScans,
        avgConfidence: Math.round(avgConfidence * 100),
        activeModels: 4, // URL, Email, SMS, QR models
        scansByType,
        mlDetectionRate: Math.round(mlDetectionRate),
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Provide safe defaults for all stats properties
  const totalUsers = stats.totalUsers ?? 0;
  const activeUsers = stats.activeUsers ?? 0;
  const totalScans = stats.totalScans ?? 0;
  const todayScans = stats.todayScans ?? 0;
  const phishingDetected = stats.phishingDetected ?? 0;
  const safeScans = stats.safeScans ?? 0;
  const avgConfidence = stats.avgConfidence ?? 0;
  const activeModels = stats.activeModels ?? 0;
  const scansByType = stats.scansByType ?? { email: 0, sms: 0, url: 0, qr: 0 };
  const mlDetectionRate = stats.mlDetectionRate ?? 0;

  const statCards = [
    {
      title: 'Total Users',
      value: totalUsers.toLocaleString(),
      description: `${activeUsers} active in last 30 days`,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Active Users',
      value: activeUsers.toLocaleString(),
      description: `${totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}% of total`,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Total Scans',
      value: totalScans.toLocaleString(),
      description: `${todayScans} scans today`,
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Today\'s Scans',
      value: todayScans.toLocaleString(),
      description: 'Last 24 hours',
      icon: Activity,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
    },
    {
      title: 'Phishing Detected',
      value: phishingDetected.toLocaleString(),
      description: `${totalScans > 0 ? Math.round((phishingDetected / totalScans) * 100) : 0}% of total scans`,
      icon: AlertTriangle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Safe Scans',
      value: safeScans.toLocaleString(),
      description: `${totalScans > 0 ? Math.round((safeScans / totalScans) * 100) : 0}% of total scans`,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Avg Confidence',
      value: `${avgConfidence}%`,
      description: 'Model prediction confidence',
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Active Models',
      value: activeModels.toString(),
      description: 'ML models deployed',
      icon: Shield,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  // ML-specific stat cards
  const mlStatCards = [
    {
      title: 'Email Scans',
      value: scansByType.email.toLocaleString(),
      description: `${totalScans > 0 ? Math.round((scansByType.email / totalScans) * 100) : 0}% of total`,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'SMS Scans',
      value: scansByType.sms.toLocaleString(),
      description: `${totalScans > 0 ? Math.round((scansByType.sms / totalScans) * 100) : 0}% of total`,
      icon: Activity,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'URL Scans',
      value: scansByType.url.toLocaleString(),
      description: `${totalScans > 0 ? Math.round((scansByType.url / totalScans) * 100) : 0}% of total`,
      icon: Activity,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'QR Scans',
      value: scansByType.qr.toLocaleString(),
      description: `${totalScans > 0 ? Math.round((scansByType.qr / totalScans) * 100) : 0}% of total`,
      icon: Activity,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'ML Detection Rate',
      value: `${mlDetectionRate}%`,
      description: 'Phishing detection accuracy',
      icon: Shield,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main System Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4">System Overview</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ML-Specific Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-4">ML Detection Analytics</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {mlStatCards.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
