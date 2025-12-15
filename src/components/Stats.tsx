import { Shield, Eye, Users, TrendingUp } from 'lucide-react'

export function Stats() {
  const stats = [
    { icon: Shield, value: '1M+', label: 'Scans Performed' },
    { icon: Eye, value: '99.7%', label: 'Detection Rate' },
    { icon: Users, value: '50K+', label: 'Protected Users' },
    { icon: TrendingUp, value: '24/7', label: 'AI Monitoring' }
  ]

  return (
    <section className="py-20 relative overflow-hidden bg-background">
      <div className="absolute inset-0 cyber-gradient opacity-20" />
      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className="text-center group animate-scale-in"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-primary/20 mb-4 group-hover:scale-110 transition-transform shadow-[0_0_30px_hsl(var(--primary)/0.5)] border-2 border-primary/50">
                <stat.icon className="w-8 h-8 text-primary" />
              </div>
              <div className="text-5xl lg:text-6xl font-display font-bold mb-2 text-primary neon-glow">{stat.value}</div>
              <div className="text-base lg:text-lg text-foreground/80 font-mono uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
