
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import { Toaster as SonnerToaster } from 'sonner';
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
import TestAnalysisTools from "./components/TestAnalysisTools";
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';
import Visualize from './pages/Visualize';
import Upload from './pages/Upload';
import { Helmet } from 'react-helmet';

function App() {
  const { isLoading, isAdmin } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-gray-900 to-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
        <Helmet>
          <title>GenBI - Generative Business Intelligence</title>
          <meta name="description" content="Transform your data into actionable insights with our AI-powered business intelligence platform. Ask questions in plain English and get visualization instantly." />
        </Helmet>
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            
            {/* Only show Test Tools to admins */}
            {isAdmin && <Route path="/test" element={<TestAnalysisTools />} />}
            
            {/* Expose main data visualization routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/upload-old" element={<UploadPage />} />
            <Route path="/visualize/:datasetId" element={<Visualize />} />
            <Route path="/visualize" element={<VisualizePage />} />
            <Route path="/analyze/:datasetId" element={<AnalyzePage />} />
            <Route path="/analyze" element={<AnalyzePage />} />
            <Route path="/dataset/:datasetId" element={<DatasetPage />} />
            
            {/* Protected routes */}
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
  );
}

export default App;
