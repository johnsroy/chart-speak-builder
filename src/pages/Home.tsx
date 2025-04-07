
import React from 'react';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Benefits from '@/components/Benefits';
import HowItWorks from '@/components/HowItWorks';
import Testimonials from '@/components/Testimonials';
import Footer from '@/components/Footer';

const Home = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <Hero />
      <Features />
      <Benefits />
      <HowItWorks />
      <Testimonials />
      <Footer />
    </div>
  );
};

export default Home;
