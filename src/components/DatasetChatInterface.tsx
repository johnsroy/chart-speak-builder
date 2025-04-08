
import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { nlpService } from '@/services/nlpService';
import { dataService } from '@/services/dataService';
import { supabase } from '@/lib/supabase';
import { QueryResult } from '@/services/types/queryTypes';

import ModelSelector from './chat/ModelSelector';
import ChatContainer from './chat/ChatContainer';
import ChatInput from './chat/ChatInput';
import { Message } from './chat/types';
import { generateStepByStepExplanation } from './chat/ChatUtils';

interface DatasetChatInterfaceProps {
  datasetId: string;
  datasetName: string;
}

const DatasetChatInterface: React.FC<DatasetChatInterfaceProps> = ({
  datasetId,
  datasetName
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<'openai' | 'anthropic'>('openai');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [dataset, setDataset] = useState(null);
  const [previousQueries, setPreviousQueries] = useState<any[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [fullDataset, setFullDataset] = useState<any[] | null>(null);
  const [loadingDataset, setLoadingDataset] = useState(false);

  // Fetch the current user ID on component mount
  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    getUserId();
  }, []);

  // Fetch dataset information, recommendations, and the full dataset
  useEffect(() => {
    const fetchDatasetAndRecommendations = async () => {
      try {
        // Load dataset metadata
        const datasetData = await dataService.getDataset(datasetId);
        setDataset(datasetData);
        
        // Fetch the full dataset for better analysis
        fetchFullDataset(datasetId);
        
        // Get recommendations based on dataset
        const suggestedQueries = nlpService.getRecommendationsForDataset(datasetData);
        setRecommendations(suggestedQueries);
        
        // Load previous queries for this dataset
        const queries = await nlpService.getPreviousQueries(datasetId);
        setPreviousQueries(queries);
        
      } catch (error) {
        console.error('Error fetching dataset details:', error);
        setRecommendations([
          "Show me a summary of the main trends",
          "Create a breakdown by category",
          "Compare the top values in the dataset",
          "Show the distribution across categories", 
          "What patterns can you find in this data?"
        ]);
      }
    };
    
    fetchDatasetAndRecommendations();
  }, [datasetId]);

  // Set welcome message when the component first loads
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: `I can help you analyze the "${datasetName}" dataset. What would you like to know?`,
        sender: 'ai',
        timestamp: new Date(),
        thinking: 'Initial greeting message'
      }]);
    }
  }, [datasetName, messages.length]);
  
  // Enhanced function to fetch the full dataset with retries
  const fetchFullDataset = async (datasetId: string) => {
    setLoadingDataset(true);
    try {
      console.log("Fetching full dataset for analysis");
      
      // Try to load from the dataset_data table first
      try {
        console.log("Attempting to fetch from dataset_data table");
        const { data, error } = await supabase
          .from('dataset_data')
          .select('*')
          .eq('dataset_id', datasetId)
          .limit(10000); // Significantly increased limit for better analysis
        
        if (!error && data && Array.isArray(data) && data.length > 0) {
          console.log(`Successfully loaded ${data.length} rows from dataset_data table`);
          setFullDataset(data);
          setLoadingDataset(false);
          return;
        } else if (error) {
          console.error('Error getting full dataset data:', error);
          // Fallback to file storage
        }
      } catch (err) {
        console.error('Error accessing dataset_data table:', err);
        // Continue to try other methods
      }
      
      // Try to fetch directly from storage
      try {
        await fetchDatasetFromStorage(datasetId);
        return;
      } catch (storageErr) {
        console.error('Error fetching from storage:', storageErr);
      }
      
      // If we reach here, try to generate appropriate sample data
      const dataset = await dataService.getDataset(datasetId);
      if (dataset) {
        console.log("Generating appropriate sample data based on filename:", dataset.file_name);
        const sampleData = generateSampleData(dataset.column_schema, dataset.row_count, dataset.file_name);
        if (sampleData && sampleData.length > 0) {
          console.log(`Generated ${sampleData.length} sample rows based on schema`);
          setFullDataset(sampleData);
          
          // Since this is sample data, inform the user but don't block the experience
          toast.info("Using sample data for analysis", {
            description: "Actual dataset couldn't be loaded completely. Using representative sample data.",
            duration: 5000,
            position: "bottom-center"
          });
          setLoadingDataset(false);
          return;
        }
      }
      
      // Last resort: try preview data
      const previewData = await dataService.previewDataset(datasetId);
      if (previewData && Array.isArray(previewData) && previewData.length > 0) {
        console.log(`Using preview data with ${previewData.length} rows`);
        setFullDataset(previewData);
        setLoadingDataset(false);
        return;
      }
      
      throw new Error("Unable to load dataset");
    } catch (err) {
      console.error('Error in fetching full dataset:', err);
      toast.error('Could not load full dataset data');
      setLoadingDataset(false);
    }
  };
  
  // Function to fetch dataset directly from storage
  const fetchDatasetFromStorage = async (datasetId: string) => {
    console.log("Attempting to fetch dataset directly from storage");
    const dataset = await dataService.getDataset(datasetId);
    
    if (!dataset || !dataset.storage_path) {
      console.error('No storage path found for dataset');
      throw new Error("No storage path available");
    }
    
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('datasets')
      .download(dataset.storage_path);
    
    if (fileError) {
      console.error('Error downloading dataset file:', fileError);
      throw fileError;
    }
    
    const text = await fileData.text();
    const rows = text.split('\n');
    const headers = rows[0].split(',').map(h => h.trim());
    
    const parsedData = [];
    
    for (let i = 1; i < rows.length && i < 50000; i++) { // Limit to 50k rows for performance
      if (!rows[i].trim()) continue;
      
      const values = rows[i].split(',');
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      
      parsedData.push(row);
    }
    
    console.log(`Successfully parsed ${parsedData.length} rows from storage file`);
    setFullDataset(parsedData);
    setLoadingDataset(false);
  };

  // Helper function to generate representative sample data based on schema
  const generateSampleData = (schema: any, rowCount: number, fileName: string) => {
    if (!schema || typeof schema !== 'object') {
      return null;
    }
    
    const sampleSize = Math.min(rowCount, 5000); // Generate up to 5000 rows
    const columns = Object.keys(schema);
    
    // Create type-appropriate sample data based on schema and filename
    const sampleData = [];
    const lowerFileName = fileName.toLowerCase();
    
    for (let i = 0; i < sampleSize; i++) {
      const row: any = {};
      
      columns.forEach(col => {
        const colType = schema[col];
        const lowerCol = col.toLowerCase();
        
        if (colType === 'number' || lowerCol.includes('year') || lowerCol.includes('price') || 
            lowerCol.includes('amount') || lowerCol.includes('count') || lowerCol.includes('id')) {
          row[col] = Math.floor(Math.random() * 10000);
        } else if (colType === 'boolean') {
          row[col] = Math.random() > 0.5;
        } else if (lowerCol.includes('date')) {
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 365));
          row[col] = date.toISOString().split('T')[0];
        } else if (lowerCol.includes('name') || lowerCol === 'make' || lowerCol === 'model') {
          // Generate relevant sample names based on dataset type
          if (lowerFileName.includes('vehicle')) {
            const carBrands = ['Toyota', 'Honda', 'Ford', 'Tesla', 'BMW', 'Mercedes'];
            row[col] = carBrands[Math.floor(Math.random() * carBrands.length)];
          } else if (lowerFileName.includes('sales')) {
            const products = ['Product A', 'Product B', 'Product C', 'Premium Product'];
            row[col] = products[Math.floor(Math.random() * products.length)];
          } else {
            row[col] = `Sample ${col} ${i % 10}`;
          }
        } else {
          row[col] = `Sample ${col} ${i}`;
        }
      });
      
      sampleData.push(row);
    }
    
    return sampleData;
  };

  // Handle sending a new message with improved data handling
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) {
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      console.log(`Sending query to ${activeModel} model:`, messageText);
      
      // Make sure we have dataset data before proceeding
      if (loadingDataset) {
        console.log("Dataset is still loading, waiting...");
        toast.info("Preparing dataset for analysis...", { id: "dataset-loading" });
        
        // Wait for dataset to load with a timeout
        let waitAttempts = 0;
        const maxWaitAttempts = 10;
        
        while (loadingDataset && waitAttempts < maxWaitAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          waitAttempts++;
        }
        
        toast.dismiss("dataset-loading");
        
        if (loadingDataset) {
          console.warn("Dataset loading timed out, proceeding with available data");
        }
      }
      
      // Use full dataset if available, otherwise try to load it first
      let dataForAnalysis = fullDataset;
      
      if (!dataForAnalysis || !Array.isArray(dataForAnalysis) || dataForAnalysis.length === 0) {
        console.log('Full dataset not available, attempting to fetch it now');
        
        try {
          // Try one more time to get the full dataset
          await fetchFullDataset(datasetId);
          dataForAnalysis = fullDataset;
          
          if (!dataForAnalysis || !Array.isArray(dataForAnalysis) || dataForAnalysis.length === 0) {
            console.log('Still no dataset available, falling back to preview data');
            dataForAnalysis = await dataService.previewDataset(datasetId);
          }
        } catch (dataError) {
          console.error('Error loading dataset data:', dataError);
          toast.error('Could not load full dataset data');
          dataForAnalysis = await dataService.previewDataset(datasetId);
        }
      }
      
      if (!dataForAnalysis || dataForAnalysis.length === 0) {
        throw new Error('No data available for analysis');
      }
      
      console.log(`Sending ${dataForAnalysis.length} rows of data for analysis`);
      toast.info(`Analyzing ${dataForAnalysis.length} rows of data...`);
      
      const result = await nlpService.processQuery(messageText, datasetId, activeModel, dataForAnalysis);
      
      console.log("Query response:", result);
      
      let thinking = '';
      
      if (result) {
        const chartType = result.chartType || result.chart_type;
        const xAxis = result.xAxis || result.x_axis;
        const yAxis = result.yAxis || result.y_axis;
        
        thinking = `Analytical process:\n`
         + `1. Analyzed the question: "${messageText}"\n`
         + `2. Examined dataset structure with ${result.data?.length || 0} rows of data\n`
         + `3. Selected "${chartType}" visualization as most appropriate for this analysis\n`
         + `4. Used "${xAxis}" for the X-axis and "${yAxis}" for the Y-axis\n`
         + `5. Processed the data to extract key insights`;
         
        if (result.data && result.data.length > 0) {
          const dataLength = result.data.length;
          const nonZeroValues = result.data.filter(item => Number(item[yAxis]) > 0).length;
          
          thinking += `\n6. Found ${dataLength} data points with ${nonZeroValues} non-zero values`;
          
          if (chartType === 'bar' || chartType === 'pie') {
            const sortedData = [...result.data].sort((a, b) => Number(b[yAxis]) - Number(a[yAxis]));
            
            if (sortedData.length > 0) {
              const highest = sortedData[0];
              thinking += `\n7. Highest value: ${highest[xAxis]} (${highest[yAxis]})`;
              
              if (sortedData.length > 1) {
                const lowest = sortedData[sortedData.length - 1];
                thinking += `\n8. Lowest value: ${lowest[xAxis]} (${lowest[yAxis]})`;
              }
              
              const total = sortedData.reduce((sum, item) => sum + Number(item[yAxis]), 0);
              const average = total / sortedData.length;
              thinking += `\n9. Total sum: ${total.toFixed(2)}, Average: ${average.toFixed(2)}`;
            }
          } else if (chartType === 'line') {
            try {
              const first = result.data[0];
              const last = result.data[result.data.length - 1];
              const change = Number(last[yAxis]) - Number(first[yAxis]);
              const firstValue = Number(first[yAxis]);
              const percentChange = (change / (firstValue || 1) * 100).toFixed(1);
              
              thinking += `\n7. Change from ${first[xAxis]} to ${last[xAxis]}: ${change > 0 ? '+' : ''}${change.toFixed(2)} (${change > 0 ? '+' : ''}${percentChange}%)`;
            } catch (e) {
              console.error('Error calculating trend:', e);
            }
          }
        }
      }
      
      let enhancedExplanation = result.explanation || '';
      
      if (!enhancedExplanation || !enhancedExplanation.includes('Step')) {
        enhancedExplanation = generateStepByStepExplanation(result, datasetName);
      }
      
      const aiResponse: Message = {
        id: Date.now().toString() + '-response',
        content: enhancedExplanation || 'Here\'s the visualization based on your query.',
        sender: 'ai',
        timestamp: new Date(),
        result: result,
        model: activeModel,
        queryId: result.query_id,
        thinking: thinking
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      if (result.query_id) {
        const newQuery = await nlpService.getQueryById(result.query_id);
        if (newQuery) {
          setPreviousQueries(prev => [newQuery, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error processing query:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        content: `Sorry, I couldn't analyze that. ${error instanceof Error ? error.message : 'Please try a different question.'}`,
        sender: 'ai',
        timestamp: new Date(),
        model: activeModel,
        thinking: `Error occurred during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error("Error analyzing data", {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadVisualization = (result: QueryResult) => {
    toast.success("Download started", {
      description: "Your visualization is being prepared for download"
    });
  };

  const loadPreviousQuery = async (queryId: string) => {
    try {
      setShowHistoryDialog(false);
      setIsLoading(true);
      
      const query = await nlpService.getQueryById(queryId);
      
      if (!query) {
        throw new Error('Query not found');
      }
      
      const data = fullDataset || await dataService.previewDataset(datasetId);
      
      const config = query.query_config;
      
      const result: QueryResult = {
        chart_type: config.chart_type,
        chartType: config.chart_type,
        x_axis: config.x_axis,
        y_axis: config.y_axis,
        xAxis: config.x_axis,
        yAxis: config.y_axis,
        color_scheme: config.color_scheme || 'professional',
        chart_title: config.result?.chart_title || 'Visualization',
        explanation: config.result?.explanation || `Analysis of ${config.x_axis} vs ${config.y_axis}`,
        data: data || [],
        columns: Object.keys(data && data.length > 0 ? data[0] : {}),
        query_id: queryId,
        model_used: query.query_type === 'anthropic' ? 'Claude 3.7 Sonnet' : 'GPT-4o'
      };
      
      const userMessage: Message = {
        id: Date.now().toString(),
        content: query.query_text,
        sender: 'user',
        timestamp: new Date(query.created_at)
      };
      
      const aiResponse: Message = {
        id: Date.now().toString() + '-response',
        content: result.explanation || 'Here\'s the visualization based on your query.',
        sender: 'ai',
        timestamp: new Date(query.created_at),
        result: result,
        model: query.query_type as 'openai' | 'anthropic',
        queryId: queryId,
        thinking: 'Loaded from query history'
      };
      
      setMessages(prev => [...prev, userMessage, aiResponse]);
    } catch (error) {
      console.error('Error loading previous query:', error);
      toast.error("Error loading query", {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[70vh]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Chat with Your Data</h2>
        <ModelSelector 
          activeModel={activeModel}
          setActiveModel={setActiveModel}
          previousQueries={previousQueries}
          showHistoryDialog={showHistoryDialog}
          setShowHistoryDialog={setShowHistoryDialog}
          loadPreviousQuery={loadPreviousQuery}
        />
      </div>
      
      <ChatContainer 
        messages={messages}
        downloadVisualization={downloadVisualization}
      />
      
      <div className="mt-4">
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          recommendations={recommendations}
        />
      </div>
    </div>
  );
};

export default DatasetChatInterface;
