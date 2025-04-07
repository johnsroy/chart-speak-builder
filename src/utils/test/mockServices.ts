
import { supabase } from '@/lib/supabase';
import { chartData, nlpResponses } from './sampleData';
import { QueryResult } from '@/services/types/queryTypes'; 

// Create a mock of the supabase client for testing purposes
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
    // Fixed type by making it compatible with FunctionsResponse
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
