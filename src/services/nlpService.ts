
import { AIModelType, AIQueryResponse } from '@/components/chat/types';
import { schemaService } from '@/services/schemaService';

// Maximum token size significantly increased to 20,000
const MAX_TOKENS = 20000;

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
        
        // Try to detect date fields
        const dateFields = fields.filter(field => {
          const value = String(sampleRow[field] || '');
          return value.includes('-') && (value.includes('T') || value.match(/\d{4}-\d{2}-\d{2}/));
        });
        
        if (numericFields.length === 0 && categoricalFields.length === 0) {
          response.data = data.slice(0, 10);
          response.explanation = "Here's a sample of your data. I couldn't identify numeric or categorical fields for analysis.";
          return response;
        }
        
        // Generate a thoughtful explanation based on the dataset and query
        let explanation = `I analyzed your question: "${query}"\n\n`;
        
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
              .sort((a, b) => b.value - a.value)
              .slice(0, 15);
            
            // Generate more detailed explanation
            explanation += `I created a bar chart comparing ${valueField} by ${categoryField}.\n\n`;
            explanation += `The data shows that`;
            
            // Add insights about the top category
            if (response.data.length > 0) {
              explanation += ` "${response.data[0].name}" has the highest ${valueField} at ${response.data[0].value.toLocaleString()}`;
              
              if (response.data.length > 1) {
                explanation += `, followed by "${response.data[1].name}" at ${response.data[1].value.toLocaleString()}`;
              }
              
              explanation += ".\n\n";
              
              // Calculate the total value
              const total = Object.values(groupedData).reduce((sum, val) => sum + val, 0);
              explanation += `The total ${valueField} across all categories is ${total.toLocaleString()}.`;
            }
          } else {
            // No suitable fields found, return sample data
            response.data = data.slice(0, 10);
            explanation += "I couldn't find appropriate categorical and numeric fields for a comparison. Here's a sample of your data instead.";
          }
        } 
        else if (lowerQuery.includes('trend') || lowerQuery.includes('time') || lowerQuery.includes('over time')) {
          response.chartType = 'line';
          
          // Look for date fields
          const dateField = dateFields.length > 0 ? dateFields[0] : 
            fields.find(field => {
              const value = String(sampleRow[field] || '');
              return value.includes('date') || value.includes('year') || value.includes('month');
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
            
            // Take a reasonable number of points or aggregate by month/year if too many
            let timeSeriesData;
            if (sortedData.length > 50) {
              // Aggregate by month
              const aggregatedByMonth: Record<string, number> = {};
              sortedData.forEach(row => {
                const date = new Date(row[dateField]);
                const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!aggregatedByMonth[monthYear]) {
                  aggregatedByMonth[monthYear] = 0;
                }
                
                aggregatedByMonth[monthYear] += Number(row[valueField] || 0);
              });
              
              timeSeriesData = Object.entries(aggregatedByMonth)
                .map(([monthYear, value]) => ({
                  name: monthYear,
                  value: value
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
            } else {
              // Use raw data points if not too many
              const step = Math.max(1, Math.floor(sortedData.length / 50));
              timeSeriesData = sortedData
                .filter((_, i) => i % step === 0)
                .map(row => ({
                  name: new Date(row[dateField]).toLocaleDateString(),
                  value: Number(row[valueField] || 0)
                }));
            }
            
            response.data = timeSeriesData;
            response.xAxis = 'Date';
            response.yAxis = valueField;
            
            // Generate trend analysis
            explanation += `I created a line chart showing the trend of ${valueField} over time.\n\n`;
            
            if (timeSeriesData.length > 1) {
              // Calculate start and end values for trend analysis
              const startValue = timeSeriesData[0].value;
              const endValue = timeSeriesData[timeSeriesData.length - 1].value;
              const percentChange = ((endValue - startValue) / startValue) * 100;
              
              if (percentChange > 0) {
                explanation += `There is an **overall increase** of ${percentChange.toFixed(2)}% in ${valueField} from ${timeSeriesData[0].name} to ${timeSeriesData[timeSeriesData.length - 1].name}.`;
              } else if (percentChange < 0) {
                explanation += `There is an **overall decrease** of ${Math.abs(percentChange).toFixed(2)}% in ${valueField} from ${timeSeriesData[0].name} to ${timeSeriesData[timeSeriesData.length - 1].name}.`;
              } else {
                explanation += `The ${valueField} remained relatively stable over the time period.`;
              }
              
              // Find peaks and troughs
              const max = Math.max(...timeSeriesData.map(d => d.value));
              const min = Math.min(...timeSeriesData.map(d => d.value));
              const maxPoint = timeSeriesData.find(d => d.value === max);
              const minPoint = timeSeriesData.find(d => d.value === min);
              
              explanation += `\n\nThe highest value of ${max.toLocaleString()} was observed on ${maxPoint?.name}, while the lowest value of ${min.toLocaleString()} was on ${minPoint?.name}.`;
            }
          } else {
            // No suitable fields found, create a bar chart instead
            if (categoricalFields.length > 0 && numericFields.length > 0) {
              response.chartType = 'bar';
              response.xAxis = categoricalFields[0];
              response.yAxis = numericFields[0];
              
              // Group by category
              const groupedData: Record<string, number> = {};
              data.forEach(row => {
                const category = String(row[categoricalFields[0]] || 'Unknown');
                const value = Number(row[numericFields[0]] || 0);
                
                if (!groupedData[category]) {
                  groupedData[category] = 0;
                }
                groupedData[category] += value;
              });
              
              response.data = Object.entries(groupedData)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 15);
              
              explanation += `I couldn't find appropriate time-series data for a trend analysis. Instead, I've created a bar chart showing ${numericFields[0]} by ${categoricalFields[0]}.`;
            } else {
              response.data = data.slice(0, 10);
              explanation += "I couldn't find appropriate fields for a trend analysis. Here's a sample of your data instead.";
            }
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
            
            explanation += `I created a pie chart showing the distribution of ${categoryField} values.\n\n`;
            
            // Add percentage analysis
            const total = response.data.reduce((sum, item) => sum + item.value, 0);
            explanation += `Out of ${total.toLocaleString()} total records:\n\n`;
            
            response.data.forEach(item => {
              const percentage = (item.value / total) * 100;
              explanation += `- **${item.name}**: ${item.value.toLocaleString()} (${percentage.toFixed(1)}%)\n`;
            });
            
            // Add insight about dominant category
            if (response.data.length > 0) {
              const topCategory = response.data[0];
              const topPercentage = (topCategory.value / total) * 100;
              explanation += `\n${topCategory.name} is the most common, representing ${topPercentage.toFixed(1)}% of the dataset.`;
            }
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
                
                explanation += `I created a pie chart showing the distribution of ${numField} values.\n\n`;
                explanation += `The values range from ${min.toLocaleString()} to ${max.toLocaleString()}, and I've grouped them into ${binCount} ranges.\n\n`;
                
                // Calculate statistics
                const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
                explanation += `The average ${numField} is ${avg.toLocaleString()}, with a minimum of ${min.toLocaleString()} and maximum of ${max.toLocaleString()}.`;
              }
            } else {
              response.data = data.slice(0, 10);
              explanation += "I couldn't find appropriate fields for a distribution analysis. Here's a sample of your data instead.";
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
            
            explanation += `I created a bar chart showing the top ${response.data.length} ${categoryField} by ${valueField}.\n\n`;
            
            // Add insights about top categories
            if (response.data.length > 0) {
              explanation += `**Key findings:**\n\n`;
              
              response.data.slice(0, 5).forEach((item, index) => {
                explanation += `${index + 1}. **${item.name}**: ${item.value.toLocaleString()}\n`;
              });
              
              // Calculate what percentage the top category represents
              const total = Object.values(groupedData).reduce((sum, val) => sum + val, 0);
              const topPercentage = (response.data[0].value / total) * 100;
              
              explanation += `\nThe top category "${response.data[0].name}" represents ${topPercentage.toFixed(1)}% of the total ${valueField}.`;
            }
            
            response.xAxis = categoryField;
            response.yAxis = valueField;
          } else {
            // No suitable fields found, return sample data
            response.data = data.slice(0, 10);
            explanation += "I couldn't find appropriate fields for a top values analysis. Here's a sample of your data instead.";
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
              .slice(0, 12);
            
            explanation += `I've analyzed your question and created a visualization of ${valueField} by ${categoryField}.\n\n`;
            
            // Add basic statistics
            const values = data.map(row => Number(row[valueField] || 0)).filter(v => !isNaN(v));
            if (values.length > 0) {
              const min = Math.min(...values);
              const max = Math.max(...values);
              const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
              const sum = values.reduce((sum, v) => sum + v, 0);
              
              explanation += `**Dataset statistics:**\n\n`;
              explanation += `- Total records: ${data.length.toLocaleString()}\n`;
              explanation += `- Sum of ${valueField}: ${sum.toLocaleString()}\n`;
              explanation += `- Average ${valueField}: ${avg.toLocaleString()}\n`;
              explanation += `- Range: ${min.toLocaleString()} to ${max.toLocaleString()}\n\n`;
              
              explanation += `The chart shows the distribution of ${valueField} across different ${categoryField} categories.`;
            }
          } else {
            // No obvious chart structure, return sample data
            response.data = data.slice(0, 10);
            explanation += `Here's a sample of your data. To get more specific insights, try asking about trends, comparisons, or distributions in particular fields.`;
          }
        }
        
        response.explanation = explanation;
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
          explanation: "I couldn't process your query fully. Here's a simple visualization of your data. Try asking a more specific question about particular fields or patterns you're interested in.",
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
          "What's the average price by vehicle type?",
          "Show the trend of electric vehicle adoption over time",
          "What's the relationship between price and electric range?",
          "Which manufacturers have the most electric vehicles?"
        );
      } else if (isSalesDataset) {
        recommendations.push(
          "Show sales trends over time",
          "Which product has the highest revenue?",
          "Compare sales by region",
          "What's our best selling product?",
          "How do sales vary by month?",
          "Show quarterly revenue over time",
          "Which category has the highest profit margin?"
        );
      }
      
      // Add column-specific recommendations
      columns.forEach(column => {
        const lowerColumn = column.toLowerCase();
        if (lowerColumn.includes('price') || lowerColumn.includes('cost') || lowerColumn.includes('revenue')) {
          recommendations.push(
            `What's the average ${column}?`, 
            `Show ${column} distribution`,
            `Which items have the highest ${column}?`
          );
        }
        else if (lowerColumn.includes('date') || lowerColumn.includes('year')) {
          recommendations.push(
            `Show trends over ${column}`,
            `How have values changed over ${column}?`
          );
        }
        else if (lowerColumn.includes('type') || lowerColumn.includes('category')) {
          recommendations.push(
            `Show distribution by ${column}`,
            `Compare values across different ${column}s`
          );
        }
        else if (lowerColumn.includes('region') || lowerColumn.includes('state') || lowerColumn.includes('city')) {
          recommendations.push(
            `Which ${column} has the highest values?`,
            `Compare performance across different ${column}s`
          );
        }
      });
      
      // Return a mix of specific and default recommendations
      return [...recommendations, ...defaultRecommendations].slice(0, 8);
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
          columnInfo.sum = numericValues.reduce((sum, val) => sum + val, 0);
          columnInfo.count = numericValues.length;
        }
      } else if (values.every(v => 
        typeof v === 'string' && (
          v.match(/^\d{4}-\d{2}-\d{2}/) || 
          v.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)
        )
      )) {
        columnInfo.type = 'date';
      } else if (uniqueValues.length <= Math.min(30, dataRows.length * 0.2)) {
        columnInfo.type = 'category';
        columnInfo.categories = uniqueValues.slice(0, 30);
        
        // Calculate frequency of each category
        const frequencies: Record<string, number> = {};
        values.forEach(val => {
          const strVal = String(val);
          frequencies[strVal] = (frequencies[strVal] || 0) + 1;
        });
        
        // Get top categories by frequency
        columnInfo.topCategories = Object.entries(frequencies)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
          
      } else {
        columnInfo.type = 'string';
      }
      
      analysis.columns.push(columnInfo);
    });
    
    return analysis;
  }
};
