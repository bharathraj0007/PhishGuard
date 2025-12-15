import { Shield, Zap, Lock, TrendingUp } from 'lucide-react'

export function Features() {
  const features = [
    {
      icon: Shield,
      title: 'AI-Powered Detection',
      description: 'Advanced machine learning algorithms analyze content for sophisticated phishing patterns and threats.'
    },
    {
      icon: Zap,
      title: 'Instant Results',
      description: 'Get comprehensive security analysis in seconds with detailed threat indicators and recommendations.'
    },
    {
      icon: Lock,
      title: 'Privacy First',
      description: 'Your scanned content is analyzed securely and never shared. Optional history for authenticated users.'
    },
    {
      icon: TrendingUp,
      title: 'Continuous Learning',
      description: 'Our AI constantly adapts to new phishing techniques and emerging threat patterns.'
    }
  ]

  return (
    <section className="py-28 relative overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,128,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,128,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h2 className="text-4xl lg:text-6xl font-display font-bold mb-6 animate-fade-in uppercase tracking-wider">
            Why <span className="matrix-text neon-glow">PhishGuard</span>?
          </h2>
          <p className="text-xl lg:text-2xl text-muted-foreground leading-relaxed animate-fade-in font-mono" style={{ animationDelay: '0.2s' }}>
            <span className="text-primary">{'>'}</span> Enterprise-grade AI-powered threat detection
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group p-8 rounded-2xl glass-card hover:shadow-[0_0_40px_hsl(var(--primary)/0.4)] transition-all duration-500 hover:scale-105 animate-fade-in border border-primary/20 hover:border-primary/50"
              style={{ animationDelay: `${0.3 + idx * 0.1}s` }}
            >
              <div className="w-16 h-16 rounded-lg bg-primary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-[0_0_20px_hsl(var(--primary)/0.5)] border-2 border-primary/50">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-display font-semibold mb-3 uppercase tracking-wide">{feature.title}</h3>
              <p className="text-base text-muted-foreground leading-relaxed font-mono">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
