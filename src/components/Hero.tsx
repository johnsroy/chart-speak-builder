
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroDemo from './HeroDemo';

const Hero = () => {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-40 left-20 w-64 h-64 rounded-full bg-purple-400/30 blur-3xl"></div>
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-blue-400/20 blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 rounded-full bg-pink-400/20 blur-3xl"></div>
      </div>

      <div className="container mx-auto relative">
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-4 py-1.5 rounded-full glass-card mb-8 animate-fade-in">
            <span className="mr-2">✨</span> Introducing GenBI
          </span>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 text-center max-w-4xl animate-fade-in">
            <span className="text-gradient">Ask Questions.</span>
            <br />
            <span className="text-gradient">Get Insights.</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl text-center animate-fade-in opacity-80">
            Transform complex data into beautiful visualizations using natural language. 
            Simply ask questions about your data, and our AI delivers instant insights.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 mb-20 animate-fade-in">
            <Link to="/signup">
              <Button className="purple-gradient text-white px-8 py-7 flex items-center gap-2 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105">
                Start Free Trial 
                <ArrowRight className="h-5 w-5 ml-1" />
              </Button>
            </Link>
            <Button variant="outline" className="px-8 py-7 flex items-center gap-2 text-lg backdrop-blur-md bg-white/10 border border-white/20 shadow-md rounded-xl hover:bg-white/20 transition-all">
              <Play className="h-5 w-5" /> Watch Demo
            </Button>
          </div>
          
          {/* Wrap the demo in a glassmorphic container */}
          <div className="w-full max-w-5xl rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl p-1.5 relative animate-fade-in">
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
