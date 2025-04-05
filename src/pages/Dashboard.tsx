import React, { useState } from 'react';
import { 
  BarChart, PieChart, LineChart, 
  Activity, FileSpreadsheet, Plus, 
  Search, Settings, Download
} from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { dataService, Dataset } from '@/services/dataService';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from "@/components/ui/separator"
import { nlpService } from '@/services/nlpService';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import ReactECharts from 'echarts-for-react';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch datasets using react-query
  const { isLoading, error, data: datasets, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => dataService.getDatasets(),
  });

  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset);
  };

  const handleQuerySubmit = async () => {
    if (!selectedDataset) {
      toast({
        title: "No dataset selected",
        description: "Please select a dataset to query.",
      });
      return;
    }

    if (!naturalLanguageQuery) {
      toast({
        title: "No query entered",
        description: "Please enter a query to run.",
      });
      return;
    }

    try {
      const result = await nlpService.processQuery(naturalLanguageQuery, selectedDataset.id);
      setQueryResult(result);
    } catch (err: any) {
      toast({
        title: "Error running query",
        description: err.message,
      });
    }
  };

  const handleCopySQL = () => {
    if (queryResult?.sql) {
      navigator.clipboard.writeText(queryResult.sql);
      toast({
        title: "SQL copied",
        description: "SQL query copied to clipboard.",
      });
    } else {
      toast({
        title: "No SQL to copy",
        description: "No SQL query available to copy.",
      });
    }
  };

  const getEchartsOption = () => {
    if (!queryResult) return {};

    const { chartType, chartConfig, data } = queryResult;

    if (chartType === 'line') {
      return {
        xAxis: {
          type: 'category',
          data: data.map((item: any) => item[chartConfig.xAxis]),
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          data: data.map((item: any) => item[chartConfig.yAxis]),
          type: 'line'
        }],
        title: {
          text: chartConfig.title
        },
        tooltip: {
          trigger: 'axis'
        },
        toolbox: {
          feature: {
            saveAsImage: {}
          }
        }
      };
    } else if (chartType === 'bar') {
      return {
        xAxis: {
          type: 'category',
          data: data.map((item: any) => item[chartConfig.xAxis]),
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          data: data.map((item: any) => item[chartConfig.yAxis]),
          type: 'bar'
        }],
        title: {
          text: chartConfig.title
        },
        tooltip: {
          trigger: 'axis'
        },
        toolbox: {
          feature: {
            saveAsImage: {}
          }
        }
      };
    } else if (chartType === 'pie') {
      return {
        title: {
          text: chartConfig.title,
          left: 'center'
        },
        tooltip: {
          trigger: 'item'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        series: [
          {
            name: chartConfig.title,
            type: 'pie',
            radius: '50%',
            data: data.map((item: any) => ({
              value: item[chartConfig.yAxis],
              name: item[chartConfig.xAxis]
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ],
        toolbox: {
          feature: {
            saveAsImage: {}
          }
        }
      };
    } else if (chartType === 'scatter') {
      return {
        xAxis: {
          type: 'value'
        },
        yAxis: {
          type: 'value'
        },
        series: [{
          data: data.map((item: any) => [item.x, item.y]),
          type: 'scatter'
        }],
        title: {
          text: chartConfig.title
        },
        tooltip: {
          trigger: 'item'
        },
        toolbox: {
          feature: {
            saveAsImage: {}
          }
        }
      };
    } else {
      return {};
    }
  };

  const filteredDatasets = datasets ? datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4 text-gradient">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Dataset Selection */}
          <div className="md:col-span-1">
            <div className="glass-card p-4 mb-6">
              <h2 className="text-xl font-medium mb-4">Select Dataset</h2>
              <Input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : error ? (
                <p className="text-red-500">Error: {error.message}</p>
              ) : filteredDatasets.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {filteredDatasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className={`p-3 rounded-md cursor-pointer hover:bg-primary/10 ${selectedDataset?.id === dataset.id ? 'bg-primary/20' : ''}`}
                      onClick={() => handleDatasetSelect(dataset)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{dataset.name}</p>
                          <p className="text-sm text-gray-400">{dataset.file_name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(dataset.id);
                              toast({
                                title: "Dataset ID copied",
                                description: "Dataset ID copied to clipboard.",
                              });
                            }}>
                              Copy Dataset ID <Copy className="ml-auto h-4 w-4" />
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to={`/upload`}>
                                Edit Dataset <Settings className="ml-auto h-4 w-4" />
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">No datasets found.</p>
                  <Button variant="link" asChild>
                    <Link to="/upload">
                      <Plus className="h-4 w-4 mr-2" /> Upload a dataset
                    </Link>
                  </Button>
                </div>
              )}
            </div>
            {user?.role === 'admin' && (
              <Badge variant="outline">Admin</Badge>
            )}
          </div>

          {/* Query Input and Results */}
          <div className="md:col-span-2">
            <div className="glass-card p-4">
              <h2 className="text-xl font-medium mb-4">Natural Language Query</h2>
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Enter your query here..."
                  value={naturalLanguageQuery}
                  onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                />
              </div>
              <Button className="purple-gradient" onClick={handleQuerySubmit}>
                Run Query <Search className="h-4 w-4 ml-2" />
              </Button>

              {selectedDataset && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Dataset Preview: {selectedDataset.name}</h3>
                  {queryResult?.chartType === 'table' ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableCaption>Preview of the selected dataset.</TableCaption>
                        <TableHeader>
                          {selectedDataset.column_schema && Object.keys(selectedDataset.column_schema).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableHeader>
                        <TableBody>
                          {queryResult?.data.map((row: any, index: number) => (
                            <TableRow key={index}>
                              {Object.keys(selectedDataset.column_schema).map((key) => (
                                <TableCell key={key}>{row[key]}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : queryResult?.data && queryResult?.data.length > 0 ? (
                    <div className="h-[400px]">
                      <ReactECharts option={getEchartsOption()} />
                    </div>
                  ) : (
                    <p className="text-gray-500">No data to display.</p>
                  )}
                </div>
              )}

              {queryResult?.explanation && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Explanation</CardTitle>
                    <CardDescription>Understanding the query result.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p>{queryResult.explanation}</p>
                  </CardContent>
                </Card>
              )}

              {queryResult?.sql && (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium mb-2">Generated SQL</h3>
                    <Button variant="secondary" size="sm" onClick={handleCopySQL}>
                      Copy SQL <Copy className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                  <div className="bg-white/10 p-3 rounded-md font-mono text-sm overflow-x-auto">
                    {queryResult.sql}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
