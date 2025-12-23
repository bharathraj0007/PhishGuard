import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/HomePage'
import { AboutPage } from './pages/AboutPage'
import { DocumentationPage } from './pages/DocumentationPage'
import { ContactSupportPage } from './pages/ContactSupportPage'
import { DashboardPage } from './pages/DashboardPage'
import { InsightsPage } from './pages/InsightsPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import AdminPage from './pages/AdminPage'

function App() {
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/insights" element={<ProtectedRoute><InsightsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>} />
          </Routes>
        </main>
        
        <footer className="border-t py-8 bg-muted/30">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© 2025 PhishGuard. Protecting you from phishing threats with AI-powered detection.</p>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App