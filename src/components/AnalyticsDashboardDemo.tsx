
import React, { useRef, useEffect, useState } from 'react';
import { BarChart3, LineChart, PieChart, ArrowUp, ArrowDown, DollarSign, Users, ShoppingCart, AreaChart } from 'lucide-react';
import { Card, CardContent, CardTitle } from './ui/card';

const AnalyticsDashboardDemo = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track container size for responsive layouts
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    // Initial measurement
    updateSize();
    
    // Add resize listener
    window.addEventListener('resize', updateSize);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-white/10 p-4 animate-fade-in flex flex-col">
      {/* Dashboard Header */}
      <div className="flex justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Dashboard Overview</h3>
        <span className="text-xs text-purple-300">Last updated: just now</span>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Revenue</p>
                <h4 className="text-lg font-bold">$24.5K</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-green-500/30 transition-all duration-300 relative overflow-hidden">
                <DollarSign className="h-4 w-4 text-green-400 relative z-10 group-hover:text-green-300" />
                <span className="absolute inset-0 bg-green-400/10 scale-0 rounded-full group-hover:scale-150 transition-transform duration-500"></span>
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-400 mr-1 animate-bounce" />
              <span className="text-xs text-green-400">+12%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Customers</p>
                <h4 className="text-lg font-bold">1,254</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-500/30 transition-all duration-300 relative overflow-hidden">
                <Users className="h-4 w-4 text-blue-400 relative z-10 group-hover:text-blue-300" />
                <span className="absolute inset-0 bg-blue-400/10 scale-0 rounded-full group-hover:scale-150 transition-transform duration-500"></span>
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-400 mr-1 animate-bounce" />
              <span className="text-xs text-green-400">+5.2%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Orders</p>
                <h4 className="text-lg font-bold">452</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-500/30 transition-all duration-300 relative overflow-hidden">
                <ShoppingCart className="h-4 w-4 text-purple-400 relative z-10 group-hover:text-purple-300" />
                <span className="absolute inset-0 bg-purple-400/10 scale-0 rounded-full group-hover:scale-150 transition-transform duration-500"></span>
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowDown className="h-3 w-3 text-red-400 mr-1 animate-pulse" />
              <span className="text-xs text-red-400">-2.5%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Conversion</p>
                <h4 className="text-lg font-bold">3.24%</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/30 transition-all duration-300 relative overflow-hidden">
                <AreaChart className="h-4 w-4 text-amber-400 relative z-10 group-hover:text-amber-300" />
                <span className="absolute inset-0 bg-amber-400/10 scale-0 rounded-full group-hover:scale-150 transition-transform duration-500"></span>
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-400 mr-1 animate-bounce" />
              <span className="text-xs text-green-400">+0.5%</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Chart - flex-grow allows it to take available space */}
      <Card className="bg-white/10 backdrop-blur-sm border-0 mb-3 flex-grow group hover:bg-white/15 transition-colors duration-300">
        <CardContent className="p-3 h-full flex flex-col">
          <CardTitle className="text-xs mb-2 flex items-center">
            <LineChart className="h-3 w-3 mr-1 text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
            Monthly Revenue
          </CardTitle>
          <div className="flex-grow">
            <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="300" y2="0" stroke="rgba(255,255,255,0.1)" />
              <line x1="0" y1="25" x2="300" y2="25" stroke="rgba(255,255,255,0.1)" />
              <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(255,255,255,0.1)" />
              <line x1="0" y1="75" x2="300" y2="75" stroke="rgba(255,255,255,0.1)" />
              <line x1="0" y1="100" x2="300" y2="100" stroke="rgba(255,255,255,0.1)" />
              
              {/* Area chart */}
              <path 
                d="M0,90 L50,75 L100,60 L150,40 L200,20 L250,30 L300,10 L300,100 L0,100 Z" 
                fill="rgba(168,85,247,0.2)"
                className="group-hover:fill-opacity-50 transition-all duration-500"
              />
              
              {/* Line chart */}
              <path 
                d="M0,90 L50,75 L100,60 L150,40 L200,20 L250,30 L300,10" 
                fill="none" 
                stroke="rgb(168,85,247)" 
                strokeWidth="2"
                className="group-hover:stroke-purple-300 transition-all duration-500" 
              />
              
              {/* Data points with animation */}
              <circle cx="0" cy="90" r="3" fill="rgb(168,85,247)" className="group-hover:r-4 group-hover:fill-purple-300 transition-all duration-300" />
              <circle cx="50" cy="75" r="3" fill="rgb(168,85,247)" className="group-hover:r-4 group-hover:fill-purple-300 transition-all duration-300" />
              <circle cx="100" cy="60" r="3" fill="rgb(168,85,247)" className="group-hover:r-4 group-hover:fill-purple-300 transition-all duration-300" />
              <circle cx="150" cy="40" r="3" fill="rgb(168,85,247)" className="group-hover:r-4 group-hover:fill-purple-300 transition-all duration-300" />
              <circle cx="200" cy="20" r="3" fill="rgb(168,85,247)" className="group-hover:r-4 group-hover:fill-purple-300 transition-all duration-300" />
              <circle cx="250" cy="30" r="3" fill="rgb(168,85,247)" className="group-hover:r-4 group-hover:fill-purple-300 transition-all duration-300" />
              <circle cx="300" cy="10" r="3" fill="rgb(168,85,247)" className="group-hover:r-4 group-hover:fill-purple-300 transition-all duration-300" />
            </svg>
          </div>
        </CardContent>
      </Card>
      
      {/* Bottom Charts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-md group hover:bg-white/15 transition-colors duration-300">
          <CardContent className="p-3">
            <CardTitle className="text-xs mb-2 flex items-center">
              <BarChart3 className="h-3 w-3 mr-1 text-blue-400 group-hover:rotate-12 transition-transform duration-300" />
              Sales by Category
            </CardTitle>
            <div className="h-24 flex items-end justify-between gap-1">
              {[60, 40, 75, 25, 50].map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group/bar">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500/60 to-purple-400/60 rounded-t backdrop-blur-sm group-hover:from-blue-500/80 group-hover:to-purple-400/80 transition-all duration-300 group-hover/bar:translate-y-[-4px]"
                    style={{ height: `${value}%` }}
                  ></div>
                  <span className="text-[8px] mt-1 text-gray-400 group-hover/bar:text-white transition-colors duration-300">Cat {i+1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0 shadow-md group hover:bg-white/15 transition-colors duration-300">
          <CardContent className="p-3">
            <CardTitle className="text-xs mb-2 flex items-center">
              <PieChart className="h-3 w-3 mr-1 text-purple-400 group-hover:rotate-12 transition-transform duration-300" />
              Customer Demographics
            </CardTitle>
            <div className="flex flex-col sm:flex-row justify-center items-center h-24">
              <div className="w-20 h-20 sm:w-24 sm:h-24 relative group-hover:rotate-[5deg] transition-transform duration-500">
                <svg viewBox="0 0 100 100" className="group-hover:animate-spin-slow">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(168,85,247,0.8)" strokeWidth="20" strokeDasharray="40 100" transform="rotate(-90 50 50)" className="group-hover:stroke-purple-400 transition-colors duration-300" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(59,130,246,0.8)" strokeWidth="20" strokeDasharray="30 100" strokeDashoffset="-40" transform="rotate(-90 50 50)" className="group-hover:stroke-blue-400 transition-colors duration-300" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(16,185,129,0.8)" strokeWidth="20" strokeDasharray="20 100" strokeDashoffset="-70" transform="rotate(-90 50 50)" className="group-hover:stroke-green-400 transition-colors duration-300" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(245,158,11,0.8)" strokeWidth="20" strokeDasharray="10 100" strokeDashoffset="-90" transform="rotate(-90 50 50)" className="group-hover:stroke-amber-400 transition-colors duration-300" />
                </svg>
              </div>
              <div className="text-[8px] flex flex-col gap-1 ml-0 mt-2 sm:mt-0 sm:ml-2">
                <div className="flex items-center group/item hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-purple-500 mr-1 group-hover/item:animate-pulse"></div>
                  <span className="group-hover/item:text-purple-300 transition-colors duration-200">18-24 (40%)</span>
                </div>
                <div className="flex items-center group/item hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-blue-500 mr-1 group-hover/item:animate-pulse"></div>
                  <span className="group-hover/item:text-blue-300 transition-colors duration-200">25-34 (30%)</span>
                </div>
                <div className="flex items-center group/item hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-green-500 mr-1 group-hover/item:animate-pulse"></div>
                  <span className="group-hover/item:text-green-300 transition-colors duration-200">35-44 (20%)</span>
                </div>
                <div className="flex items-center group/item hover:translate-x-1 transition-transform duration-200">
                  <div className="w-2 h-2 bg-amber-500 mr-1 group-hover/item:animate-pulse"></div>
                  <span className="group-hover/item:text-amber-300 transition-colors duration-200">45+ (10%)</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AnalyticsDashboardDemo;
