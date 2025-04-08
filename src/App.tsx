
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
import NavBar from './components/NavBar';
import Index from './pages/Index';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import VisualizePage from './pages/VisualizePage';
import AnalyzePage from './pages/AnalyzePage';
import DatasetPage from './pages/DatasetPage';
import AccountPage from './pages/AccountPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import PayNowPage from './pages/auth/PayNowPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import PaymentSuccessPage from './pages/payment/PaymentSuccessPage';
import PaymentCanceledPage from './pages/payment/PaymentCanceledPage';
import TestAnalysisTools from "./components/TestAnalysisTools";
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Visualize from './pages/Visualize';
import Upload from './pages/Upload';
import { Helmet } from 'react-helmet';

function AppContent() {
  const { isLoading, isAdmin } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <Helmet>
        <title>GenBI - Generative Business Intelligence</title>
        <meta name="description" content="Transform your data into actionable insights with our AI-powered business intelligence platform. Ask questions in plain English and get visualization instantly." />
      </Helmet>
      <Routes>
        {/* Public routes - don't show navbar on landing page */}
        <Route 
          path="/" 
          element={<Index />}
        />
        
        {/* Auth routes that don't need the main NavBar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pay-now" element={<PayNowPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
              
        {/* Payment response routes - don't need authentication */}
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-cancelled" element={<PaymentCanceledPage />} />
        
        {/* Routes with NavBar */}
        <Route element={<>
          <NavBar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              {/* Protected routes - require authentication */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="/upload-old" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
              <Route path="/visualize/:datasetId" element={<ProtectedRoute><Visualize /></ProtectedRoute>} />
              <Route path="/visualize" element={<ProtectedRoute><VisualizePage /></ProtectedRoute>} />
              <Route path="/analyze/:datasetId" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
              <Route path="/analyze" element={<ProtectedRoute><AnalyzePage /></ProtectedRoute>} />
              <Route path="/dataset/:datasetId" element={<ProtectedRoute><DatasetPage /></ProtectedRoute>} />
              
              {/* Account & payment routes */}
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              
              {/* Admin route */}
              {isAdmin && <Route path="/test" element={<ProtectedRoute requireAdmin={true}><TestAnalysisTools /></ProtectedRoute>} />}
            </Routes>
          </main>
        </>}>
        </Route>
      </Routes>
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
