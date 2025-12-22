import { Shield, Menu, X, LogIn, UserPlus, LogOut, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { Button } from './ui/button'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { blink } from '../lib/blink'

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setIsLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleSignOut = async () => {
    await blink.auth.signOut()
    navigate('/')
  }

  const isHomePage = location.pathname === '/'
  const isDashboard = location.pathname === '/dashboard'
  const isLoginPage = location.pathname === '/login'
  const isSignupPage = location.pathname === '/signup'

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
            {!isDashboard && (
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
            
            {/* Auth buttons */}
            {!isLoading && (
              <>
                {user ? (
                  // Logged in: show Dashboard, Admin (if admin), and Sign Out
                  <div className="flex items-center gap-3">
                    {!isDashboard && (
                      <Button onClick={() => navigate('/dashboard')} variant="glass" size="sm">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </Button>
                    )}
                    {user.role === 'admin' && (
                      <Button onClick={() => navigate('/admin')} variant="ghost" size="sm">
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Admin
                      </Button>
                    )}
                    <Button onClick={handleSignOut} variant="ghost" size="sm">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  // Not logged in: show Login and Sign Up
                  <div className="flex items-center gap-3">
                    {!isLoginPage && (
                      <Button onClick={() => navigate('/login')} variant="ghost" size="sm">
                        <LogIn className="w-4 h-4 mr-2" />
                        Login
                      </Button>
                    )}
                    {!isSignupPage && (
                      <Button onClick={() => navigate('/signup')} variant="matrix" size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Sign Up
                      </Button>
                    )}
                  </div>
                )}
              </>
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
            {!isDashboard && (
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
            
            {/* Mobile Auth buttons */}
            <div className="pt-4 border-t border-primary/30 space-y-3">
              {!isLoading && (
                <>
                  {user ? (
                    // Logged in: show Dashboard and Sign Out
                    <>
                      {!isDashboard && (
                        <Button 
                          onClick={() => {
                            navigate('/dashboard')
                            setMobileMenuOpen(false)
                          }} 
                          variant="glass" 
                          className="w-full"
                        >
                          <LayoutDashboard className="w-4 h-4 mr-2" />
                          Dashboard
                        </Button>
                      )}
                      <Button 
                        onClick={() => {
                          handleSignOut()
                          setMobileMenuOpen(false)
                        }} 
                        variant="ghost" 
                        className="w-full"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    // Not logged in: show Login and Sign Up
                    <>
                      {!isLoginPage && (
                        <Button 
                          onClick={() => {
                            navigate('/login')
                            setMobileMenuOpen(false)
                          }} 
                          variant="ghost" 
                          className="w-full"
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Login
                        </Button>
                      )}
                      {!isSignupPage && (
                        <Button 
                          onClick={() => {
                            navigate('/signup')
                            setMobileMenuOpen(false)
                          }} 
                          variant="matrix" 
                          className="w-full"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Sign Up
                        </Button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
