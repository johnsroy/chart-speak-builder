
import React from 'react';
import { 
  LayoutDashboard, 
  Database, 
  BarChart3, 
  MessageSquare, 
  ChevronRight 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const KeyOfferings = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      title: "Interactive Dashboard",
      description: "Get a comprehensive overview of your data with customizable interactive dashboards.",
      icon: <LayoutDashboard className="h-8 w-8 text-purple-400" />,
      path: "/dashboard",
    },
    {
      title: "Data Explorer",
      description: "Upload, manage, and explore your datasets with our intuitive data explorer.",
      icon: <Database className="h-8 w-8 text-blue-400" />,
      path: "/upload",
    },
    {
      title: "Advanced Visualizations",
      description: "Transform your data into beautiful, insightful visualizations with just a few clicks.",
      icon: <BarChart3 className="h-8 w-8 text-pink-400" />,
      path: "/visualize",
    },
    {
      title: "AI-Powered Analysis",
      description: "Ask questions about your data in plain English and get instant insights.",
      icon: <MessageSquare className="h-8 w-8 text-green-400" />,
      path: "/analyze",
    },
  ];

  const handleFeatureClick = (path: string) => {
    if (isAuthenticated) {
      navigate(path);
    } else {
      navigate('/signup');
    }
  };

  return (
    <section className="py-20 px-4 animate-on-scroll" id="key-offerings">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-3 py-1 glass-card rounded-full mb-4 text-sm font-medium">
            <span className="text-purple-400 animate-bounce inline-block">🔑</span> Key Offerings
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gradient">Powerful Features for Your Data</h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Unlock the full potential of your business data with our comprehensive suite of tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-xl hover:-translate-y-2 cursor-pointer"
              onClick={() => handleFeatureClick(feature.path)}
              style={{animationDelay: `${index * 0.2}s`}}
            >
              <div className="flex items-start">
                <div className="bg-purple-500/20 p-3 rounded-full flex items-center justify-center mb-4 animate-bounce" style={{animationDelay: `${index * 0.1}s`}}>
                  {feature.icon}
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-300 mb-4">{feature.description}</p>
                  {!isAuthenticated && (
                    <div className="text-purple-400 flex items-center text-sm font-medium">
                      Sign up to access
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isAuthenticated && (
          <div className="mt-12 text-center">
            <Button 
              onClick={() => navigate('/signup')}
              className="purple-gradient px-8 py-6 text-lg shadow-lg shadow-purple-500/20 hover:scale-110 transition-transform duration-300"
            >
              Start Your Free Trial
            </Button>
            <p className="mt-4 text-sm text-gray-400">
              No credit card required. Upgrade anytime.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default KeyOfferings;
