import { AlertTriangle, Shield, Eye, CheckCircle2, AlertCircle, Globe, Zap, Target } from 'lucide-react'
import { Button } from './ui/button'

interface InsightsProps {
  onScanClick: () => void
}

export function Insights({ onScanClick }: InsightsProps) {
  const threatStats = [
    { label: 'Daily Phishing Attacks', value: '3.4M+', change: '+156% YoY' },
    { label: 'Email Success Rate', value: '3.2%', change: 'of recipients targeted' },
    { label: 'Users Affected Yearly', value: '376M', change: 'worldwide' },
    { label: 'Financial Loss', value: '$84.1B', change: 'estimated annual cost' },
  ]

  const phishingTypes = [
    {
      title: 'Email Phishing',
      description: 'Most common form where attackers impersonate legitimate companies via email',
      icon: AlertTriangle,
      examples: ['Bank verification requests', 'Account suspension warnings', 'Package delivery notices'],
    },
    {
      title: 'Spear Phishing',
      description: 'Highly targeted attacks personalized for specific individuals or organizations',
      icon: Target,
      examples: ['CEO impersonation', 'Department-specific requests', 'Custom business deals'],
    },
    {
      title: 'Clone Phishing',
      description: 'Creating fake websites or emails that closely mimic legitimate ones',
      icon: Globe,
      examples: ['Fake login pages', 'Spoofed websites', 'DNS hijacking'],
    },
    {
      title: 'Whaling',
      description: 'Targeting high-value targets like executives and senior management',
      icon: Zap,
      examples: ['Executive wire transfers', 'Business account takeovers', 'Sensitive data theft'],
    },
  ]

  const warningSignals = [
    { signal: 'Urgency & Threats', details: 'Act now or your account will be closed' },
    { signal: 'Suspicious Links', details: 'URLs don\'t match sender organization domain' },
    { signal: 'Generic Greetings', details: 'Dear Customer instead of personal name' },
    { signal: 'Unusual Requests', details: 'Asking for passwords or sensitive personal info' },
    { signal: 'Grammar & Spelling', details: 'Professional emails have no errors' },
    { signal: 'Mismatched Headers', details: 'From address doesn\'t match actual sender' },
    { signal: 'Unexpected Attachments', details: '.exe, .zip, or macro-enabled documents' },
    { signal: 'Hover Over Links', details: 'Actual URL doesn\'t match display text' },
  ]

  const preventionTips = [
    {
      category: 'Email Verification',
      tips: [
        'Verify sender email address carefully',
        'Check domain before clicking links',
        'Contact company directly before sharing info',
        'Use email authentication (SPF, DKIM, DMARC)',
      ],
    },
    {
      category: 'Security Practices',
      tips: [
        'Enable two-factor authentication (2FA)',
        'Use unique, strong passwords',
        'Keep software and OS updated',
        'Use reputable antivirus software',
      ],
    },
    {
      category: 'User Awareness',
      tips: [
        'Think before clicking links or downloading files',
        'Educate yourself and others on phishing tactics',
        'Report suspicious emails to your IT team',
        'Never share sensitive info via email',
      ],
    },
    {
      category: 'Technical Measures',
      tips: [
        'Implement multi-factor authentication',
        'Use email filtering and spam detection',
        'Deploy advanced threat protection',
        'Monitor network for unusual activity',
      ],
    },
  ]

  const industryImpact = [
    { sector: 'Finance & Banking', percentage: 34 },
    { sector: 'Healthcare', percentage: 18 },
    { sector: 'Government', percentage: 22 },
    { sector: 'Retail & E-commerce', percentage: 15 },
    { sector: 'Technology', percentage: 11 },
  ]

  return (
    <section className="min-h-screen bg-black/95 py-20 relative overflow-hidden">
      {/* Background grid and effects */}
      <div className="absolute inset-0 grid-pattern opacity-5"></div>
      <div className="absolute top-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-primary/30 bg-primary/5">
            <Eye className="w-4 h-4 text-primary" />
            <span className="text-sm font-rajdhani uppercase tracking-widest">Threat Intelligence</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 uppercase tracking-wider">
            <span className="text-transparent bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text" style={{
              textShadow: '0 0 30px hsl(var(--primary) / 0.5)',
            }}>
              PHISHING INSIGHTS
            </span>
          </h1>
          <p className="text-lg text-cyan-300/80 font-rajdhani max-w-2xl mx-auto leading-relaxed">
            &gt; Comprehensive overview of phishing threats, trends, and protection strategies in the digital landscape
          </p>
        </div>

        {/* Threat Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {threatStats.map((stat, idx) => (
            <div
              key={idx}
              className="glass-card p-6 rounded-lg border border-primary/30 hover:border-primary/60 transition-all duration-300 group hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="text-sm font-rajdhani uppercase tracking-wide text-cyan-300/70 mb-3">{stat.label}</div>
              <div className="text-3xl font-display font-bold text-primary mb-2 group-hover:scale-110 transition-transform duration-300" style={{
                textShadow: '0 0 20px hsl(var(--primary) / 0.6)',
              }}>
                {stat.value}
              </div>
              <div className="text-xs font-rajdhani text-cyan-300/60">{stat.change}</div>
            </div>
          ))}
        </div>

        {/* Phishing Types */}
        <div className="mb-20">
          <h2 className="text-4xl font-display font-bold uppercase tracking-wider mb-12 text-center" style={{
            textShadow: '0 0 20px hsl(var(--primary) / 0.5)',
          }}>
            THREAT CLASSIFICATION MATRIX
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {phishingTypes.map((type, idx) => {
              const IconComponent = type.icon
              return (
                <div
                  key={idx}
                  className="glass-card p-8 rounded-lg border border-primary/30 hover:border-primary/60 transition-all duration-300 group hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:scale-105 animate-fade-in"
                  style={{ animationDelay: `${(idx + 4) * 100}ms` }}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50 group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-all duration-300">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-display font-bold uppercase tracking-wider text-primary mb-2" style={{
                        textShadow: '0 0 15px hsl(var(--primary) / 0.5)',
                      }}>
                        {type.title}
                      </h3>
                      <p className="text-sm text-cyan-300/70 font-rajdhani">{type.description}</p>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4 pt-4 border-t border-primary/20">
                    <p className="text-xs font-rajdhani uppercase tracking-wide text-primary/70 mb-2">Examples:</p>
                    {type.examples.map((example, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary/60"></div>
                        <span className="text-xs text-cyan-300/60">{example}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Warning Signs */}
        <div className="mb-20">
          <h2 className="text-4xl font-display font-bold uppercase tracking-wider mb-12 text-center" style={{
            textShadow: '0 0 20px hsl(var(--primary) / 0.5)',
          }}>
            RED FLAG DETECTION SYSTEM
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {warningSignals.map((item, idx) => (
              <div
                key={idx}
                className="glass-card p-6 rounded-lg border border-primary/30 hover:border-primary/60 transition-all duration-300 group animate-fade-in"
                style={{ animationDelay: `${(idx + 8) * 60}ms` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-primary group-hover:animate-pulse" />
                  <h4 className="font-display font-bold text-sm uppercase tracking-wide text-primary" style={{
                    textShadow: '0 0 10px hsl(var(--primary) / 0.5)',
                  }}>
                    {item.signal}
                  </h4>
                </div>
                <p className="text-xs text-cyan-300/60 font-rajdhani">{item.details}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Prevention Tips */}
        <div className="mb-20">
          <h2 className="text-4xl font-display font-bold uppercase tracking-wider mb-12 text-center" style={{
            textShadow: '0 0 20px hsl(var(--primary) / 0.5)',
          }}>
            DEFENSE PROTOCOLS
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {preventionTips.map((section, idx) => (
              <div
                key={idx}
                className="glass-card p-8 rounded-lg border border-primary/30 hover:border-primary/60 transition-all duration-300 group animate-fade-in"
                style={{ animationDelay: `${(idx + 12) * 100}ms` }}
              >
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="text-xl font-display font-bold uppercase tracking-wider text-primary" style={{
                    textShadow: '0 0 15px hsl(var(--primary) / 0.5)',
                  }}>
                    {section.category}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {section.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-primary/60 mt-1 flex-shrink-0" />
                      <span className="text-sm text-cyan-300/70 font-rajdhani">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Industry Impact */}
        <div className="mb-20">
          <h2 className="text-4xl font-display font-bold uppercase tracking-wider mb-12 text-center" style={{
            textShadow: '0 0 20px hsl(var(--primary) / 0.5)',
          }}>
            SECTOR VULNERABILITY MAP
          </h2>
          <div className="glass-card p-8 rounded-lg border border-primary/30">
            <div className="space-y-6">
              {industryImpact.map((industry, idx) => (
                <div key={idx} className="animate-fade-in" style={{ animationDelay: `${(idx + 16) * 100}ms` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-primary uppercase tracking-wide" style={{
                      textShadow: '0 0 10px hsl(var(--primary) / 0.5)',
                    }}>
                      {industry.sector}
                    </span>
                    <span className="text-sm font-rajdhani text-cyan-300/70">{industry.percentage}%</span>
                  </div>
                  <div className="h-2 bg-primary/10 rounded-full overflow-hidden border border-primary/20">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-cyan-400 rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: `${industry.percentage}%`,
                        boxShadow: '0 0 20px hsl(var(--primary) / 0.6)',
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto text-center py-16 glass-card p-12 rounded-lg border border-primary/30 hover:border-primary/60 transition-all duration-300 hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] animate-fade-in" style={{ animationDelay: '1800ms' }}>
          <AlertTriangle className="w-12 h-12 text-primary mx-auto mb-6" style={{
            filter: 'drop-shadow(0 0 20px hsl(var(--primary) / 0.6))',
          }} />
          <h2 className="text-3xl font-display font-bold uppercase tracking-wider mb-4 text-primary" style={{
            textShadow: '0 0 20px hsl(var(--primary) / 0.5)',
          }}>
            READY TO PROTECT YOURSELF?
          </h2>
          <p className="text-cyan-300/70 font-rajdhani mb-8">
            Use PhishGuard&apos;s AI-powered detection system to analyze suspicious links, emails, SMS, and QR codes in real-time. Protect yourself and your organization from phishing threats.
          </p>
          <Button onClick={onScanClick} variant="matrix" size="lg" className="group">
            <Zap className="w-4 h-4 mr-2 group-hover:animate-pulse" />
            <span className="font-display font-bold uppercase tracking-wider">Initiate Threat Scan</span>
          </Button>
        </div>
      </div>
    </section>
  )
}
