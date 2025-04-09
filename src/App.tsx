
import React from 'react';
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
import { useAuth } from './hooks/useAuth';
import Visualize from './pages/Visualize';
import Upload from './pages/Upload';
import { Helmet } from 'react-helmet';

function App() {
  return (
    <Router>
      <Helmet>
        <title>GenBI - Generative Business Intelligence</title>
        <meta name="description" content="Transform your data into actionable insights with our AI-powered business intelligence platform. Ask questions in plain English and get visualization instantly." />
      </Helmet>
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/pay-now" element={<PayNowPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/payment-success" element={<PaymentSuccessPage />} />
        <Route path="/payment-cancelled" element={<PaymentCanceledPage />} />
        
        {/* Layout with NavBar for protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <NavBar />
          </ProtectedRoute>
        }>
          {/* Protected content routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/upload-old" element={<UploadPage />} />
          <Route path="/visualize/:datasetId" element={<Visualize />} />
          <Route path="/visualize" element={<VisualizePage />} />
          <Route path="/analyze/:datasetId" element={<AnalyzePage />} />
          <Route path="/analyze" element={<AnalyzePage />} />
          <Route path="/dataset/:datasetId" element={<DatasetPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/test" element={<TestAnalysisTools />} />
        </Route>

        {/* Fallback - redirect to dashboard if logged in, otherwise to landing page */}
        <Route path="*" element={
          <Navigate to="/" replace />
        } />
      </Routes>
      
      <Toaster />
      <SonnerToaster position="top-right" richColors />
    </Router>
  );
}

export default App;
