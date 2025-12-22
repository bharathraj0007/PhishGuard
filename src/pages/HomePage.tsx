import { Hero } from '../components/Hero'
import { Stats } from '../components/Stats'
import { Features } from '../components/Features'
import { Button } from '../components/ui/button'
import { Shield, Lock, Zap, Users, UserPlus, LogIn, LayoutDashboard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { blink } from '../lib/blink'

export function HomePage() {
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

  const handleGetStarted = () => {
    navigate('/dashboard')
  }

  return (
    <div>
      <Hero onGetStarted={handleGetStarted} />
      <Stats />
      
      <div id="features">
        <Features />
      </div>

      {/* Why PhishGuard Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 uppercase tracking-wider matrix-text">
              /Why_Choose_PhishGuard/
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-mono">
              &gt; Advanced threat detection powered by artificial intelligence
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="cyber-card p-8 animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 uppercase tracking-wide">
                Multi-Vector Protection
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Analyze links, emails, SMS messages, and QR codes in one unified platform. Our comprehensive approach ensures no threat goes undetected.
              </p>
            </div>

            <div className="cyber-card p-8 animate-scale-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 uppercase tracking-wide">
                Real-Time Analysis
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Get instant results with our AI-powered detection engine. No waiting, no delays—know the threat level immediately.
              </p>
            </div>

            <div className="cyber-card p-8 animate-scale-in" style={{ animationDelay: '0.3s' }}>
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 uppercase tracking-wide">
                Privacy First
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Your data is encrypted and secure. We never store sensitive information and all scans are processed securely.
              </p>
            </div>

            <div className="cyber-card p-8 animate-scale-in" style={{ animationDelay: '0.4s' }}>
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold mb-3 uppercase tracking-wide">
                Built for Everyone
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                From individuals to enterprises, our intuitive interface makes advanced security accessible to all users.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background" />
        <div className="absolute inset-0 scanlines" />
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="max-w-3xl mx-auto animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 uppercase tracking-wider matrix-text">
              /Ready_To_Secure_Your_Digital_Life/
            </h2>
            <p className="text-lg text-muted-foreground mb-10 font-mono">
              &gt; Join thousands protecting themselves from phishing attacks
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!isLoading && (
                <>
                  {user ? (
                    <Button onClick={() => navigate('/dashboard')} size="lg" variant="matrix" className="text-lg">
                      <LayoutDashboard className="w-5 h-5 mr-2" />
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => navigate('/signup')} size="lg" variant="matrix" className="text-lg">
                        <UserPlus className="w-5 h-5 mr-2" />
                        Create Free Account
                      </Button>
                      <Button onClick={() => navigate('/login')} size="lg" variant="glass" className="text-lg">
                        <LogIn className="w-5 h-5 mr-2" />
                        Sign In
                      </Button>
                    </>
                  )}
                </>
              )}
              <Button onClick={() => navigate('/documentation')} size="lg" variant="glass" className="text-lg">
                View Docs
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
