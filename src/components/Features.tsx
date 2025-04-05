
import React from 'react';
import FeatureCard from './FeatureCard';
import { MessageSquare, Settings, BarChart, Upload, Filter, Share } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: MessageSquare,
      title: 'Natural Language Queries',
      description: 'Ask questions about your data in plain English. No SQL or complex query languages required.'
    },
    {
      icon: Settings,
      title: 'Manual Visualization Builder',
      description: 'For those who prefer a hands-on approach, our intuitive builder gives you complete control.'
    },
    {
      icon: BarChart,
      title: 'Multiple Chart Types',
      description: 'Bar charts, line charts, pie charts, scatter plots, and more to visualize any type of data.'
    },
    {
      icon: Upload,
      title: 'Easy Data Upload',
      description: 'Upload CSV or Excel files with a simple drag-and-drop interface. No complex data preparation required.'
    },
    {
      icon: Filter,
      title: 'Data Transformations',
      description: 'Filter, sort, group, and aggregate your data with simple commands or through the UI.'
    },
    {
      icon: Share,
      title: 'Export & Share',
      description: 'Download visualizations as images or data as CSV. Share insights with your team instantly.'
    }
  ];

  return (
    <section className="py-20 px-4 relative" id="features">
      {/* Background blur elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-40 right-1/4 w-96 h-96 rounded-full bg-blue-400/20 blur-3xl"></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 rounded-full bg-purple-400/20 blur-3xl"></div>
      </div>

      <div className="container mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center px-3 py-1 glass-card rounded-full mb-4">
            ✨ Features
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gradient">Powerful Features, Simple Interface</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            GenBI combines the power of AI with intuitive design to make data visualization 
            accessible to everyone in your organization.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
