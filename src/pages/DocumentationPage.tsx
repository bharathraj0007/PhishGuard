import { useState } from 'react'
import { ChevronDown, Shield, Link, Mail, MessageSquare, QrCode, AlertCircle, CheckCircle, Zap, Users, BookOpen, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'

export function DocumentationPage() {
  const navigate = useNavigate()
  const [expandedSection, setExpandedSection] = useState<string>('getting-started')

  const sections = [
    {
      id: 'getting-started',
      title: '/Getting_Started/',
      icon: <Shield className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground font-mono">
            &gt; Welcome to PhishGuard. This guide will help you protect yourself from phishing threats.
          </p>
          <div className="space-y-3">
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">Step 1: Create Account</h4>
              <p className="text-sm text-muted-foreground font-mono">Click "Get Started" and sign up with your email and password.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">Step 2: Access Dashboard</h4>
              <p className="text-sm text-muted-foreground font-mono">After login, you'll be taken to the security dashboard.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">Step 3: Start Scanning</h4>
              <p className="text-sm text-muted-foreground font-mono">Use the Scanner tab to analyze links, emails, SMS, and QR codes.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'features',
      title: '/Scanner_Features/',
      icon: <Zap className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground font-mono">
            &gt; PhishGuard provides four powerful scanning tools
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link className="w-5 h-5 text-primary" />
                <h4 className="font-display font-semibold uppercase">URL Scanner</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Analyze any URL to detect phishing attempts, malware, and suspicious domains. Get instant threat assessment.</p>
            </div>
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="w-5 h-5 text-primary" />
                <h4 className="font-display font-semibold uppercase">Email Checker</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Verify sender authenticity and detect spoofed email addresses. Identify phishing attempts in email headers.</p>
            </div>
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h4 className="font-display font-semibold uppercase">SMS Analyzer</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Detect smishing attacks in text messages. Identify suspicious links and urgent language patterns.</p>
            </div>
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-primary" />
                <h4 className="font-display font-semibold uppercase">QR Scanner</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Safely decode QR codes before scanning. Verify QR code URLs and detect malicious codes.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'threat-levels',
      title: '/Understanding_Threat_Levels/',
      icon: <AlertCircle className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground font-mono">
            &gt; Learn how to interpret threat assessment results
          </p>
          <div className="space-y-3">
            <div className="cyber-card p-4 border-l-4 border-green-500">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h4 className="font-display font-semibold uppercase">Safe</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Confidence: 90%+ | No immediate threats detected. Content appears legitimate.</p>
            </div>
            <div className="cyber-card p-4 border-l-4 border-yellow-500">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <h4 className="font-display font-semibold uppercase">Suspicious</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Confidence: 60-89% | Some indicators detected. Exercise caution and verify content.</p>
            </div>
            <div className="cyber-card p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h4 className="font-display font-semibold uppercase">Dangerous</h4>
              </div>
              <p className="text-sm text-muted-foreground font-mono">Confidence: 50%+ | Multiple threats detected. Avoid clicking or interacting with content.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'phishing-indicators',
      title: '/Red_Flags_&_Indicators/',
      icon: <BookOpen className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground font-mono">
            &gt; Common indicators of phishing attempts
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              'Urgent or threatening language',
              'Requests for personal information',
              'Mismatched sender addresses',
              'Suspicious URL patterns',
              'Too good to be true offers',
              'Generic greetings ("Dear Customer")',
              'Poor grammar and spelling',
              'Unknown attachments or links',
              'Domain name typos',
              'Masked hyperlinks',
              'Pressure to act immediately',
              'Unusual requests for verification'
            ].map((indicator, idx) => (
              <div key={idx} className="cyber-card p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted-foreground font-mono">{indicator}</span>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'best-practices',
      title: '/Security_Best_Practices/',
      icon: <Users className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground font-mono">
            &gt; Follow these practices to enhance your security
          </p>
          <div className="space-y-3">
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">1. Verify Before Clicking</h4>
              <p className="text-sm text-muted-foreground font-mono">Always use PhishGuard to scan URLs before clicking suspicious links, especially in emails from unknown sources.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">2. Check Sender Email</h4>
              <p className="text-sm text-muted-foreground font-mono">Verify the actual sender email address, not just the display name. Scammers often spoof legitimate addresses.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">3. Never Share Credentials</h4>
              <p className="text-sm text-muted-foreground font-mono">Legitimate companies never ask for passwords or sensitive data via email or SMS.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">4. Use Strong Passwords</h4>
              <p className="text-sm text-muted-foreground font-mono">Create unique, complex passwords for each online account. Use a password manager for security.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">5. Enable Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground font-mono">Add an extra layer of security to your important accounts with 2FA whenever available.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">6. Keep Software Updated</h4>
              <p className="text-sm text-muted-foreground font-mono">Regular updates patch security vulnerabilities. Enable automatic updates when possible.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'dashboard-guide',
      title: '/Dashboard_Features/',
      icon: <BarChart3 className="w-5 h-5" />,
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground font-mono">
            &gt; Explore all dashboard features and tools
          </p>
          <div className="space-y-3">
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">Scanner Tab</h4>
              <p className="text-sm text-muted-foreground font-mono">Main analysis tool. Select content type, paste your input, and receive instant threat assessment with detailed indicators.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">History Tab</h4>
              <p className="text-sm text-muted-foreground font-mono">View all your previous scans. Track threat patterns, review past analysis, and re-scan items if needed.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">Analytics Tab</h4>
              <p className="text-sm text-muted-foreground font-mono">Personal statistics dashboard. Monitor your scanning activity and threat distribution patterns.</p>
            </div>
            <div className="cyber-card p-4">
              <h4 className="font-display font-semibold mb-2 uppercase">Insights Tab</h4>
              <p className="text-sm text-muted-foreground font-mono">Comprehensive phishing threat intelligence. Learn about common attack vectors and defense protocols.</p>
            </div>
          </div>
        </div>
      )
    }
  ]

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? '' : id)
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-12 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50">
              <BookOpen className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold uppercase tracking-wider matrix-text">
                /Documentation/
              </h1>
              <p className="text-sm text-muted-foreground font-mono">
                &gt; Complete guide to using PhishGuard
              </p>
            </div>
          </div>
        </div>

        {/* Documentation Content */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4 animate-fade-in">
            {sections.map((section) => (
              <div key={section.id} className="cyber-card overflow-hidden">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-primary">{section.icon}</div>
                    <h2 className="text-lg font-display font-semibold uppercase tracking-wider">
                      {section.title}
                    </h2>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-primary transition-transform ${
                      expandedSection === section.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expandedSection === section.id && (
                  <div className="px-6 py-4 border-t border-primary/20 bg-background/50">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Card className="cyber-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <Video className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-display font-bold uppercase tracking-wider">
                  Need More Help?
                </h3>
              </div>
              <p className="text-muted-foreground font-mono mb-6">
                Explore more about phishing threats and security best practices
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="cyber" size="lg" className="w-full" onClick={() => navigate('/insights')}>
                  View Insights
                </Button>
                <Button variant="glass" size="lg" className="w-full" onClick={() => navigate('/contact-support')}>
                  Contact Support
                </Button>
              </div>
            </Card>
          </div>

          {/* FAQ Section */}
          <div className="mt-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <h3 className="text-2xl font-display font-bold mb-6 uppercase tracking-wider matrix-text">
              /FAQ/
            </h3>
            <div className="space-y-4">
              {[
                {
                  q: 'Is my data secure with PhishGuard?',
                  a: 'Yes, all your data is encrypted and never shared. We comply with privacy regulations and store scans securely.'
                },
                {
                  q: 'How accurate is the threat detection?',
                  a: 'Our AI-powered engine achieves 95%+ accuracy by analyzing multiple indicators including domain reputation, content patterns, and known threats.'
                },
                {
                  q: 'Can I use PhishGuard on mobile devices?',
                  a: 'Yes, PhishGuard is fully responsive and works on smartphones, tablets, and desktops.'
                },
                {
                  q: 'What types of phishing can PhishGuard detect?',
                  a: 'We detect email phishing, spear phishing, clone phishing, SMS phishing (smishing), and QR code exploitation attempts.'
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes, sign up with your email to get instant access to all PhishGuard features.'
                }
              ].map((faq, idx) => (
                <div key={idx} className="cyber-card p-4">
                  <h4 className="font-display font-semibold mb-2 uppercase text-primary">Q: {faq.q}</h4>
                  <p className="text-sm text-muted-foreground font-mono">A: {faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import { BarChart3 } from 'lucide-react'
