
import React from 'react';
import NavBar from '@/components/NavBar';
import UploadArea from '@/components/UploadArea';
import Footer from '@/components/Footer';

const Upload = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <NavBar />
      <UploadArea />
      <Footer />
    </div>
  );
};

export default Upload;
