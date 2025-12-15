import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { DocumentationPage } from './pages/DocumentationPage'
import { ContactSupportPage } from './pages/ContactSupportPage'
import { DashboardPage } from './pages/DashboardPage'
import { InsightsPage } from './pages/InsightsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminSetupPage } from './pages/AdminSetupPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminRoute } from './components/AdminRoute'
import { initializeDefaultAdmin } from './lib/init-admin'

function App() {
  // Initialize admin user on app startup
  useEffect(() => {
    initializeDefaultAdmin().catch(err => {
      console.error('Failed to initialize admin:', err)
    })
  }, [])

  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <Toaster position="top-right" />
        <Navbar />
        
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="/contact-support" element={<ContactSupportPage />} />
            <Route path="/admin-setup" element={<AdminSetupPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route 
              path="/admin-login" 
              element={<AdminLoginPage />} 
            />
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboardPage />
                </AdminRoute>
              } 
            />
          </Routes>
        </main>
        
        <footer className="border-t py-8 bg-muted/30">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© 2024 PhishGuard. Protecting you from phishing threats with AI-powered detection.</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App