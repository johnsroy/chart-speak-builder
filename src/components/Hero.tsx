
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight, Upload, BarChart2 } from 'lucide-react';
import HeroDemo from './HeroDemo';
import AnalyticsDashboardDemo from './AnalyticsDashboardDemo';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Hero = () => {
  const { isAuthenticated, user, adminLogin } = useAuth();
  const [activeDemo, setActiveDemo] = React.useState('chart');
  
  // Function to handle the dashboard or login button click
  const handleDashboardClick = () => {
    if (!isAuthenticated && !user) {
      adminLogin();
    }
  };
  
  return (
    <section id="hero" className="py-16 md:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="max-w-2xl text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-gradient">
              Turn Your Data into Visual Insights
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-300">
              Upload your data, ask questions in plain English, and get beautiful visualizations instantly. No coding required.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {isAuthenticated ? (
                <Button asChild size="lg" className="purple-gradient shadow-glow group">
                  <Link to="/upload" className="flex items-center">
                    <span className="relative">
                      <Upload className="mr-2 h-5 w-5 transition-all duration-300 group-hover:scale-110 animate-pulse-custom" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full opacity-75 animate-ping"></span>
                    </span>
                    Upload Data
                    <ChevronRight className="ml-2 h-5 w-5 transition-all duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="purple-gradient shadow-glow group">
                  <Link to="/signup" className="flex items-center">
                    <span className="relative">
                      <Upload className="mr-2 h-5 w-5 transition-all duration-300 group-hover:scale-110 animate-pulse-custom" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full opacity-75 animate-ping"></span>
                    </span>
                    Start Free Trial
                    <ChevronRight className="ml-2 h-5 w-5 transition-all duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
              
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="border-purple-400 bg-transparent hover:bg-purple-900/20 group overflow-hidden"
                onClick={handleDashboardClick}
              >
                {isAuthenticated ? (
                  <Link to="/dashboard" className="flex items-center">
                    <span className="relative flex items-center justify-center">
                      <BarChart2 className="mr-2 h-5 w-5 transition-all duration-300 group-hover:text-purple-400" />
                      <span className="absolute inset-0 bg-purple-400/20 scale-0 rounded-full group-hover:scale-150 transition-transform duration-500"></span>
                    </span>
                    Dashboard
                  </Link>
                ) : (
                  <Link to="/signup" className="flex items-center">
                    <span className="relative flex items-center justify-center">
                      <BarChart2 className="mr-2 h-5 w-5 transition-all duration-300 group-hover:text-purple-400" />
                      <span className="absolute inset-0 bg-purple-400/20 scale-0 rounded-full group-hover:scale-150 transition-transform duration-500"></span>
                    </span>
                    Learn More
                  </Link>
                )}
              </Button>
            </div>
          </div>

          <div className="glass-card p-1 rounded-2xl shadow-glow">
            <Tabs 
              defaultValue="chart" 
              value={activeDemo}
              onValueChange={setActiveDemo}
              className="w-full h-full"
            >
              <TabsList className="bg-white/10 backdrop-blur-sm w-full justify-center mb-2">
                <TabsTrigger value="chart" className="text-sm data-[state=active]:bg-purple-800/50 data-[state=active]:text-white group relative overflow-hidden">
                  <span className="relative z-10 flex items-center">
                    <span className="mr-1.5 inline-flex items-center justify-center">
                      <svg className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-data-[state=active]:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                    </span>
                    Chart Generator
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300"></span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="text-sm data-[state=active]:bg-purple-800/50 data-[state=active]:text-white group relative overflow-hidden">
                  <span className="relative z-10 flex items-center">
                    <span className="mr-1.5 inline-flex items-center justify-center">
                      <svg className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12 group-data-[state=active]:rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                    </span>
                    Analytics Dashboard
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 group-data-[state=active]:opacity-100 transition-opacity duration-300"></span>
                </TabsTrigger>
              </TabsList>
              
              <div className="w-full h-full overflow-hidden rounded-xl">
                <TabsContent value="chart" className="m-0 h-full animate-fade-in">
                  <HeroDemo />
                </TabsContent>
                
                <TabsContent value="dashboard" className="m-0 h-full animate-fade-in">
                  <AnalyticsDashboardDemo />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
