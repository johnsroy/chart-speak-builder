
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroDemo from './HeroDemo';

const Hero = () => {
  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-primary mb-6">
            <span className="mr-1">✨</span> Introducing GenBI
          </span>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-center max-w-4xl">
            <span className="text-gradient">Turn Questions Into Insights</span>
            <br />With AI-Powered Visualizations
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-3xl text-center">
            Ask questions about your data in plain English. Get beautiful, 
            interactive visualizations instantly. No coding required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-16">
            <Link to="/signup">
              <Button className="purple-gradient text-white px-6 py-6 flex items-center gap-2 text-lg">
                Start Free Trial 
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Button variant="outline" className="px-6 py-6 flex items-center gap-2 text-lg">
              <Play className="h-4 w-4" /> Watch Demo
            </Button>
          </div>
          
          <HeroDemo />
        </div>
      </div>
    </section>
  );
};

export default Hero;
