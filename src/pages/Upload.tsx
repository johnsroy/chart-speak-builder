
import React from 'react';
import NavBar from '@/components/NavBar';
import UploadArea from '@/components/UploadArea';
import Footer from '@/components/Footer';

const Upload = () => {
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
