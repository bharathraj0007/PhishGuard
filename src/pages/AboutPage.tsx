import { Shield, Target, Brain, Users, Lock, Zap } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useNavigate } from 'react-router-dom'

export function AboutPage() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    // Guest mode: no sign-in required
    navigate('/dashboard')
  }

  return (
    <div className="py-24">
      {/* Hero Section */}
      <section className="container mx-auto px-4 mb-24">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/50 bg-primary/10 mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-mono uppercase tracking-wide">About PhishGuard</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6 uppercase tracking-wider matrix-text">
            /Defending_The_Digital_Frontier/
          </h1>
          
          <p className="text-xl text-muted-foreground font-mono leading-relaxed mb-8">
            &gt; PhishGuard is an AI-powered cybersecurity platform designed to protect individuals and organizations from sophisticated phishing attacks across multiple vectors.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 mb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 uppercase tracking-wider">
                Our Mission
              </h2>
              <p className="text-muted-foreground font-mono leading-relaxed mb-4">
                In an era where phishing attacks cost billions annually and compromise millions of accounts, we believe everyone deserves military-grade security without the complexity.
              </p>
              <p className="text-muted-foreground font-mono leading-relaxed mb-4">
                PhishGuard was built by cybersecurity experts who witnessed firsthand the devastating impact of phishing on businesses and individuals. We created a solution that combines cutting-edge AI with an intuitive interface.
              </p>
              <p className="text-muted-foreground font-mono leading-relaxed">
                Our goal: Make advanced threat detection accessible to everyone, from tech novices to security professionals.
              </p>
            </div>

            <div className="cyber-card p-8 animate-scale-in">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold mb-2 uppercase tracking-wide">Precision Detection</h3>
                    <p className="text-sm text-muted-foreground font-mono">99.7% accuracy in identifying phishing threats</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                    <Brain className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold mb-2 uppercase tracking-wide">AI-Powered</h3>
                    <p className="text-sm text-muted-foreground font-mono">Advanced machine learning models trained on millions of threats</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold mb-2 uppercase tracking-wide">Global Protection</h3>
                    <p className="text-sm text-muted-foreground font-mono">Serving 50,000+ users worldwide</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 uppercase tracking-wider matrix-text">
                /Advanced_Technology_Stack/
              </h2>
              <p className="text-lg text-muted-foreground font-mono">
                &gt; Powered by cutting-edge artificial intelligence
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="cyber-card p-8 text-center animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                  <Brain className="w-9 h-9 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold mb-3 uppercase tracking-wide">
                  Neural Networks
                </h3>
                <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                  Deep learning models analyze patterns across millions of data points to detect even the most sophisticated attacks.
                </p>
              </div>

              <div className="cyber-card p-8 text-center animate-scale-in" style={{ animationDelay: '0.2s' }}>
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                  <Lock className="w-9 h-9 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold mb-3 uppercase tracking-wide">
                  End-to-End Encryption
                </h3>
                <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                  Military-grade encryption ensures your scans remain private and secure at all times.
                </p>
              </div>

              <div className="cyber-card p-8 text-center animate-scale-in" style={{ animationDelay: '0.3s' }}>
                <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                  <Zap className="w-9 h-9 text-primary" />
                </div>
                <h3 className="text-xl font-display font-bold mb-3 uppercase tracking-wide">
                  Real-Time Processing
                </h3>
                <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                  Lightning-fast analysis delivers results in milliseconds, not minutes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Values Section */}
      <section className="container mx-auto px-4 mb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-12 text-center uppercase tracking-wider">
            Our Core Values
          </h2>

          <div className="space-y-6">
            <div className="cyber-card p-6 animate-fade-in">
              <h3 className="text-xl font-display font-bold mb-2 uppercase tracking-wide text-primary">
                Security First
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Every decision we make prioritizes user security and privacy. We never compromise on protection.
              </p>
            </div>

            <div className="cyber-card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-xl font-display font-bold mb-2 uppercase tracking-wide text-primary">
                Transparency
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                We believe in open communication about our technology, capabilities, and limitations.
              </p>
            </div>

            <div className="cyber-card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-xl font-display font-bold mb-2 uppercase tracking-wide text-primary">
                Continuous Innovation
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Cyber threats evolve daily. Our AI models are continuously updated to stay ahead of attackers.
              </p>
            </div>

            <div className="cyber-card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-xl font-display font-bold mb-2 uppercase tracking-wide text-primary">
                Accessibility
              </h3>
              <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                Advanced security shouldn't require a PhD. We make protection simple and accessible to everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto cyber-card p-12 text-center animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-6 uppercase tracking-wider matrix-text">
            /Join_The_Movement/
          </h2>
          <p className="text-lg text-muted-foreground mb-8 font-mono">
            &gt; Start protecting yourself from phishing attacks today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleGetStarted} size="lg" variant="cyber">
              Get Started Now
            </Button>
            <Button onClick={() => navigate('/')} size="lg" variant="glass">
              Back to Home
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
