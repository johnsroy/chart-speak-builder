import { supabase } from '@/lib/supabase';
import { chartData, nlpResponses, sampleQueries } from './sampleData';
import { QueryResult } from '@/services/types/queryTypes'; 

// Store the original supabase client functions to restore later
const originalSupabaseFunctions = {
  invoke: supabase.functions.invoke
};

// Setup mock Supabase functions
export const setupMockSupabaseFunctions = () => {
  (supabase.functions as any).invoke = mockSupabaseClient.functions.invoke;
};

// Restore original Supabase functions
export const restoreMockSupabaseFunctions = () => {
  (supabase.functions as any).invoke = originalSupabaseFunctions.invoke;
};

// Test data query function
export const testDataQuery = async (queryType: string): Promise<QueryResult> => {
  switch (queryType) {
    case 'barChart':
      return mockSupabaseClient.functions.invoke('transform', {
        body: { query: sampleQueries.barChart.query_config }
      }).then((response) => ({
        chart_type: 'bar',
        x_axis: 'month',
        y_axis: 'sales',
        chart_title: 'Monthly Sales',
        data: response.data,
        columns: ['month', 'sales']
      }));
    case 'pieChart':
      return mockSupabaseClient.functions.invoke('transform', {
        body: { query: sampleQueries.pieChart.query_config }
      }).then((response) => ({
        chart_type: 'pie',
        x_axis: 'region',
        y_axis: 'sales',
        chart_title: 'Sales by Region',
        data: response.data,
        columns: ['region', 'sales']
      }));
    case 'lineChart':
      return mockSupabaseClient.functions.invoke('transform', {
        body: { query: sampleQueries.lineChart.query_config }
      }).then((response) => ({
        chart_type: 'line',
        x_axis: 'month',
        y_axis: 'customers',
        chart_title: 'Customer Trends',
        data: response.data,
        columns: ['month', 'customers']
      }));
    default:
      throw new Error('Invalid query type');
  }
};

// Test NLP query function
export const testNLPQuery = async (query: string): Promise<QueryResult> => {
  return mockSupabaseClient.functions.invoke('ai-query', {
    body: { query }
  }).then((response) => response.data);
};

// Existing mockSupabaseClient implementation remains the same
export const mockSupabaseClient = {
  from: () => ({
    select: () => ({
      eq: () => ({
        data: [],
        error: null
      })
    }),
    insert: () => ({
      select: () => ({
        single: () => ({
          data: { id: 'mock-id' },
          error: null
        })
      })
    })
  }),
  storage: {
    from: () => ({
      upload: () => ({ data: { path: 'mock-path' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: 'https://example.com/mock-image.jpg' } })
    })
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null })
  },
  functions: {
    invoke: (functionName: string, options?: any) => {
      if (functionName === 'transform') {
        return Promise.resolve({
          data: chartData,
          error: null
        });
      } else if (functionName === 'ai-query') {
        const query = options?.body?.query?.toLowerCase() || '';
        
        if (query.includes('sales')) {
          return Promise.resolve({
            data: nlpResponses.sales,
            error: null
          });
        } else if (query.includes('product')) {
          return Promise.resolve({
            data: nlpResponses.products,
            error: null
          });
        } else if (query.includes('region') || query.includes('country')) {
          return Promise.resolve({
            data: nlpResponses.regions,
            error: null
          });
        } else if (query.includes('time') || query.includes('trend')) {
          return Promise.resolve({
            data: nlpResponses.timeSeries,
            error: null
          });
        }
        
        // Default response
        return Promise.resolve({
          data: nlpResponses.default,
          error: null
        });
      }
      
      // Generic error for unhandled function names
      return Promise.resolve({
        data: null,
        error: { message: `Mock function ${functionName} not implemented` }
      });
    }
  }
};

// Mock implementation for processNLQuery
export const mockProcessNLQuery = async (datasetId: string, query: string): Promise<QueryResult> => {
  // Use the mock responses based on keywords in the query
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('sales')) {
    return nlpResponses.sales;
  } else if (lowerQuery.includes('product')) {
    return nlpResponses.products;
  } else if (lowerQuery.includes('region') || lowerQuery.includes('country')) {
    return nlpResponses.regions;
  } else if (lowerQuery.includes('time') || lowerQuery.includes('trend')) {
    return nlpResponses.timeSeries;
  }
  
  // Default response
  return nlpResponses.default;
};
