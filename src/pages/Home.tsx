
import React, { useEffect, useState } from 'react';
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
  Shield,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Helmet } from 'react-helmet';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, adminLogin, subscription } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation after component mount
    setIsVisible(true);

    // Setup intersection observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fadeIn');
          entry.target.classList.add('opacity-100');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all elements with the animate-on-scroll class
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      el.classList.add('opacity-0');
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
  
  // Function to handle the dashboard or login button click
  const handleDashboardClick = () => {
    if (!isAuthenticated && !user) {
      adminLogin();
    } else {
      navigate('/dashboard');
    }
  };

  // Function to determine the best CTA based on user subscription status
  const renderMainCTA = () => {
    if (isAuthenticated) {
      if (subscription?.isPremium) {
        return (
          <Button 
            onClick={() => navigate('/upload')}
            size="lg" 
            className="purple-gradient shadow-lg shadow-purple-900/30 text-lg px-8 py-6 hover:scale-105 transition-transform duration-300"
          >
            <Upload className="mr-2 h-5 w-5 animate-bounce" />
            Upload Your Data
          </Button>
        );
      } else {
        return (
          <Button 
            onClick={() => navigate('/account')}
            size="lg" 
            className="purple-gradient shadow-lg shadow-purple-900/30 text-lg px-8 py-6 hover:scale-105 transition-transform duration-300"
          >
            <Zap className="mr-2 h-5 w-5 animate-bounce" />
            Upgrade to Premium
          </Button>
        );
      }
    } else {
      return (
        <Button 
          onClick={() => navigate('/upload')}
          size="lg" 
          className="purple-gradient shadow-lg shadow-purple-900/30 text-lg px-8 py-6 hover:scale-105 transition-transform duration-300"
        >
          <Upload className="mr-2 h-5 w-5 animate-bounce" />
          Start Analyzing Now
        </Button>
      );
    }
  };

  return (
    <div className="min-h-screen">
      <Helmet>
        <title>GenBI - Generative Business Intelligence | AI-Powered Data Analytics</title>
        <meta name="description" content="Transform your data into actionable insights with GenBI's AI-powered business intelligence platform. Ask questions in plain English and get beautiful visualizations instantly." />
        <meta name="keywords" content="Business Intelligence, AI, Generative BI, Data Visualization, Data Analytics, ChatGPT for Data, AI Data Analysis, Machine Learning Analytics, Visual Data Reporting" />
        <meta property="og:title" content="GenBI - Generative Business Intelligence | AI-Powered Data Analytics" />
        <meta property="og:description" content="Ask questions about your data in plain English and get instant visualizations and insights with our AI-powered business intelligence platform." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="GenBI - Generative Business Intelligence" />
        <meta name="twitter:description" content="Transform your business data into powerful insights with AI-powered analytics." />
        
        <link rel="canonical" href="https://genbi.app" />
        <meta name="robots" content="index, follow" />
        
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "GenBI - Generative Business Intelligence",
              "applicationCategory": "BusinessApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "operatingSystem": "Web",
              "description": "AI-powered business intelligence platform that transforms your data into actionable insights."
            }
          `}
        </script>
      </Helmet>

      <section className="py-20 md:py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full bg-blue-500/20 blur-[100px] animate-pulse"></div>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className={`text-center lg:text-left transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <span className="inline-block px-4 py-2 rounded-full neo-blur mb-4 text-sm font-medium">
                <span className="text-purple-400 inline-block animate-bounce">✨</span> AI-Powered Business Intelligence
              </span>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                <span className="text-gradient">Generative BI</span> for Your Business Data
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl mx-auto lg:mx-0">
                Ask questions in plain English and instantly get beautiful visualizations and actionable insights from your data.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {renderMainCTA()}
                
                <Button 
                  onClick={handleDashboardClick}
                  variant="outline" 
                  size="lg"
                  className="border-purple-500 text-lg px-8 py-6 hover:bg-purple-500/20 backdrop-blur-sm hover:scale-105 transition-transform duration-300"
                >
                  <BarChart3 className="mr-2 h-5 w-5 animate-pulse" />
                  Dashboard
                </Button>
              </div>
              
              <div className="mt-8 flex items-center justify-center lg:justify-start space-x-6 text-sm">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-green-400 mr-1 animate-pulse" />
                  <span className="text-gray-300">Enterprise-grade security</span>
                </div>
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-yellow-400 mr-1 animate-pulse" />
                  <span className="text-gray-300">Instant analysis</span>
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 text-blue-400 mr-1 animate-pulse" />
                  <span className="text-gray-300">5,000+ users</span>
                </div>
              </div>
            </div>

            <div className={`glass-morphism p-1 rounded-2xl border border-white/10 shadow-2xl transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="overflow-hidden rounded-xl relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 animate-pulse"></div>
                <img 
                  src="/dashboard-demo.webp" 
                  alt="GenBI Dashboard Demo" 
                  className="w-full h-auto rounded-xl object-cover transition-all duration-500 relative z-10 animate-float" 
                />
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 bg-purple-600/80 rounded-full flex items-center justify-center backdrop-blur-sm animate-bounce shadow-lg cursor-pointer">
                    <ArrowRight className="h-8 w-8 text-white animate-pulse" />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs text-white">
                  Live Demo
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 px-4 relative animate-on-scroll" id="how-it-works">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 glass-card rounded-full mb-4 text-sm font-medium">
              <span className="text-purple-400 animate-bounce inline-block">🚀</span> Easy to Use
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gradient">How GenBI Works</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Transform your data into insights in just three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 animate-on-scroll">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-900/50 border border-purple-600/30 mb-6 animate-bounce">
                <span className="text-2xl font-bold text-purple-400">1</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Upload Your Data</h3>
              <p className="text-gray-300">
                Simply upload your CSV, Excel files, or connect to your database. Our platform handles the rest, no coding or data preparation needed.
              </p>
            </div>

            <div className="glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 animate-on-scroll" style={{animationDelay: "0.2s"}}>
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-900/50 border border-purple-600/30 mb-6 animate-bounce" style={{animationDelay: "0.1s"}}>
                <span className="text-2xl font-bold text-purple-400">2</span>
              </div>
              <h3 className="text-2xl font-semibold mb-4">Ask Questions</h3>
              <p className="text-gray-300">
                Ask questions in plain English like "Show me sales trends" or "What are my top customers?". No SQL or complex queries needed.
              </p>
            </div>

            <div className="glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 animate-on-scroll" style={{animationDelay: "0.4s"}}>
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-purple-900/50 border border-purple-600/30 mb-6 animate-bounce" style={{animationDelay: "0.2s"}}>
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
              className="border-purple-400 text-lg hover:bg-purple-500/20 hover:scale-110 transition-all duration-300"
            >
              See it in action
              <ArrowRight className="ml-2 h-5 w-5 animate-pulse" />
            </Button>
          </div>
        </div>
      </section>
      
      <section className="py-20 px-4 relative animate-on-scroll" id="features">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-40 right-1/4 w-96 h-96 rounded-full bg-blue-400/10 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-1/4 w-80 h-80 rounded-full bg-purple-400/10 blur-3xl animate-pulse"></div>
        </div>

        <div className="container mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 glass-card rounded-full mb-4 text-sm font-medium">
              <span className="text-purple-400 animate-bounce inline-block">✨</span> Features
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gradient">Powerful Features, Simple Interface</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              GenBI combines the power of AI with intuitive design to make data visualization 
              accessible to everyone in your organization.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-xl hover:-translate-y-2 animate-on-scroll">
              <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4 animate-bounce">
                <MessageSquare className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Natural Language Queries</h3>
              <p className="text-gray-300">
                Ask questions about your data in plain English. No SQL or complex query languages required.
              </p>
              <Button 
                variant="link" 
                onClick={() => navigate('/analyze')}
                className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center group"
              >
                Try Chat Analysis 
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-xl hover:-translate-y-2 animate-on-scroll" style={{animationDelay: "0.2s"}}>
              <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4 animate-bounce" style={{animationDelay: "0.1s"}}>
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Visualizations</h3>
              <p className="text-gray-300">
                Create beautiful interactive charts and dashboards to visualize your data without coding.
              </p>
              <Button 
                variant="link" 
                onClick={() => navigate('/visualize')}
                className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center group"
              >
                Explore Visualizations 
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 shadow-xl hover:-translate-y-2 animate-on-scroll" style={{animationDelay: "0.4s"}}>
              <div className="bg-purple-500/20 p-3 rounded-full w-14 h-14 flex items-center justify-center mb-4 animate-bounce" style={{animationDelay: "0.2s"}}>
                <Database className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Data Import & Processing</h3>
              <p className="text-gray-300">
                Easily upload and transform your data from various sources including CSV, Excel, and databases.
              </p>
              <Button 
                variant="link" 
                onClick={() => navigate('/upload')}
                className="mt-4 text-purple-400 hover:text-purple-300 p-0 flex items-center group"
              >
                Upload Data 
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
      </section>
      
      <section className="py-16 px-4 animate-on-scroll">
        <div className="max-w-4xl mx-auto glass-card backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-12 shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-purple-500/20 animate-bounce" style={{animationDuration: "2.5s"}}></div>
          <div className="absolute -bottom-8 -left-8 w-16 h-16 rounded-full bg-blue-500/20 animate-bounce" style={{animationDuration: "3.5s"}}></div>
          <div className="absolute top-1/2 right-10 w-8 h-8 rounded-full bg-pink-500/30 animate-bounce" style={{animationDuration: "4s"}}></div>
          
          <div className="text-center relative z-10">
            <h2 className="text-3xl font-bold mb-6 text-gradient">Ready to transform your data analytics?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Start generating valuable insights from your data today with GenBI - no technical skills required.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2 animate-pulse" />
                <span>No credit card required</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2 animate-pulse" />
                <span>Free plan includes up to 2 datasets and 10 queries</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 flex items-center">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2 animate-pulse" />
                <span>Premium plan: $50/month</span>
              </div>
            </div>
            <Button 
              onClick={() => isAuthenticated ? navigate('/account') : navigate('/signup')}
              size="lg"
              className="purple-gradient px-8 py-6 text-lg shadow-lg shadow-purple-500/20 hover:scale-110 transition-transform duration-300"
            >
              {isAuthenticated ? 'Upgrade Now' : 'Start Now - It\'s Free'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
