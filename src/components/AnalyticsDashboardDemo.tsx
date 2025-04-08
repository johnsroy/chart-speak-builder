
import React from 'react';
import { BarChart3, LineChart, PieChart, ArrowUp, ArrowDown, DollarSign, Users, ShoppingCart, AreaChart } from 'lucide-react';
import { Card, CardContent, CardTitle } from './ui/card';

const AnalyticsDashboardDemo = () => {
  return (
    <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-white/10 p-4 animate-fade-in">
      {/* Dashboard Header */}
      <div className="flex justify-between mb-4">
        <h3 className="text-sm font-medium text-white">Dashboard Overview</h3>
        <span className="text-xs text-purple-300">Last updated: just now</span>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <Card className="bg-white/10 backdrop-blur-sm border-0">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Revenue</p>
                <h4 className="text-lg font-bold">$24.5K</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-green-400" />
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-xs text-green-400">+12%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Customers</p>
                <h4 className="text-lg font-bold">1,254</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-xs text-green-400">+5.2%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Orders</p>
                <h4 className="text-lg font-bold">452</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-purple-400" />
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowDown className="h-3 w-3 text-red-400 mr-1" />
              <span className="text-xs text-red-400">-2.5%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0">
          <CardContent className="p-3">
            <div className="flex justify-between">
              <div>
                <p className="text-xs text-gray-300">Conversion</p>
                <h4 className="text-lg font-bold">3.24%</h4>
              </div>
              <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AreaChart className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div className="flex items-center mt-1">
              <ArrowUp className="h-3 w-3 text-green-400 mr-1" />
              <span className="text-xs text-green-400">+0.5%</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Chart */}
      <Card className="bg-white/10 backdrop-blur-sm border-0 mb-3">
        <CardContent className="p-3">
          <CardTitle className="text-xs mb-2">Monthly Revenue</CardTitle>
          <div className="h-32">
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
              />
              
              {/* Line chart */}
              <path 
                d="M0,90 L50,75 L100,60 L150,40 L200,20 L250,30 L300,10" 
                fill="none" 
                stroke="rgb(168,85,247)" 
                strokeWidth="2" 
              />
              
              {/* Data points */}
              <circle cx="0" cy="90" r="3" fill="rgb(168,85,247)" />
              <circle cx="50" cy="75" r="3" fill="rgb(168,85,247)" />
              <circle cx="100" cy="60" r="3" fill="rgb(168,85,247)" />
              <circle cx="150" cy="40" r="3" fill="rgb(168,85,247)" />
              <circle cx="200" cy="20" r="3" fill="rgb(168,85,247)" />
              <circle cx="250" cy="30" r="3" fill="rgb(168,85,247)" />
              <circle cx="300" cy="10" r="3" fill="rgb(168,85,247)" />
            </svg>
          </div>
        </CardContent>
      </Card>
      
      {/* Bottom Charts */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="bg-white/10 backdrop-blur-sm border-0">
          <CardContent className="p-3">
            <CardTitle className="text-xs mb-2">Sales by Category</CardTitle>
            <div className="h-24 flex items-end justify-between gap-1">
              {[60, 40, 75, 25, 50].map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500/60 to-purple-400/60 rounded-t backdrop-blur-sm"
                    style={{ height: `${value}%` }}
                  ></div>
                  <span className="text-[8px] mt-1 text-gray-400">Cat {i+1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-sm border-0">
          <CardContent className="p-3">
            <CardTitle className="text-xs mb-2">Customer Demographics</CardTitle>
            <div className="flex justify-center items-center h-24">
              <div className="w-24 h-24 relative">
                <svg viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(168,85,247,0.8)" strokeWidth="20" strokeDasharray="40 100" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(59,130,246,0.8)" strokeWidth="20" strokeDasharray="30 100" strokeDashoffset="-40" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(16,185,129,0.8)" strokeWidth="20" strokeDasharray="20 100" strokeDashoffset="-70" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="rgba(245,158,11,0.8)" strokeWidth="20" strokeDasharray="10 100" strokeDashoffset="-90" transform="rotate(-90 50 50)" />
                </svg>
              </div>
              <div className="text-[8px] flex flex-col gap-1 ml-2">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 mr-1"></div>
                  <span>18-24 (40%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 mr-1"></div>
                  <span>25-34 (30%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 mr-1"></div>
                  <span>35-44 (20%)</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-amber-500 mr-1"></div>
                  <span>45+ (10%)</span>
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
