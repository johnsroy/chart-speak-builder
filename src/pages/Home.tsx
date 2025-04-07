
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  BrainCircuit, 
  Database, 
  LineChart, 
  MessageSquare, 
  Upload, 
  ChevronRight 
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  return (
    <div className="min-h-screen pt-4 pb-16">
      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto text-center fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gradient">
            GenBI - Generate Business Intelligence
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-3xl mx-auto">
            Transform your data into actionable insights with our AI-powered business intelligence platform
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button 
              onClick={() => navigate('/upload')}
              size="lg" 
              className="purple-gradient text-lg px-8 py-6"
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload Your Data
            </Button>
            
            <Button 
              onClick={() => navigate('/visualize')} 
              variant="outline" 
              size="lg"
              className="border-purple-500 text-lg px-8 py-6 hover:bg-purple-500/20"
            >
              <BarChart3 className="mr-2 h-5 w-5" />
              Explore Visualizations
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-16 px-4 glass-container mx-4 md:mx-8 lg:mx-16 mb-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center text-gradient">
            Powerful Features for Data Analysis
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="gradient-border-card">
              <div className="inner">
                <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <Database className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Data Import & Processing</h3>
                <p className="text-gray-300">
                  Easily upload and transform your data from various sources including CSV, Excel, and databases.
                </p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/upload')}
                  className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center"
                >
                  Upload Data <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="gradient-border-card">
              <div className="inner">
                <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Interactive Visualizations</h3>
                <p className="text-gray-300">
                  Create beautiful interactive charts and dashboards to visualize your data without coding.
                </p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/visualize')}
                  className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center"
                >
                  Explore Visualizations <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="gradient-border-card">
              <div className="inner">
                <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <BrainCircuit className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI-Powered Analysis</h3>
                <p className="text-gray-300">
                  Ask questions about your data in natural language and get instant insights through AI.
                </p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/analyze')}
                  className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center"
                >
                  Try AI Analysis <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            
            {/* Feature 4 */}
            <div className="gradient-border-card">
              <div className="inner">
                <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <MessageSquare className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Chat With Your Data</h3>
                <p className="text-gray-300">
                  Have conversations with your data through our intuitive chat interface powered by AI.
                </p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/dataset')}
                  className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center"
                >
                  Start Chatting <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
            
            {/* Feature 5 */}
            <div className="gradient-border-card">
              <div className="inner">
                <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                  <LineChart className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Time Series Analysis</h3>
                <p className="text-gray-300">
                  Identify trends and patterns in your time-based data with advanced forecasting tools.
                </p>
                <Button 
                  variant="link" 
                  onClick={() => navigate('/dashboard')}
                  className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center"
                >
                  View Dashboard <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6 text-gradient">Ready to transform your data?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Start generating valuable insights from your data today with GenBI
          </p>
          <Button 
            onClick={() => navigate('/upload')}
            size="lg"
            className="purple-gradient px-8 py-6 text-lg"
          >
            Start Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Home;
