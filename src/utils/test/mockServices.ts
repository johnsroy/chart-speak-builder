import { supabase } from '@/lib/supabase';
import { sampleSalesData, sampleAIResponses } from './sampleData';
import { QueryResult } from '@/services/queryService';

// Keep track of original functions so we can restore them
let originalFunctionsInvoke: any = null;

/**
 * Mock the Supabase function invocations for testing
 */
export function setupMockSupabaseFunctions() {
  // Save the original function for later restoration
  if (!originalFunctionsInvoke) {
    originalFunctionsInvoke = supabase.functions.invoke;
  }

  // Replace with mock function
  supabase.functions.invoke = async (functionName: string, options: any) => {
    console.log(`Mock invoking function: ${functionName}`, options);
    
    // Simulate the transform function
    if (functionName === 'transform') {
      const { query_type, dataset_id, query_text, query_config } = options.body;
      
      // For UI Builder queries
      if (query_type === 'ui_builder') {
        const chartType = query_config.chart_type;
        const measures = query_config.measures;
        const dimensions = query_config.dimensions;
        
        // Process based on dimensions and measures
        if (dimensions.length > 0 && measures.length > 0) {
          const dimensionField = dimensions[0].field;
          const measureField = measures[0].field;
          const aggregation = measures[0].aggregation;
          
          // Group and aggregate data
          const groups: Record<string, any> = {};
          
          sampleSalesData.forEach(item => {
            const key = item[dimensionField as keyof typeof item];
            if (!groups[key]) {
              groups[key] = {
                [dimensionField]: key,
                [`${aggregation}_${measureField}`]: 0,
                count: 0
              };
            }
            
            // Perform aggregation
            if (aggregation === 'sum') {
              groups[key][`${aggregation}_${measureField}`] += item[measureField as keyof typeof item];
            } else if (aggregation === 'count') {
              groups[key].count += 1;
            } else if (aggregation === 'avg') {
              groups[key][`${aggregation}_${measureField}`] += item[measureField as keyof typeof item];
              groups[key].count += 1;
            }
          });
          
          // Calculate averages if needed
          if (aggregation === 'avg') {
            Object.keys(groups).forEach(key => {
              groups[key][`${aggregation}_${measureField}`] /= groups[key].count;
              delete groups[key].count;
            });
          }
          
          // Convert to array
          const result = Object.values(groups);
          
          return {
            data: {
              data: result,
              columns: Object.keys(result[0])
            },
            error: null
          };
        } else {
          // Return raw data if no aggregation is specified
          return { 
            data: {
              data: sampleSalesData,
              columns: Object.keys(sampleSalesData[0])
            }, 
            error: null 
          };
        }
      } 
      // For natural language queries
      else if (query_type === 'natural_language') {
        // Return predefined sample response based on query text
        if (query_text.toLowerCase().includes('product category')) {
          return { 
            data: {
              data: sampleAIResponses.salesByCategory.data,
              columns: sampleAIResponses.salesByCategory.columns
            }, 
            error: null 
          };
        } else {
          return { 
            data: {
              data: sampleAIResponses.monthlySales.data,
              columns: sampleAIResponses.monthlySales.columns
            }, 
            error: null 
          };
        }
      }
    }
    
    // Simulate the ai-query function
    else if (functionName === 'ai-query') {
      const { query, dataset_id } = options.body;
      
      // Return predefined sample response based on query text
      if (query.toLowerCase().includes('product category')) {
        return { data: sampleAIResponses.salesByCategory, error: null };
      } else {
        return { data: sampleAIResponses.monthlySales, error: null };
      }
    }

    // Default fallback
    return { 
      data: { 
        data: sampleSalesData,
        columns: Object.keys(sampleSalesData[0])
      }, 
      error: null 
    };
  };
}

/**
 * Restore the original Supabase functions
 */
export function restoreMockSupabaseFunctions() {
  if (originalFunctionsInvoke) {
    supabase.functions.invoke = originalFunctionsInvoke;
    originalFunctionsInvoke = null;
  }
}

/**
 * Test data query functions
 */
export async function testDataQuery(queryType: string): Promise<QueryResult> {
  // Check if we need to mock the functions
  const isMockActive = !originalFunctionsInvoke;
  if (!isMockActive) {
    setupMockSupabaseFunctions();
  }
  
  // Import services dynamically to prevent circular dependencies
  const { queryService } = await import('@/services/queryService');
  const { sampleQueries } = await import('./sampleData');
  
  let result: QueryResult;
  
  try {
    // Select the appropriate sample query
    const query = sampleQueries[queryType];
    if (!query) {
      throw new Error(`Unknown query type: ${queryType}`);
    }
    
    // Execute the query
    result = await queryService.executeQuery(query);
    console.log(`Test query result (${queryType}):`, result);
  } catch (error) {
    console.error(`Test query error (${queryType}):`, error);
    result = {
      query: "Test query",
      explanation: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      chartType: 'bar',
      data: [],
      columns: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    // If we set up the mock in this function, restore it
    if (!isMockActive) {
      restoreMockSupabaseFunctions();
    }
  }
  
  return result;
}

/**
 * Test NLP query functions
 */
export async function testNLPQuery(queryText: string): Promise<QueryResult> {
  // Check if we need to mock the functions
  const isMockActive = !originalFunctionsInvoke;
  if (!isMockActive) {
    setupMockSupabaseFunctions();
  }
  
  // Import services dynamically to prevent circular dependencies
  const { queryService } = await import('@/services/queryService');
  const { sampleDataset } = await import('./sampleData');
  
  let result: QueryResult;
  
  try {
    // Process the natural language query
    result = await queryService.processQuery(queryText, sampleDataset.id);
    console.log(`Test NLP query result (${queryText}):`, result);
  } catch (error) {
    console.error(`Test NLP query error (${queryText}):`, error);
    result = {
      query: queryText,
      explanation: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      chartType: 'bar',
      data: [],
      columns: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    // If we set up the mock in this function, restore it
    if (!isMockActive) {
      restoreMockSupabaseFunctions();
    }
  }
  
  return result;
}
