
import React, { useState, useEffect } from 'react';
import { BarChart3, Send, Sparkles } from 'lucide-react';

const HeroDemo = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [showGraph, setShowGraph] = useState(false);
  
  // Demo conversation flow
  const conversation = [
    { query: "What were my total sales by month in 2024?", response: "Here's your monthly sales for 2024:" },
    { query: "Show me sales by product category", response: "Here's the breakdown by product category:" },
    { query: "Which product had the highest growth?", response: "Electronics showed the highest growth at 24%:" }
  ];
  
  // Simulate typing and response effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeStep < conversation.length - 1) {
        setShowGraph(false);
        setTimeout(() => {
          setActiveStep(activeStep + 1);
          setTimeout(() => {
            setShowGraph(true);
          }, 800);
        }, 1000);
      }
    }, 5000); // Change conversation every 5 seconds
    
    return () => clearTimeout(timer);
  }, [activeStep]);
  
  useEffect(() => {
    // Show graph on initial load after a delay
    const timer = setTimeout(() => {
      setShowGraph(true);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-white/10 p-6 relative animate-fade-in">
      {/* Stats Card */}
      <div className="absolute -top-8 left-8 glass-card p-3 flex items-center gap-2 animate-fade-in shadow-lg">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Sales are up 24% this month</span>
      </div>
      
      {/* Chat Interface */}
      <div className="mb-4 text-left">
        <div className="inline-block glass-card p-3 mb-4 shadow-lg max-w-md animate-fade-in">
          <p className="text-sm">{conversation[activeStep].query}</p>
        </div>
      </div>
      
      {/* AI Response */}
      <div className={`flex gap-3 mb-5 text-left transition-all duration-500 ${showGraph ? 'opacity-100' : 'opacity-0'}`}>
        <div className="h-8 w-8 rounded-full purple-gradient flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-200 mb-2">{conversation[activeStep].response}</p>
          
          {/* Chart Type Selector */}
          <div className="flex gap-2 mb-4">
            <button className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-1 backdrop-blur-sm">
              <BarChart3 className="h-3 w-3" /> Bar
            </button>
            <button className="text-gray-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-white/10">
              Line
            </button>
            <button className="text-gray-300 px-3 py-1 rounded-full text-xs flex items-center gap-1 hover:bg-white/10">
              Pie
            </button>
          </div>
          
          {/* Chart */}
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-4 border border-white/10 shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-purple-300 flex items-center gap-1">
                <span className="h-2 w-2 bg-purple-400 rounded-full"></span>
                Electronics
              </span>
            </div>
            <div className="h-40 flex items-end gap-1">
              {[35, 20, 30, 40, 35, 45, 50, 45, 40, 55, 60, 50].map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-purple-500/80 to-purple-400/80 rounded-t backdrop-blur-sm"
                    style={{ 
                      height: `${value * 2}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  ></div>
                  <span className="text-[10px] mt-1 text-gray-300">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Chat Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Ask a question about your data..."
          className="w-full px-4 py-3 pr-12 bg-white/10 backdrop-blur-md rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary text-white">
          <Send className="h-4 w-4" />
        </button>
      </div>
      
      {/* Insight Card */}
      <div className="absolute -bottom-8 right-8 glass-card p-3 flex items-center gap-2 animate-fade-in shadow-lg">
        <div className="h-5 w-5 rounded-full bg-blue-400/30 backdrop-blur-sm flex items-center justify-center text-blue-300">
          <span className="text-xs">i</span>
        </div>
        <span className="text-sm">3 customer segments identified</span>
      </div>
    </div>
  );
};

export default HeroDemo;
