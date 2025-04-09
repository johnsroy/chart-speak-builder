
import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, Send, Sparkles, LineChart, PieChart } from 'lucide-react';

const HeroDemo = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [showGraph, setShowGraph] = useState(false);
  const [activeChartType, setActiveChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Demo conversation flow
  const conversation = [
    { query: "What were my total sales by month in 2024?", response: "Here's your monthly sales for 2024:" },
    { query: "Show me sales by product category", response: "Here's the breakdown by product category:" },
    { query: "Which product had the highest growth?", response: "Electronics showed the highest growth at 24%:" }
  ];
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    // Initial measurement
    updateDimensions();
    
    // Add resize listener
    window.addEventListener('resize', updateDimensions);
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
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
    <div ref={containerRef} className="w-full rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-white/10 p-4 md:p-6 relative animate-fade-in">
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
          <div className="flex gap-2 mb-4 flex-wrap">
            <button 
              className={`${activeChartType === 'bar' ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-white/10'} px-3 py-1 rounded-full text-xs flex items-center gap-1 backdrop-blur-sm transition-colors`}
              onClick={() => setActiveChartType('bar')}
            >
              <BarChart3 className="h-3 w-3" /> Bar
            </button>
            <button 
              className={`${activeChartType === 'line' ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-white/10'} px-3 py-1 rounded-full text-xs flex items-center gap-1 backdrop-blur-sm transition-colors`}
              onClick={() => setActiveChartType('line')}
            >
              <LineChart className="h-3 w-3" /> Line
            </button>
            <button 
              className={`${activeChartType === 'pie' ? 'bg-primary/20 text-primary' : 'text-gray-300 hover:bg-white/10'} px-3 py-1 rounded-full text-xs flex items-center gap-1 backdrop-blur-sm transition-colors`}
              onClick={() => setActiveChartType('pie')}
            >
              <PieChart className="h-3 w-3" /> Pie
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

            {activeChartType === 'bar' && (
              <div className="h-40 flex items-end gap-1">
                {[35, 20, 30, 40, 35, 45, 50, 45, 40, 55, 60, 50].map((value, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-purple-500/80 to-purple-400/80 rounded-t backdrop-blur-sm animate-height-change"
                      style={{ 
                        height: `${value * 2}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    ></div>
                    <span className="text-[10px] mt-1 text-gray-300">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span>
                  </div>
                ))}
              </div>
            )}

            {activeChartType === 'line' && (
              <div className="h-40 relative">
                <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="0" x2="400" y2="0" stroke="rgba(255,255,255,0.1)" />
                  <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,255,255,0.1)" />
                  <line x1="0" y1="100" x2="400" y2="100" stroke="rgba(255,255,255,0.1)" />
                  <line x1="0" y1="150" x2="400" y2="150" stroke="rgba(255,255,255,0.1)" />
                  
                  {/* Line chart path */}
                  <path 
                    d="M0,75 L33,105 L66,85 L100,65 L133,70 L166,55 L200,40 L233,55 L266,65 L300,30 L333,20 L400,45" 
                    fill="none" 
                    stroke="rgb(168, 85, 247)" 
                    strokeWidth="3" 
                    strokeLinecap="round"
                  />
                  
                  {/* Data points */}
                  <circle cx="0" cy="75" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="33" cy="105" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="66" cy="85" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="100" cy="65" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="133" cy="70" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="166" cy="55" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="200" cy="40" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="233" cy="55" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="266" cy="65" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="300" cy="30" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="333" cy="20" r="4" fill="rgb(168, 85, 247)" />
                  <circle cx="400" cy="45" r="4" fill="rgb(168, 85, 247)" />
                </svg>
                
                <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                  <span className="text-[10px] text-gray-300">Jan</span>
                  <span className="hidden sm:inline text-[10px] text-gray-300">Mar</span>
                  <span className="text-[10px] text-gray-300">Jun</span>
                  <span className="hidden sm:inline text-[10px] text-gray-300">Sep</span>
                  <span className="text-[10px] text-gray-300">Dec</span>
                </div>
              </div>
            )}

            {activeChartType === 'pie' && (
              <div className="h-40 flex flex-col sm:flex-row justify-center items-center">
                <div className="relative w-32 h-32">
                  {/* Pie chart segments */}
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(168, 85, 247, 0.8)" strokeWidth="40" strokeDasharray="75 100" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(124, 58, 237, 0.8)" strokeWidth="40" strokeDasharray="15 100" strokeDashoffset="-25" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(139, 92, 246, 0.8)" strokeWidth="40" strokeDasharray="10 100" strokeDashoffset="-40" transform="rotate(-90 50 50)" />
                  </svg>
                  
                  {/* Center white circle for donut effect */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-sm h-16 w-16 rounded-full"></div>
                  </div>
                </div>
                
                <div className="ml-0 sm:ml-4 mt-2 sm:mt-0">
                  <div className="flex items-center mb-2">
                    <span className="h-3 w-3 bg-purple-500 rounded-full mr-2"></span>
                    <span className="text-[10px] text-gray-300">Electronics (75%)</span>
                  </div>
                  <div className="flex items-center mb-2">
                    <span className="h-3 w-3 bg-purple-700 rounded-full mr-2"></span>
                    <span className="text-[10px] text-gray-300">Clothing (15%)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="h-3 w-3 bg-purple-600 rounded-full mr-2"></span>
                    <span className="text-[10px] text-gray-300">Other (10%)</span>
                  </div>
                </div>
              </div>
            )}
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
