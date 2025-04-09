
import { dataService } from '@/services/dataService';
import { AIModelType } from '@/components/chat/types';
import { toast } from 'sonner';

// Function to generate AI query
export const generateAIQuery = async (
  query: string,
  datasetId: string,
  model: AIModelType,
  userId?: string
) => {
  try {
    console.log(`Generating AI query with model: ${model}`);
    console.log(`Query: "${query}" for dataset: ${datasetId}`);
    
    // Validate input
    if (!query || !datasetId) {
      throw new Error('Query and dataset ID are required');
    }
    
    // Call the API endpoint based on the model
    const endpoint = model === 'openai' ? 
      '/api/ai/query/openai' : 
      '/api/ai/query/anthropic';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        datasetId,
        userId,
        maxTokens: 4000, // Increased token size for more detailed responses
        temperature: 0.7,
        includeChainOfThought: true, // Enable chain of thought reasoning
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response:", data);
    
    // Track successful query in analytics
    trackQueryAnalytics(query, datasetId, model, data.query_id);
    
    return data;
  } catch (error) {
    console.error("Error in generateAIQuery:", error);
    toast.error(`AI query generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
};

// Function to track query analytics
const trackQueryAnalytics = (
  query: string,
  datasetId: string,
  model: AIModelType,
  queryId?: string
) => {
  try {
    // Log analytics event
    console.log(`Tracked query: "${query.substring(0, 30)}..." using ${model} on dataset ${datasetId}`);
    
    // In a real implementation, we would send this to an analytics service
    const analyticsData = {
      query,
      datasetId,
      model,
      queryId,
      timestamp: new Date().toISOString(),
    };
    
    // Mock analytics service call
    setTimeout(() => {
      console.log("Analytics data recorded:", analyticsData);
    }, 100);
  } catch (error) {
    console.error("Error tracking analytics:", error);
    // Non-blocking - we don't want to disrupt the user experience
  }
};

// Generate dataset-specific suggestions based on dataset content and schema
export const generateDatasetSuggestions = async (datasetId: string) => {
  try {
    // In a real implementation, this would analyze the dataset schema
    // and return customized suggestions
    
    // Default suggestions
    const defaultSuggestions = [
      'What are the key trends in this dataset?',
      'Summarize the main insights from this data',
      'What are the top 5 findings?',
      'Show me a visualization of the key metrics'
    ];
    
    // Get dataset info to customize suggestions
    const dataset = await dataService.getDataset(datasetId);
    
    if (!dataset) {
      return defaultSuggestions;
    }
    
    // Customize suggestions based on dataset name/type
    const name = dataset.name?.toLowerCase() || '';
    const fileName = dataset.file_name?.toLowerCase() || '';
    
    if (name.includes('sales') || fileName.includes('sales')) {
      return [
        'What were our best-selling products last quarter?',
        'Show me sales trends over time',
        'Compare sales performance across regions',
        'What day of the week has the highest sales?'
      ];
    }
    
    if (name.includes('customer') || fileName.includes('customer')) {
      return [
        'What is our customer retention rate?',
        'Which customer segments are most profitable?',
        'Show me customer acquisition trends',
        'What is the average customer lifetime value?'
      ];
    }
    
    return defaultSuggestions;
  } catch (error) {
    console.error("Error generating dataset suggestions:", error);
    return [
      'What are the key trends in this dataset?',
      'Summarize the main insights from this data',
      'What are the top 5 findings?',
      'Show me a visualization of the key metrics'
    ];
  }
};
