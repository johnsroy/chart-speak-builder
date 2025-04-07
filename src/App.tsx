
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import VisualizePage from './pages/VisualizePage';
import AnalyzePage from './pages/AnalyzePage';
import DatasetPage from './pages/DatasetPage';
import AccountPage from './pages/AccountPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { supabase } from './lib/supabase';
import TestAnalysisTools from "./components/TestAnalysisTools";
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AuthProvider initialSession={session}>
        <Router>
          <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
            <NavBar />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Home />} />
                
                {/* Add Test Route */}
                <Route path="/test" element={<TestAnalysisTools />} />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/visualize/:datasetId" element={<ProtectedRoute><VisualizePage /></ProtectedRoute>} />
                <Route path="/analyze/:datasetId" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
                <Route path="/dataset/:datasetId" element={<ProtectedRoute><DatasetPage /></ProtectedRoute>} />
                <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

                {/* Auth routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
              </Routes>
            </main>
          </div>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
