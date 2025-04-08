
import React from 'react';
import NavBar from '@/components/NavBar';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import Benefits from '@/components/Benefits';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';
import KeyOfferings from '@/components/KeyOfferings';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { isLoading } = useAuth();
  
  // Remove the automatic redirect so users can see the landing page
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900">
        <div className="glass-card p-8 rounded-xl text-white text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white overflow-hidden">
      <NavBar />
      <Hero />
      <Features />
      <HowItWorks />
      <KeyOfferings />
      <Benefits />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Index;
