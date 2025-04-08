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
  CheckCircle,
  PieChart,
  TrendingUp,
  BarChart,
  Activity
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Helmet } from 'react-helmet';

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, adminLogin, subscription } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [activeChart, setActiveChart] = useState(0);

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

    // Rotate through charts every 3 seconds
    const chartInterval = setInterval(() => {
      setActiveChart((prev) => (prev + 1) % 4);
    }, 3000);

    return () => {
      observer.disconnect();
      clearInterval(chartInterval);
    };
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

  // Demo chart data for animation
  const renderActiveChart = () => {
    switch (activeChart) {
      case 0:
        return (
          <div className="flex flex-col items-center">
            <BarChart3 className="h-24 w-24 text-purple-400 animate-pulse mb-4" />
            <div className="w-full flex justify-between space-x-1">
              {[40, 70, 30, 85, 50, 65, 75].map((height, i) => (
                <div 
                  key={i} 
                  className="bg-gradient-to-t from-purple-600 to-blue-400 rounded-t-md w-full"
                  style={{
                    height: `${height}px`,
                    animation: `animate-bounce ${1 + i * 0.1}s infinite alternate`
                  }}
                ></div>
              ))}
            </div>
            <p className="mt-4 text-lg font-semibold">Sales Performance</p>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col items-center">
            <PieChart className="h-24 w-24 text-blue-400 animate-spin-slow mb-4" />
            <div className="w-full h-[120px] rounded-full overflow-hidden relative">
              <div className="absolute inset-0 flex">
                <div className="bg-purple-500 w-[30%] h-full animate-pulse"></div>
                <div className="bg-blue-500 w-[45%] h-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="bg-pink-400 w-[25%] h-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
            </div>
            <p className="mt-4 text-lg font-semibold">Market Distribution</p>
          </div>
        );
      case 2:
        return (
          <div className="flex flex-col items-center">
            <TrendingUp className="h-24 w-24 text-green-400 animate-float mb-4" />
            <div className="relative w-full h-[120px]">
              <svg viewBox="0 0 300 100" className="w-full h-full">
                <path 
                  d="M0,100 C50,30 100,70 150,40 C200,10 250,50 300,20" 
                  fill="none" 
                  stroke="url(#gradient)" 
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="1000"
                  strokeDashoffset="1000"
                  style={{animation: 'dash 5s linear forwards infinite'}}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
              <style jsx>{`
                @keyframes dash {
                  to {
                    stroke-dashoffset: 0;
                  }
                }
              `}</style>
            </div>
            <p className="mt-4 text-lg font-semibold">Revenue Growth</p>
          </div>
        );
      case 3:
        return (
          <div className="flex flex-col items-center">
            <Activity className="h-24 w-24 text-pink-400 animate-pulse mb-4" />
            <div className="w-full grid grid-cols-7 gap-1">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div 
                    className="w-4 h-4 rounded-full mb-1"
                    style={{
                      backgroundColor: `rgba(${139 + i * 20}, ${92 - i * 10}, ${246 - i * 20}, 0.8)`,
                      animation: `pulse ${1 + i * 0.2}s infinite alternate`
                    }}
                  ></div>
                  <div 
                    className="w-1 rounded-full bg-gradient-to-b from-purple-500 to-blue-500"
                    style={{
                      height: `${20 + Math.sin(i) * 20}px`,
                      animation: `height-change ${2 + i * 0.3}s infinite alternate ease-in-out`
                    }}
                  ></div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-lg font-semibold">Weekly Activity</p>
          </div>
        );
      default:
        return null;
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

            <div className={`glass-morphism p-6 rounded-2xl border border-white/10 shadow-2xl transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-900/30 to-blue-900/30 backdrop-blur-lg p-6">
                <div className="absolute inset-0 bg-grid-white/5 mask-image-gradient"></div>
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent animate-slide"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-slide-reverse"></div>
                <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-purple-500 to-transparent animate-slide-down"></div>
                <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-blue-500 to-transparent animate-slide-up"></div>
                
                <div className="mb-6 flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-xs text-gray-300">GenBI Analytics Dashboard</div>
                </div>
                
                <div className="h-[300px] flex items-center justify-center">
                  {renderActiveChart()}
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                  <div className="flex space-x-1">
                    {[0, 1, 2, 3].map((index) => (
                      <button 
                        key={index} 
                        className={`h-2 w-8 rounded-full transition-all duration-300 ${activeChart === index ? 'bg-purple-500' : 'bg-gray-600'}`}
                        onClick={() => setActiveChart(index)}
                      ></button>
                    ))}
                  </div>
                  
                  <div 
                    className="bg-purple-600/80 h-10 w-10 rounded-full flex items-center justify-center cursor-pointer hover:bg-purple-500 transition-all"
                    onClick={() => navigate('/dashboard')}
                  >
                    <ArrowRight className="h-5 w-5 text-white animate-pulse" />
                  </div>
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
