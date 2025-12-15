import { Shield, Menu, X } from 'lucide-react'
import { Button } from './ui/button'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { blink } from '../lib/blink'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setIsAdmin(state.user?.role === 'admin')
    })
    return unsubscribe
  }, [])

  const handleAuthClick = async () => {
    if (user) {
      await blink.auth.signOut()
      navigate('/')
    } else {
      // Only admins should access login
      navigate('/admin-login')
    }
  }

  const handleGetStarted = () => {
    // Guest mode: no sign-in required
    navigate('/dashboard')
  }

  const isHomePage = location.pathname === '/'
  const isDashboard = location.pathname === '/dashboard'
  const isAdminDashboard = location.pathname === '/admin'

  return (
    <nav className="border-b border-primary/30 glass-card sticky top-0 z-50 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" 
            onClick={() => navigate('/')}
          >
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.4)] border border-primary/50">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <span className="text-2xl font-display font-bold matrix-text uppercase tracking-wider">PhishGuard</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navigate('/')} 
              className={`text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 hover:scale-105 neon-glow ${isHomePage ? 'text-primary' : ''}`}
            >
              /Home/
            </button>
            {!isDashboard && !isAdminDashboard && (
              <>
                <button 
                  onClick={() => navigate('/about')} 
                  className={`text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 hover:scale-105 neon-glow ${location.pathname === '/about' ? 'text-primary' : ''}`}
                >
                  /About/
                </button>
                <button 
                  onClick={() => navigate('/documentation')} 
                  className={`text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 hover:scale-105 neon-glow ${location.pathname === '/documentation' ? 'text-primary' : ''}`}
                >
                  /Docs/
                </button>
                <button 
                  onClick={() => navigate('/contact-support')} 
                  className={`text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 hover:scale-105 neon-glow ${location.pathname === '/contact-support' ? 'text-primary' : ''}`}
                >
                  /Support/
                </button>
              </>
            )}
            {isDashboard && (
              <span className="text-sm font-display font-bold uppercase tracking-wide text-primary neon-glow">
                /Dashboard/
              </span>
            )}
            {isAdminDashboard && (
              <span className="text-sm font-display font-bold uppercase tracking-wide text-primary neon-glow">
                /Admin Dashboard/
              </span>
            )}
            {isAdmin && !isAdminDashboard && (
              <button 
                onClick={() => navigate('/admin')} 
                className="text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 hover:scale-105 neon-glow"
              >
                /Admin/
              </button>
            )}
            {isAdmin && (
              <Button onClick={handleAuthClick} variant="ghost" size="sm">
                {user ? 'Logout' : 'Admin Login'}
              </Button>
            )}
            {!isDashboard && !isAdminDashboard && (
              <Button onClick={handleGetStarted} variant="matrix" size="sm">
                Get Started
              </Button>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-primary/30 glass-card animate-fade-in">
          <div className="container mx-auto px-4 py-6 space-y-4">
            <button
              onClick={() => {
                navigate('/')
                setMobileMenuOpen(false)
              }}
              className={`block w-full text-left text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 py-3 neon-glow ${isHomePage ? 'text-primary' : ''}`}
            >
              /Home/
            </button>
            {!isDashboard && !isAdminDashboard && (
              <>
                <button
                  onClick={() => {
                    navigate('/about')
                    setMobileMenuOpen(false)
                  }}
                  className={`block w-full text-left text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 py-3 neon-glow ${location.pathname === '/about' ? 'text-primary' : ''}`}
                >
                  /About/
                </button>
                <button
                  onClick={() => {
                    navigate('/documentation')
                    setMobileMenuOpen(false)
                  }}
                  className={`block w-full text-left text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 py-3 neon-glow ${location.pathname === '/documentation' ? 'text-primary' : ''}`}
                >
                  /Docs/
                </button>
                <button
                  onClick={() => {
                    navigate('/contact-support')
                    setMobileMenuOpen(false)
                  }}
                  className={`block w-full text-left text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 py-3 neon-glow ${location.pathname === '/contact-support' ? 'text-primary' : ''}`}
                >
                  /Support/
                </button>
              </>
            )}
            {isDashboard && (
              <div className="text-sm font-display font-bold uppercase tracking-wide text-primary py-3 neon-glow">
                /Dashboard/
              </div>
            )}
            {isAdminDashboard && (
              <div className="text-sm font-display font-bold uppercase tracking-wide text-primary py-3 neon-glow">
                /Admin Dashboard/
              </div>
            )}
            {isAdmin && !isAdminDashboard && (
              <button
                onClick={() => {
                  navigate('/admin')
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left text-sm font-display font-bold uppercase tracking-wide hover:text-primary transition-all duration-300 py-3 neon-glow"
              >
                /Admin/
              </button>
            )}
            {isAdmin && (
              <Button onClick={handleAuthClick} variant="ghost" className="w-full">
                {user ? 'Logout' : 'Admin Login'}
              </Button>
            )}
            {!isDashboard && !isAdminDashboard && (
              <Button onClick={handleGetStarted} variant="matrix" className="w-full">
                Get Started
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
