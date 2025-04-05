
import React from 'react';
import BenefitCard from './BenefitCard';
import { Clock, Users, LineChart, Zap } from 'lucide-react';

const Benefits = () => {
  const benefits = [
    {
      icon: Clock,
      title: 'Save Time',
      description: 'Get insights in seconds instead of hours. Our AI-powered platform automates the data visualization process, freeing your team to focus on analysis and decision-making.'
    },
    {
      icon: Users,
      title: 'Democratize Data',
      description: 'Make data accessible to everyone in your organization, regardless of technical skill. Natural language queries remove the barrier between your team and valuable insights.'
    },
    {
      icon: LineChart,
      title: 'Better Decisions',
      description: 'Make data-driven decisions with confidence. Our platform helps you uncover patterns and trends that might otherwise remain hidden in your data.'
    },
    {
      icon: Zap,
      title: 'Increase Productivity',
      description: 'Streamline your workflow with automated data processing and visualization. What used to take days now takes minutes, allowing your team to be more productive.'
    }
  ];

  return (
    <section className="py-20 px-4 bg-secondary/30" id="benefits">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-primary mb-4">
            ✓ Benefits
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gradient">Why Choose GenBI?</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our platform delivers tangible benefits that transform how your organization works with data.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <BenefitCard 
              key={index}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </div>

        <div className="mt-20 glass-card p-10 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex">
              {Array(5).fill(0).map((_, i) => (
                <svg key={i} className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
          <p className="text-xl italic text-gray-700 mb-8">
            "GenBI has a 4.9/5 rating across 500+ reviews. Join our community of satisfied customers today."
          </p>
          <button className="purple-gradient text-white px-6 py-3 rounded-lg inline-flex items-center">
            Start Your Free Trial
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
