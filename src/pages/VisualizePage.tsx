
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UploadCloud, Database, ChevronRight, BarChart3, PieChart, LineChart } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { Skeleton } from '@/components/ui/skeleton';

const VisualizePage = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('my-data');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoading(true);
      try {
        const result = await dataService.getDatasets();
        setDatasets(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error('Error fetching datasets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, []);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gradient">Visualize Your Data</h1>
        <p className="text-gray-300 max-w-3xl">
          Create interactive charts and dashboards to gain insights from your data. Select a dataset to begin or upload a new one.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="glass-card">
          <TabsTrigger value="my-data" className="data-[state=active]:bg-purple-600">My Datasets</TabsTrigger>
          <TabsTrigger value="examples" className="data-[state=active]:bg-purple-600">Example Datasets</TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-purple-600">Visualization Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-data" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              // Loading skeletons
              Array(3).fill(0).map((_, index) => (
                <div key={`skeleton-${index}`} className="glass-card p-6">
                  <Skeleton className="h-6 w-3/4 mb-4 bg-gray-700/50" />
                  <Skeleton className="h-4 w-full mb-2 bg-gray-700/50" />
                  <Skeleton className="h-4 w-2/3 mb-8 bg-gray-700/50" />
                  <div className="flex justify-between">
                    <Skeleton className="h-10 w-28 bg-gray-700/50" />
                    <Skeleton className="h-10 w-28 bg-gray-700/50" />
                  </div>
                </div>
              ))
            ) : datasets.length > 0 ? (
              // Actual datasets
              datasets.map(dataset => (
                <Card key={dataset.id} className="glass-card hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
                  <CardHeader>
                    <CardTitle>{dataset.name}</CardTitle>
                    <CardDescription>{dataset.file_name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300">{dataset.description || 'No description available'}</p>
                    <div className="flex items-center mt-2 text-xs text-gray-400">
                      <Database className="h-3 w-3 mr-1" />
                      <span>{dataset.row_count || 'Unknown'} rows</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/dataset/${dataset.id}`)}
                      className="border-gray-600"
                    >
                      View Details
                    </Button>
                    <Button 
                      onClick={() => navigate(`/visualize/${dataset.id}`)}
                      size="sm" 
                      className="bg-purple-700 hover:bg-purple-600"
                    >
                      Visualize <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              // No datasets state
              <div className="col-span-full glass-card p-8 text-center">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-medium mb-2">No Datasets Found</h3>
                <p className="text-gray-400 mb-6">Upload your first dataset to start creating visualizations</p>
                <Button onClick={() => navigate('/upload')} className="purple-gradient">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload Dataset
                </Button>
              </div>
            )}
            
            {/* "Upload new" card - always show this */}
            {datasets.length > 0 && (
              <Card className="glass-card bg-purple-900/30 border-dashed border-purple-500/50 hover:bg-purple-900/40 transition-all duration-300 flex flex-col items-center justify-center p-8 text-center cursor-pointer" onClick={() => navigate('/upload')}>
                <UploadCloud className="h-12 w-12 mb-4 text-purple-400" />
                <h3 className="text-xl font-medium mb-2">Upload New Dataset</h3>
                <p className="text-gray-300 mb-4">Add a new dataset to analyze and visualize</p>
                <Button className="purple-gradient">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
              </Card>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="examples" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass-card hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <CardHeader>
                <CardTitle>Sales Data</CardTitle>
                <CardDescription>Sample retail sales dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  A comprehensive dataset of retail sales across multiple stores and product categories.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full purple-gradient"
                  onClick={() => navigate('/visualize/example-sales')}
                >
                  Use This Dataset
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="glass-card hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <CardHeader>
                <CardTitle>Customer Analytics</CardTitle>
                <CardDescription>Customer behavior analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Customer demographics, purchase patterns, and satisfaction scores from an e-commerce platform.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full purple-gradient"
                  onClick={() => navigate('/visualize/example-customers')}
                >
                  Use This Dataset
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="glass-card hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
                <CardDescription>Company financial metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Financial KPIs including revenue, expenses, profits, and growth metrics over time.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full purple-gradient"
                  onClick={() => navigate('/visualize/example-finance')}
                >
                  Use This Dataset
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="templates" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="glass-card hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>Sales Dashboard</CardTitle>
                  <BarChart3 className="h-5 w-5 text-purple-400" />
                </div>
                <CardDescription>Performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Complete dashboard with sales trends, top products, and regional performance charts.
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/templates/sales-dashboard')}
                  className="border-purple-500/30 hover:bg-purple-500/20"
                >
                  Preview
                </Button>
                <Button 
                  className="bg-purple-700 hover:bg-purple-600"
                  onClick={() => navigate('/templates/sales-dashboard/apply')}
                >
                  Use Template
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="glass-card hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>Customer Insights</CardTitle>
                  <PieChart className="h-5 w-5 text-purple-400" />
                </div>
                <CardDescription>Segmentation analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Customer segmentation visualizations with demographics, behavior patterns and lifetime value charts.
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/templates/customer-insights')}
                  className="border-purple-500/30 hover:bg-purple-500/20"
                >
                  Preview
                </Button>
                <Button 
                  className="bg-purple-700 hover:bg-purple-600"
                  onClick={() => navigate('/templates/customer-insights/apply')}
                >
                  Use Template
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="glass-card hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
              <CardHeader>
                <div className="flex justify-between">
                  <CardTitle>Financial Analysis</CardTitle>
                  <LineChart className="h-5 w-5 text-purple-400" />
                </div>
                <CardDescription>Financial metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-300">
                  Comprehensive financial performance tracking with revenue, expenses, and profitability charts.
                </p>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline"
                  onClick={() => navigate('/templates/financial-analysis')}
                  className="border-purple-500/30 hover:bg-purple-500/20"
                >
                  Preview
                </Button>
                <Button 
                  className="bg-purple-700 hover:bg-purple-600"
                  onClick={() => navigate('/templates/financial-analysis/apply')}
                >
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VisualizePage;
