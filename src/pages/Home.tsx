
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
  ChevronRight,
  ArrowRight,
  Zap,
  Users,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Helmet } from 'react-helmet';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  return (
    <div className="min-h-screen">
      <Helmet>
        <title>GenBI - Generative Business Intelligence | AI-Powered Data Analytics</title>
        <meta name="description" content="Transform your data into actionable insights with GenBI's AI-powered business intelligence platform. Ask questions in plain English and get beautiful visualizations instantly." />
        <meta name="keywords" content="Business Intelligence, AI, Generative BI, Data Visualization, Data Analytics, ChatGPT for Data, AI Data Analysis" />
        <meta property="og:title" content="GenBI - Generative Business Intelligence | AI-Powered Data Analytics" />
        <meta property="og:description" content="Ask questions about your data in plain English and get instant visualizations and insights with our AI-powered business intelligence platform." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GenBI - Generative Business Intelligence" />
        <meta name="twitter:description" content="Transform your business data into powerful insights with AI-powered analytics." />
      </Helmet>

      {/* Hero Section with enhanced glassmorphism */}
      <section className="py-20 md:py-28 px-4 relative overflow-hidden">
        {/* Background gradient elements */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px]"></div>
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px]"></div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left fade-in">
              <span className="inline-block px-4 py-2 rounded-full neo-blur mb-4 text-sm font-medium">
                <span className="text-purple-400">✨</span> AI-Powered Business Intelligence
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="text-gradient">Generative BI</span> for Your Business Data
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl mx-auto lg:mx-0">
                Ask questions in plain English and instantly get beautiful visualizations and actionable insights from your data.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button 
                  onClick={() => navigate('/upload')}
                  size="lg" 
                  className="purple-gradient shadow-lg shadow-purple-900/30 text-lg px-8 py-6"
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Start Analyzing Now
                </Button>
                
                <Button 
                  onClick={() => navigate('/visualize')} 
                  variant="outline" 
                  size="lg"
                  className="border-purple-500 text-lg px-8 py-6 hover:bg-purple-500/20 backdrop-blur-sm"
                >
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Explore Demos
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-green-400 mr-1" />
                  <span className="text-gray-300">Enterprise-grade security</span>
                </div>
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-gray-300">Instant analysis</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-blue-400 mr-1" />
                  <span className="text-gray-300">5,000+ users</span>
                </div>
              </div>
            </div>

            <div className="glass-morphism p-1 rounded-2xl border border-white/10 shadow-2xl">
              <div className="overflow-hidden rounded-xl">
                <img 
                  src="/placeholder.svg" 
                  alt="GenBI Dashboard" 
                  className="w-full h-auto rounded-xl object-cover hover:scale-105 transition-all duration-500" 
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* How it Works Section - NEW */}
      <section className="py-16 px-4 relative" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 glass-card rounded-full mb-4 text-sm font-medium">
              <span className="text-purple-400">🚀</span> Easy to Use
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gradient">How GenBI Works</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Transform your data into insights in just three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-900/50 border border-purple-600/30 mb-6">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Upload Your Data</h3>
              <p className="text-gray-300">
                Simply upload your CSV, Excel files, or connect to your database. Our platform handles the rest, no coding or data preparation needed.
              </p>
            </div>

            {/* Step 2 */}
            <div className="glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-900/50 border border-purple-600/30 mb-6">
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Ask Questions</h3>
              <p className="text-gray-300">
                Ask questions in plain English like "Show me sales trends" or "What are my top customers?". No SQL or complex queries needed.
              </p>
            </div>

            {/* Step 3 */}
            <div className="glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-900/50 border border-purple-600/30 mb-6">
                <span className="text-2xl font-bold text-purple-400">3</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Get Instant Insights</h3>
              <p className="text-gray-300">
                Our AI generates beautiful visualizations and provides detailed analysis with trends, anomalies, and actionable recommendations.
              </p>
            </div>
          </div>

          <div className="flex justify-center mt-12">
            <Button 
              onClick={() => navigate('/dashboard')}
              variant="outline" 
              size="lg"
              className="border-purple-400 text-lg hover:bg-purple-500/20"
            >
              See it in action
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features Section with enhanced glassmorphism */}
      <section className="py-20 px-4 relative" id="features">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-40 right-1/4 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl"></div>
          <div className="absolute bottom-20 left-1/4 w-80 h-80 rounded-full bg-purple-400/10 blur-3xl"></div>
        </div>

        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 glass-card rounded-full mb-4 text-sm font-medium">
              <span className="text-purple-400">✨</span> Features
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gradient">Powerful Features, Simple Interface</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              GenBI combines the power of AI with intuitive design to make data visualization 
              accessible to everyone in your organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            {/* Feature Cards with improved glassmorphism */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-xl">
              <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Natural Language Queries</h3>
              <p className="text-gray-300">
                Ask questions about your data in plain English. No SQL or complex query languages required.
              </p>
              <Button 
                variant="link" 
                onClick={() => navigate('/analyze')}
                className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center"
              >
                Try Chat Analysis <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-xl">
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
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-xl">
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
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 shadow-xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6 text-gradient">Ready to transform your data analytics?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Start generating valuable insights from your data today with GenBI - no technical skills required.
            </p>
            <Button 
              onClick={() => navigate('/upload')}
              size="lg"
              className="purple-gradient px-8 py-6 text-lg shadow-lg shadow-purple-500/20"
            >
              Start Now - It's Free
            </Button>
            <p className="mt-4 text-sm text-gray-400">
              No credit card required. Free plan includes up to 5 datasets and 100 queries.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
