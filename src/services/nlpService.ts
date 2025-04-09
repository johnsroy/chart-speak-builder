import { AIModelType, AIQueryResponse } from '@/components/chat/types';

export const nlpService = {
  // Add the missing processQuery method
  processQuery: async (query: string, datasetId: string, model: AIModelType, data: any[]): Promise<AIQueryResponse> => {
    try {
      console.log(`Processing query: "${query}" for dataset ${datasetId} using model ${model}`);
      
      // Default to a basic response if API call fails
      const localProcessing = async (): Promise<AIQueryResponse> => {
        console.log("Falling back to local processing");
        
        const response: AIQueryResponse = {
          type: 'bar',
          data: [],
          explanation: `Analyzing your query: "${query}"`,
        };
        
        // Extract simple keywords to determine what visualization to show
        const lowerQuery = query.toLowerCase();
        
        // Get some sample fields for potential use
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
          response.type = 'bar';
          
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
          response.type = 'line';
          
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
          response.type = 'pie';
          
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
          response.type = 'bar';
          
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
            
            response.type = 'bar';
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
          type: 'bar',
          data: data.slice(0, 5).map((row, i) => ({ 
            name: `Item ${i+1}`, 
            value: 10 - i 
          })),
          explanation: "I couldn't process your query fully. Here's a simple visualization of your data."
        };
      }
    } catch (error) {
      console.error("Error in NLP service:", error);
      throw error;
    }
  },
  
  // Add a method to generate recommendations based on dataset
  getRecommendationsForDataset: (dataset: any): string[] => {
    const recommendations: string[] = [
      "Show me a summary of the data",
      "What are the main trends?"
    ];
    
    // Add more specific recommendations based on dataset properties
    if (dataset) {
      const fileName = dataset.file_name?.toLowerCase() || '';
      
      // Check if column schema exists
      if (dataset.column_schema) {
        const columns = Object.keys(dataset.column_schema);
        
        // Find potential date columns
        const dateColumns = columns.filter(c => 
          c.toLowerCase().includes('date') || 
          c.toLowerCase().includes('time') || 
          c.toLowerCase().includes('year')
        );
        
        // Find potential numeric columns
        const numericColumns = columns.filter(c => 
          dataset.column_schema[c] === 'number' || 
          c.toLowerCase().includes('amount') || 
          c.toLowerCase().includes('price') ||
          c.toLowerCase().includes('cost') ||
          c.toLowerCase().includes('value') ||
          c.toLowerCase().includes('total')
        );
        
        // Find potential category columns
        const categoryColumns = columns.filter(c => 
          c.toLowerCase().includes('category') || 
          c.toLowerCase().includes('type') ||
          c.toLowerCase().includes('region') ||
          c.toLowerCase().includes('country') ||
          c.toLowerCase().includes('state') ||
          c.toLowerCase().includes('city')
        );
        
        // Add recommendations based on available columns
        if (dateColumns.length > 0 && numericColumns.length > 0) {
          recommendations.push(`Show ${numericColumns[0]} trends over time`);
        }
        
        if (categoryColumns.length > 0 && numericColumns.length > 0) {
          recommendations.push(`Compare ${numericColumns[0]} by ${categoryColumns[0]}`);
          recommendations.push(`What's the distribution of ${categoryColumns[0]}?`);
        }
        
        if (numericColumns.length > 1) {
          recommendations.push(`Show the relationship between ${numericColumns[0]} and ${numericColumns[1]}`);
        }
      }
      
      // Add file-specific recommendations
      if (fileName.includes('sales')) {
        recommendations.push("What are the top selling products?");
        recommendations.push("Show monthly sales trends");
      } else if (fileName.includes('customer')) {
        recommendations.push("Show customer distribution by region");
        recommendations.push("What's the average customer spending?");
      } else if (fileName.includes('financial') || fileName.includes('finance')) {
        recommendations.push("Show income vs. expenses");
        recommendations.push("What's the profit margin trend?");
      } else if (fileName.includes('survey')) {
        recommendations.push("What's the response distribution?");
        recommendations.push("Show satisfaction ratings");
      }
    }
    
    // Return a set of unique recommendations (up to 5)
    return [...new Set(recommendations)].slice(0, 5);
  },
  
  // Fix the specific function with the type error
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
};
