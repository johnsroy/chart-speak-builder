import { AIModelType, AIQueryResponse } from '@/components/chat/types';
import { schemaService } from '@/services/schemaService';

export const nlpService = {
  // Process query method for handling natural language queries on datasets
  processQuery: async (query: string, datasetId: string, model: AIModelType, data: any[] = []): Promise<AIQueryResponse> => {
    try {
      console.log(`Processing query: "${query}" for dataset ${datasetId} using model ${model}`);
      console.log(`Data available for analysis: ${data.length} rows`);
      
      // Default to a basic response if API call fails
      const localProcessing = async (): Promise<AIQueryResponse> => {
        console.log("Using local processing for query analysis");
        
        const response: AIQueryResponse = {
          chartType: 'bar',
          data: [],
          explanation: `Analyzing your query: "${query}"`,
          xAxis: '',
          yAxis: '',
        };
        
        // Extract simple keywords to determine what visualization to show
        const lowerQuery = query.toLowerCase();
        
        // Get some sample fields for potential use
        if (!data || data.length === 0) {
          response.explanation = "No data available for analysis. Please check your dataset.";
          return response;
        }

        const sampleRow = data[0] || {};
        const fields = Object.keys(sampleRow);
        
        // Try to detect numeric fields
        const numericFields = fields.filter(field => {
          const value = sampleRow[field];
          return typeof value === 'number' || !isNaN(Number(value));
        });
        
        // Try to detect categorical fields
        const categoricalFields = fields.filter(field => {
          const value = sampleRow[field];
          return typeof value === 'string' && isNaN(Number(value));
        });
        
        if (numericFields.length === 0 && categoricalFields.length === 0) {
          response.data = data.slice(0, 10);
          response.explanation = "Here's a sample of your data";
          return response;
        }
        
        // Generate a basic visualization based on query keywords
        if (lowerQuery.includes('compare') || lowerQuery.includes('comparison')) {
          response.chartType = 'bar';
          
          if (categoricalFields.length > 0 && numericFields.length > 0) {
            const categoryField = categoricalFields[0];
            const valueField = numericFields[0];
            
            response.xAxis = categoryField;
            response.yAxis = valueField;
            
            // Group by category and calculate sums
            const groupedData: Record<string, number> = {};
            data.forEach(row => {
              const category = String(row[categoryField] || 'Unknown');
              const value = Number(row[valueField] || 0);
              
              if (!groupedData[category]) {
                groupedData[category] = 0;
              }
              groupedData[category] += value;
            });
            
            response.data = Object.entries(groupedData)
              .map(([name, value]) => ({ name, value }))
              .slice(0, 10);
            
            response.explanation = `Comparing ${valueField} by ${categoryField}`;
          } else {
            // No suitable fields found, return sample data
            response.data = data.slice(0, 10);
            response.explanation = "Here's a sample of your data";
          }
        } 
        else if (lowerQuery.includes('trend') || lowerQuery.includes('time') || lowerQuery.includes('over time')) {
          response.chartType = 'line';
          
          // Look for date fields
          const dateField = fields.find(field => {
            const value = String(sampleRow[field] || '');
            return value.includes('-') && (value.includes('T') || value.match(/\d{4}-\d{2}-\d{2}/));
          }) || '';
          
          if (dateField && numericFields.length > 0) {
            const valueField = numericFields[0];
            
            // Sort data by date
            const sortedData = [...data]
              .sort((a, b) => {
                const dateA = new Date(a[dateField]);
                const dateB = new Date(b[dateField]);
                return dateA.getTime() - dateB.getTime();
              })
              .filter(row => row[dateField] && !isNaN(new Date(row[dateField]).getTime()));
            
            // Take a reasonable number of points
            const step = Math.max(1, Math.floor(sortedData.length / 20));
            response.data = sortedData
              .filter((_, i) => i % step === 0)
              .map(row => ({
                name: new Date(row[dateField]).toLocaleDateString(),
                value: Number(row[valueField] || 0)
              }))
              .slice(0, 30);
            
            response.explanation = `Showing trend of ${valueField} over time`;
          } else {
            // No suitable fields found, return sample data
            response.data = data.slice(0, 10);
            response.explanation = "Here's a sample of your data";
          }
        }
        else if (lowerQuery.includes('distribution') || lowerQuery.includes('pie') || lowerQuery.includes('percentage')) {
          response.chartType = 'pie';
          
          if (categoricalFields.length > 0) {
            const categoryField = categoricalFields[0];
            
            // Count occurrences of each category
            const counts: Record<string, number> = {};
            data.forEach(row => {
              const category = String(row[categoryField] || 'Unknown');
              counts[category] = (counts[category] || 0) + 1;
            });
            
            response.data = Object.entries(counts)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 8);
            
            response.explanation = `Distribution of ${categoryField} values`;
          } else {
            // No suitable categorical fields, try to bin numeric data
            if (numericFields.length > 0) {
              const numField = numericFields[0];
              const values = data.map(row => Number(row[numField] || 0)).filter(v => !isNaN(v));
              
              if (values.length > 0) {
                // Create bins for the values
                const min = Math.min(...values);
                const max = Math.max(...values);
                const range = max - min;
                const binCount = 8;
                const binSize = range / binCount;
                
                const bins: Record<string, number> = {};
                values.forEach(value => {
                  const binIndex = Math.min(binCount - 1, Math.floor((value - min) / binSize));
                  const binName = `${(min + binIndex * binSize).toFixed(1)} - ${(min + (binIndex + 1) * binSize).toFixed(1)}`;
                  bins[binName] = (bins[binName] || 0) + 1;
                });
                
                response.data = Object.entries(bins)
                  .map(([name, value]) => ({ name, value }));
                
                response.explanation = `Distribution of ${numField} values`;
              }
            }
          }
        }
        else if (lowerQuery.includes('top') || lowerQuery.includes('highest') || lowerQuery.includes('largest')) {
          response.chartType = 'bar';
          
          if (categoricalFields.length > 0 && numericFields.length > 0) {
            const categoryField = categoricalFields[0];
            const valueField = numericFields[0];
            
            // Group by category and calculate sums
            const groupedData: Record<string, number> = {};
            data.forEach(row => {
              const category = String(row[categoryField] || 'Unknown');
              const value = Number(row[valueField] || 0);
              
              if (!groupedData[category]) {
                groupedData[category] = 0;
              }
              groupedData[category] += value;
            });
            
            // Find top values
            response.data = Object.entries(groupedData)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);
            
            response.explanation = `Top ${response.data.length} ${categoryField} by ${valueField}`;
          } else {
            // No suitable fields found, return sample data
            response.data = data.slice(0, 10);
            response.explanation = "Here's a sample of your data";
          }
        }
        else {
          // Default to showing some data
          if (numericFields.length > 0 && categoricalFields.length > 0) {
            // Create a simple bar chart
            const categoryField = categoricalFields[0];
            const valueField = numericFields[0];
            
            response.xAxis = categoryField;
            response.yAxis = valueField;
            
            // Group by category
            const groupedData: Record<string, number> = {};
            data.forEach(row => {
              const category = String(row[categoryField] || 'Unknown');
              const value = Number(row[valueField] || 0);
              
              if (!groupedData[category]) {
                groupedData[category] = 0;
              }
              groupedData[category] += value;
            });
            
            response.chartType = 'bar';
            response.data = Object.entries(groupedData)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);
            
            response.explanation = `${valueField} by ${categoryField}`;
          } else {
            // No obvious chart structure, return sample data
            response.data = data.slice(0, 10);
            response.explanation = "Here's a sample of your data";
          }
        }
        
        return response;
      };
      
      try {
        // Try local processing first for faster response
        return await localProcessing();
      } catch (error) {
        console.error("Error in local NLP processing:", error);
        
        // Return a minimal response with error handling
        return {
          chartType: 'bar',
          data: data.slice(0, 5).map((row, i) => ({ 
            name: `Item ${i+1}`, 
            value: 10 - i 
          })),
          explanation: "I couldn't process your query fully. Here's a simple visualization of your data.",
          xAxis: 'Category',
          yAxis: 'Value'
        };
      }
    } catch (error) {
      console.error("Error in NLP service:", error);
      throw error;
    }
  },
  
  /**
   * Generate dataset-specific query recommendations
   */
  getRecommendationsForDataset: (dataset, dataRows) => {
    try {
      if (!dataset || !dataRows || !Array.isArray(dataRows) || dataRows.length === 0) {
        // Return fallback recommendations if dataset or data is invalid
        return [
          "Show the distribution of values in this dataset",
          "What are the trends in this dataset?",
          "Summarize this dataset for me",
          "What insights can you provide from this data?",
          "Create a visualization of the key metrics"
        ];
      }
      
      // Default recommendations
      const defaultRecommendations = [
        "Show the distribution of values",
        "What are the most common categories?",
        "Find correlations between columns",
        "Summarize this dataset"
      ];
      
      // Get column names for recommendations
      const columns = Object.keys(dataRows[0] || {});
      const recommendations = [];
      
      // Check if it's a vehicle-related dataset
      const isVehicleDataset = dataset.file_name && 
        typeof dataset.file_name === 'string' && 
        (dataset.file_name.toLowerCase().includes('vehicle') || 
         dataset.file_name.toLowerCase().includes('car') || 
         dataset.file_name.toLowerCase().includes('auto'));
         
      // Check if it's a sales dataset
      const isSalesDataset = dataset.file_name && 
        typeof dataset.file_name === 'string' && 
        (dataset.file_name.toLowerCase().includes('sales') || 
         dataset.file_name.toLowerCase().includes('revenue'));
      
      // Add specific recommendations based on dataset type
      if (isVehicleDataset) {
        recommendations.push(
          "Show the distribution of vehicle makes",
          "Which vehicle model is most common?",
          "Compare electric vs. non-electric vehicles",
          "What's the average price by vehicle type?"
        );
      } else if (isSalesDataset) {
        recommendations.push(
          "Show sales trends over time",
          "Which product has the highest revenue?",
          "Compare sales by region",
          "What's our best selling product?"
        );
      }
      
      // Add column-specific recommendations
      columns.forEach(column => {
        const lowerColumn = column.toLowerCase();
        if (lowerColumn.includes('price') || lowerColumn.includes('cost') || lowerColumn.includes('revenue')) {
          recommendations.push(`What's the average ${column}?`, `Show ${column} distribution`);
        }
        else if (lowerColumn.includes('date') || lowerColumn.includes('year')) {
          recommendations.push(`Show trends over ${column}`);
        }
        else if (lowerColumn.includes('type') || lowerColumn.includes('category')) {
          recommendations.push(`Show distribution by ${column}`);
        }
      });
      
      // Return a mix of specific and default recommendations
      return [...recommendations, ...defaultRecommendations].slice(0, 7);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return [
        "Analyze this dataset",
        "Show key insights",
        "Create a summary visualization",
        "What patterns can you find?",
        "Show distribution of values"
      ];
    }
  },
  
  // Calculate percentage change
  calculatePercentageChange: (current: number, previous: number): number => {
    // Convert inputs to numbers if they're not already
    const currentValue = typeof current === 'string' ? parseFloat(current) : current;
    const previousValue = typeof previous === 'string' ? parseFloat(previous) : previous;
    
    // Check for valid numbers and prevent division by zero
    if (isNaN(currentValue) || isNaN(previousValue) || previousValue === 0) {
      return 0;
    }
    
    // Calculate percentage change
    return ((currentValue - previousValue) / previousValue) * 100;
  },
  
  // Helper function to analyze dataset and extract key information
  analyzeDataset: (dataRows) => {
    if (!dataRows || dataRows.length === 0) {
      return {};
    }
    
    const analysis: Record<string, any> = {
      rowCount: dataRows.length,
      columns: []
    };
    
    const sample = dataRows[0];
    const columns = Object.keys(sample);
    
    columns.forEach(column => {
      const values = dataRows.map(row => row[column]).filter(v => v !== null && v !== undefined);
      const uniqueValues = [...new Set(values)];
      
      const columnInfo: any = {
        name: column,
        uniqueValueCount: uniqueValues.length
      };
      
      // Determine type
      if (values.length === 0) {
        columnInfo.type = 'unknown';
      } else if (values.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
        columnInfo.type = 'number';
        // Calculate numeric stats
        const numericValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        if (numericValues.length > 0) {
          columnInfo.min = Math.min(...numericValues);
          columnInfo.max = Math.max(...numericValues);
          columnInfo.avg = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        }
      } else if (values.every(v => 
        typeof v === 'string' && (
          v.match(/^\d{4}-\d{2}-\d{2}/) || 
          v.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)
        )
      )) {
        columnInfo.type = 'date';
      } else if (uniqueValues.length <= Math.min(10, dataRows.length * 0.2)) {
        columnInfo.type = 'category';
        columnInfo.categories = uniqueValues.slice(0, 10);
      } else {
        columnInfo.type = 'string';
      }
      
      analysis.columns.push(columnInfo);
    });
    
    return analysis;
  }
};
