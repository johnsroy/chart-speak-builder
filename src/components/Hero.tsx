
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, Upload, BarChart2 } from 'lucide-react';
import HeroDemo from './HeroDemo';
import { useAuth } from '@/hooks/useAuth';

const Hero = () => {
  const { isAuthenticated, user, adminLogin } = useAuth();
  
  // Function to handle the dashboard or login button click
  const handleDashboardClick = () => {
    if (!isAuthenticated && !user) {
      adminLogin();
    }
  };
  
  return (
    <section id="hero" className="py-16 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-gradient">
              Turn Your Data into Visual Insights
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300">
              Upload your data, ask questions in plain English, and get beautiful visualizations instantly. No coding required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button asChild size="lg" className="purple-gradient shadow-glow">
                <Link to="/upload" className="flex items-center">
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Data
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="border-purple-400 bg-transparent hover:bg-purple-900/20"
                onClick={handleDashboardClick}
              >
                <Link to="/dashboard" className="flex items-center">
                  <BarChart2 className="mr-2 h-5 w-5" />
                  Dashboard
                </Link>
              </Button>
            </div>
          </div>

          <div className="glass-card p-1 rounded-2xl">
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
