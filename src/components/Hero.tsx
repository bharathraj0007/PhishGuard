import { Shield, Link, Mail, MessageSquare, QrCode, UserPlus, LogIn } from 'lucide-react'
import { Button } from './ui/button'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { blink } from '../lib/blink'

interface HeroProps {
  onGetStarted: () => void
}

export function Hero({ onGetStarted }: HeroProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setIsLoading(state.isLoading)
    })
    return unsubscribe
  }, [])
  return (
    <section className="relative overflow-hidden py-24 lg:py-40 bg-background">
      {/* Cybersecurity grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,128,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,128,0.05)_1px,transparent_1px)] bg-[size:50px_50px]" />
      {/* Glowing orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-5xl mx-auto">
          <div className="inline-flex items-center justify-center p-3 mb-8 rounded-full glass-card shadow-[0_0_40px_hsl(var(--primary)/0.5)] animate-scale-in">
            <Shield className="w-14 h-14 text-primary neon-glow" />
          </div>
          
          <h1 className="text-5xl lg:text-7xl xl:text-8xl font-display font-bold mb-8 tracking-wider animate-fade-in uppercase">
            <span className="matrix-text block mb-2 neon-glow">
              PhishGuard
            </span>
            <span className="text-primary text-3xl lg:text-5xl xl:text-6xl font-mono font-normal tracking-widest">
              /THREAT_DETECTION_ONLINE/
            </span>
          </h1>
          
          <p className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-mono animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <span className="text-primary">{'>'}</span> Protect yourself from phishing attacks with AI-powered analysis of links, emails, SMS, and QR codes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            {!isLoading && (
              <>
                {user ? (
                  // Logged in: go to dashboard
                  <Button size="lg" onClick={() => navigate('/dashboard')} variant="cyber" className="text-lg">
                    Go to Dashboard
                  </Button>
                ) : (
                  // Not logged in: show sign up and login
                  <>
                    <Button size="lg" onClick={() => navigate('/signup')} variant="cyber" className="text-lg">
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create Account
                    </Button>
                    <Button size="lg" onClick={() => navigate('/login')} variant="glass" className="text-lg">
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </Button>
                  </>
                )}
              </>
            )}
            <Button size="lg" onClick={() => navigate('/documentation')} variant="glass" className="text-lg">
              View Documentation
            </Button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Link, label: 'URL Scanner', desc: 'Analyze suspicious links' },
              { icon: Mail, label: 'Email Checker', desc: 'Detect phishing emails' },
              { icon: MessageSquare, label: 'SMS Analyzer', desc: 'Verify text messages' },
              { icon: QrCode, label: 'QR Scanner', desc: 'Check QR code safety' }
            ].map((feature, idx) => (
              <div 
                key={idx} 
                className="group p-6 rounded-xl glass-card hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)] transition-all duration-500 hover:scale-105 animate-fade-in cursor-pointer border border-primary/20 hover:border-primary/50"
                style={{ animationDelay: `${0.6 + idx * 0.1}s` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-primary/50 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display font-semibold text-base mb-2 uppercase tracking-wider">{feature.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed font-mono">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
