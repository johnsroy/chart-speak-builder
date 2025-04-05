
import React, { useEffect } from 'react';
import NavBar from '@/components/NavBar';
import UploadArea from '@/components/UploadArea';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const Upload = () => {
  const navigate = useNavigate();
  
  // Listen for successful upload events
  useEffect(() => {
    const handleUploadSuccess = (event: CustomEvent) => {
      console.log('Upload success event received', event.detail);
      // Redirect to dashboard after successful upload
      toast.success("Upload successful! Redirecting to dashboard...");
      navigate('/dashboard');
    };
    
    // Add event listener
    window.addEventListener('upload:success' as any, handleUploadSuccess);
    
    // Clean up
    return () => {
      window.removeEventListener('upload:success' as any, handleUploadSuccess);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <NavBar />
      <div className="pt-24 px-4 pb-16">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-6 text-gradient">Upload Your Data</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
            Drag and drop your CSV, Excel, or connect to your cloud storage to start generating insights.
          </p>
          <div className="glass-card p-2 mx-auto max-w-4xl">
            <UploadArea />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Upload;
