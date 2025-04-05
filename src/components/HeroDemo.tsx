
import React from 'react';
import { BarChart3, Send } from 'lucide-react';

const HeroDemo = () => {
  return (
    <div className="w-full max-w-5xl glass-card p-6 relative animate-fade-in">
      {/* Sales Stat Card */}
      <div className="absolute -top-8 left-8 glass-card p-3 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Sales up 24% this month</span>
      </div>
      
      {/* Chat Interface */}
      <div className="mb-4 text-left">
        <div className="inline-block glass-card p-3 mb-4">
          <p className="text-sm">What were my total sales by month in 2024?</p>
        </div>
      </div>
      
      {/* AI Response */}
      <div className="flex gap-3 mb-4 text-left">
        <div className="h-8 w-8 rounded-full purple-gradient flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-700 mb-2">Here's your monthly sales for 2024:</p>
          
          {/* Chart Type Selector */}
          <div className="flex gap-2 mb-4">
            <button className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> Bar
            </button>
            <button className="text-gray-500 px-3 py-1 rounded-full text-xs flex items-center gap-1">
              Line
            </button>
            <button className="text-gray-500 px-3 py-1 rounded-full text-xs flex items-center gap-1">
              Pie
            </button>
          </div>
          
          {/* Chart */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-purple-500 flex items-center gap-1">
                <span className="h-2 w-2 bg-purple-500 rounded-full"></span>
                Electronics
              </span>
            </div>
            <div className="h-40 flex items-end gap-1">
              {[35, 20, 30, 40, 35, 45, 50, 45, 40, 55, 60, 50].map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-purple-500/80 rounded-t"
                    style={{ height: `${value * 2}px` }}
                  ></div>
                  <span className="text-[10px] mt-1">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}</span>
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
          className="w-full px-4 py-3 pr-12 bg-white/50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-primary text-white">
          <Send className="h-4 w-4" />
        </button>
      </div>
      
      {/* Insight Card */}
      <div className="absolute -bottom-8 right-8 glass-card p-3 flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-500">
          <span className="text-xs">i</span>
        </div>
        <span className="text-sm">Customer segments identified</span>
      </div>
    </div>
  );
};

export default HeroDemo;
