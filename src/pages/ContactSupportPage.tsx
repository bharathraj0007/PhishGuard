import { Mail, Phone, MapPin, Clock, Copy, MessageCircle, Globe } from 'lucide-react'
import { Button } from '../components/ui/button'
import { useState } from 'react'
import { toast } from 'sonner'

export function ContactSupportPage() {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null)
  const [copiedPhone, setCopiedPhone] = useState<boolean>(false)

  const contactInfo = [
    {
      type: 'Email Support',
      value: 'support@phishguard.com',
      icon: Mail,
      color: 'from-primary to-cyan-400',
      description: 'For general inquiries and support tickets'
    },
    {
      type: 'Emergency Hotline',
      value: '+1 (555) 789-4560',
      icon: Phone,
      color: 'from-cyan-400 to-primary',
      description: 'For urgent security concerns'
    },
    {
      type: 'Live Chat',
      value: 'Available 24/7',
      icon: MessageCircle,
      color: 'from-primary to-purple-500',
      description: 'Real-time support via our website'
    },
    {
      type: 'Office Location',
      value: '123 Cyber Street, Tech City, TC 12345',
      icon: MapPin,
      color: 'from-purple-500 to-primary',
      description: 'Visit us during business hours'
    }
  ]

  const businessHours = [
    { day: 'Monday - Friday', hours: '9:00 AM - 6:00 PM EST' },
    { day: 'Saturday', hours: '10:00 AM - 4:00 PM EST' },
    { day: 'Sunday', hours: 'Closed' },
    { day: 'Emergency', hours: '24/7 Available' }
  ]

  const faqItems = [
    {
      question: 'What is the average response time?',
      answer: 'We typically respond to support emails within 2-4 hours during business hours. For emergency hotline calls, response is immediate.'
    },
    {
      question: 'Is there a demo account for testing?',
      answer: 'Yes! Check our login page for demo credentials. Use demo@phishguard.com with the provided password to test all features.'
    },
    {
      question: 'Do you offer enterprise support?',
      answer: 'Yes, we provide dedicated enterprise support with custom SLAs. Contact our enterprise team for more details.'
    },
    {
      question: 'How do I report a security vulnerability?',
      answer: 'Please email security@phishguard.com with details. We take security seriously and will respond promptly.'
    },
    {
      question: 'Can I schedule a demo or consultation?',
      answer: 'Absolutely! Email support@phishguard.com to schedule a 30-minute consultation with our team.'
    }
  ]

  const handleCopy = (value: string, type: 'email' | 'phone') => {
    navigator.clipboard.writeText(value)
    if (type === 'email') {
      setCopiedEmail(value)
      setTimeout(() => setCopiedEmail(null), 2000)
    } else {
      setCopiedPhone(true)
      setTimeout(() => setCopiedPhone(false), 2000)
    }
    toast.success(`Copied ${type === 'email' ? 'email' : 'phone'} to clipboard`)
  }

  return (
    <div className="min-h-screen py-20 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      <div className="absolute inset-0 scanlines opacity-20" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-20 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6 uppercase tracking-wider matrix-text">
            /Contact_Support/
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-mono">
            &gt; Get in touch with our expert support team. We're here to help 24/7
          </p>
        </div>

        {/* Contact Info Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-20 max-w-5xl mx-auto">
          {contactInfo.map((info, index) => {
            const IconComponent = info.icon
            return (
              <div
                key={index}
                className="cyber-card p-8 animate-scale-in hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br ${info.color} mb-6 shadow-[0_0_20px_hsl(var(--primary)/0.4)]`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2 uppercase tracking-wide">
                  {info.type}
                </h3>
                <p className="text-muted-foreground font-mono text-sm mb-4">
                  {info.description}
                </p>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono font-bold text-primary neon-glow">
                    {info.value}
                  </p>
                  <button
                    onClick={() => handleCopy(info.value, info.type === 'Email Support' ? 'email' : 'phone')}
                    className="p-2 hover:bg-primary/20 rounded-lg transition-colors duration-300"
                    title="Copy to clipboard"
                  >
                    <Copy className={`w-5 h-5 transition-colors duration-300 ${
                      (info.type === 'Email Support' && copiedEmail === info.value) || 
                      (info.type === 'Emergency Hotline' && copiedPhone)
                        ? 'text-primary'
                        : 'text-muted-foreground hover:text-primary'
                    }`} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Business Hours */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="cyber-card p-8 animate-fade-in">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-display font-bold uppercase tracking-wide">
                Business Hours
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {businessHours.map((item, index) => (
                <div key={index} className="flex items-center justify-between pb-4 border-b border-primary/20">
                  <span className="font-display font-bold uppercase">{item.day}</span>
                  <span className="font-mono text-primary neon-glow">{item.hours}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold uppercase tracking-wider matrix-text mb-3">
              /Frequently_Asked_Questions/
            </h2>
            <p className="text-muted-foreground font-mono">
              &gt; Common questions about our support services
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <details
                key={index}
                className="cyber-card group cursor-pointer p-6 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
              >
                <summary className="flex items-center justify-between font-display font-bold uppercase tracking-wide">
                  <span>{item.question}</span>
                  <span className="group-open:rotate-180 transition-transform duration-300">▼</span>
                </summary>
                <p className="mt-4 text-muted-foreground font-mono text-sm leading-relaxed">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="max-w-3xl mx-auto text-center">
          <div className="cyber-card p-12 animate-fade-in">
            <h2 className="text-3xl font-display font-bold mb-4 uppercase tracking-wider">
              /Need_Immediate_Assistance/
            </h2>
            <p className="text-muted-foreground mb-8 font-mono">
              &gt; Contact us via email or phone for urgent support
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => handleCopy('support@phishguard.com', 'email')}
                variant="matrix"
                size="lg"
                className="flex items-center gap-2"
              >
                <Mail className="w-5 h-5" />
                Email Support
              </Button>
              <Button
                onClick={() => handleCopy('+1 (555) 789-4560', 'phone')}
                variant="glass"
                size="lg"
                className="flex items-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Call Us
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
