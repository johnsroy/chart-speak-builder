
import React, { useState, useEffect } from 'react';
import { 
  BarChart3, ChevronLeft, ChevronRight, PlusCircle, 
  BarChartHorizontal, LineChart, PieChart, ArrowUpRight,
  Layers, Calculator, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';

const AnalyticsDashboardDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [progress, setProgress] = useState<number>(0);
  const [currentMonth, setCurrentMonth] = useState<number>(3); // April
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Animated data
  const [kpiValues, setKpiValues] = useState({
    revenue: 12580,
    growth: 24.5,
    customers: 1489,
    orders: 6745
  });
  
  // Progress animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(75);
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  // Animate KPI values
  useEffect(() => {
    const interval = setInterval(() => {
      setKpiValues(prev => ({
        revenue: prev.revenue + Math.floor(Math.random() * 100) - 30,
        growth: parseFloat((prev.growth + (Math.random() * 0.5 - 0.25)).toFixed(1)),
        customers: prev.customers + Math.floor(Math.random() * 5) - 2,
        orders: prev.orders + Math.floor(Math.random() * 10) - 3
      }));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Chart data
  const revenueData = [
    { month: 'Jan', value: 8200 },
    { month: 'Feb', value: 9400 },
    { month: 'Mar', value: 11200 },
    { month: 'Apr', value: 12600 },
    { month: 'May', value: 14500 },
    { month: 'Jun', value: 13800 }
  ];
  
  // Navigation functions
  const nextMonth = () => setCurrentMonth(prev => (prev + 1) % 12);
  const prevMonth = () => setCurrentMonth(prev => (prev - 1 + 12) % 12);

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-white/10 p-6 relative animate-fade-in">
      <div className="absolute -top-8 left-8 glass-card p-3 flex items-center gap-2 animate-fade-in shadow-lg">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Interactive BI Dashboard</span>
      </div>
      
      {/* Tabs for different views */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList className="bg-white/10 backdrop-blur-sm">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Overview
          </TabsTrigger>
          <TabsTrigger value="sales" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Sales Analytics
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Customer Trends
          </TabsTrigger>
        </TabsList>
      </Tabs>
      
      <TabsContent value="overview" className="animate-fade-in">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Revenue Card */}
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  Revenue
                </span>
                <ArrowUpRight className={`h-3 w-3 ${kpiValues.growth > 0 ? 'text-green-500' : 'text-red-500'}`} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-lg font-bold">${kpiValues.revenue.toLocaleString()}</div>
              <div className={`text-xs ${kpiValues.growth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {kpiValues.growth > 0 ? '+' : ''}{kpiValues.growth}% from last month
              </div>
            </CardContent>
          </Card>
          
          {/* Growth Rate Card */}
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <LineChart className="h-3 w-3 text-cyan-400" />
                  Growth
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-lg font-bold">{kpiValues.growth}%</div>
              <div className="w-full h-2 bg-white/10 rounded-full mt-1">
                <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${kpiValues.growth * 2}%` }}></div>
              </div>
            </CardContent>
          </Card>
          
          {/* Customers Card */}
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <PieChart className="h-3 w-3 text-purple-400" />
                  Customers
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-lg font-bold">{kpiValues.customers}</div>
              <Progress className="h-2 mt-1" value={progress} />
            </CardContent>
          </Card>
          
          {/* Orders Card */}
          <Card className="bg-white/5 backdrop-blur-sm border border-white/10">
            <CardHeader className="p-3">
              <CardTitle className="text-sm flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <BarChartHorizontal className="h-3 w-3 text-amber-400" />
                  Orders
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-lg font-bold">{kpiValues.orders}</div>
              <div className="text-xs text-gray-400">2.4 avg. per customer</div>
            </CardContent>
          </Card>
        </div>
        
        {/* Revenue Chart */}
        <Card className="bg-white/10 backdrop-blur-md border border-white/10 mb-4">
          <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Monthly Revenue</CardTitle>
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs px-2">{months[currentMonth]}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[150px] flex items-end gap-1">
              {revenueData.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div className="relative w-full">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-500/80 to-blue-400/80 rounded-t backdrop-blur-sm animate-height-change"
                      style={{ 
                        height: `${(item.value / 16000) * 150}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    ></div>
                    {/* Highlight current month */}
                    {item.month === months[currentMonth] && (
                      <div className="absolute inset-0 border-2 border-white rounded-t"></div>
                    )}
                  </div>
                  <span className="text-[10px] mt-1 text-gray-300">{item.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="sales" className="animate-fade-in">
        <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
          Click to view detailed sales analytics...
        </div>
      </TabsContent>
      
      <TabsContent value="customers" className="animate-fade-in">
        <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
          Click to view customer demographics and trends...
        </div>
      </TabsContent>
      
      {/* Quick Actions */}
      <div className="flex gap-3 mt-4">
        <Button variant="ghost" size="sm" className="bg-white/5 text-xs flex gap-1">
          <PlusCircle className="h-3.5 w-3.5" /> Add Widget
        </Button>
        <Button variant="ghost" size="sm" className="bg-white/5 text-xs flex gap-1">
          <Calculator className="h-3.5 w-3.5" /> Run Analysis
        </Button>
      </div>
      
      {/* Insight Card */}
      <div className="absolute -bottom-8 right-8 glass-card p-3 flex items-center gap-2 animate-fade-in shadow-lg">
        <div className="h-5 w-5 rounded-full bg-blue-400/30 backdrop-blur-sm flex items-center justify-center text-blue-300">
          <span className="text-xs">i</span>
        </div>
        <span className="text-sm">New insights available for Q2</span>
      </div>
    </div>
  );
};

export default AnalyticsDashboardDemo;
