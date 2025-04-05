
import React from 'react';
import { Upload, MessageSquare, BarChart2 } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: 1,
      icon: Upload,
      title: "Upload Your Data",
      description: "Drag and drop your CSV, Excel, or connect to your cloud storage to import your data securely."
    },
    {
      number: 2,
      icon: MessageSquare,
      title: "Ask Questions",
      description: "Use natural language to ask questions about your data or use our intuitive chart builder."
    },
    {
      number: 3,
      icon: BarChart2,
      title: "Get Insights",
      description: "Instantly receive beautiful visualizations and actionable insights from your data."
    }
  ];

  return (
    <section className="py-24 px-4 relative" id="how-it-works">
      {/* Background blur element */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2/3 h-96 rounded-full bg-purple-400/20 blur-3xl"></div>
      </div>
      
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gradient">Simple Process, Powerful Results</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Our streamlined workflow makes it easy to go from raw data to actionable insights in minutes.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-1/2 bg-gradient-to-b from-purple-300/30 via-purple-300/50 to-purple-300/30 hidden lg:block"></div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center">
                  <div className="glass-card h-12 w-12 flex items-center justify-center z-10 mb-6 rounded-full">
                    <span className="text-primary text-xl font-bold">{step.number}</span>
                  </div>
                  <div className="backdrop-blur-lg bg-white/10 border border-white/20 rounded-xl p-8 h-full hover:bg-white/20 transition-all hover:transform hover:scale-105 group">
                    <div className="mb-5 flex justify-center">
                      <div className="p-3 bg-white/10 backdrop-blur-sm inline-flex rounded-lg group-hover:bg-primary/20 transition-all">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-xl font-medium mb-3">{step.title}</h3>
                    <p className="text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
