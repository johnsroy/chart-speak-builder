
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { Dataset } from './dataService';

export interface QueryConfig {
  dataset_id: string;
  chart_type: string;
  measures: Array<{
    field: string;
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  }>;
  dimensions: Array<{
    field: string;
  }>;
  filters?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
    value: any;
  }>;
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
}

export interface Query {
  id?: string;
  name: string;
  dataset_id: string;
  query_type: 'sql' | 'natural_language' | 'ui_builder';
  query_text: string;
  query_config: QueryConfig;
}

export interface QueryResult {
  data: any[];
  columns: string[];
  error?: string;
}

export const queryService = {
  // Execute a query against a dataset
  async executeQuery(query: Query): Promise<QueryResult> {
    try {
      const { dataset_id, query_type, query_text, query_config } = query;
      
      // Retrieve the dataset first
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', dataset_id)
        .single();
        
      if (datasetError) throw datasetError;
      
      // Get the file from storage
      const { data: fileData, error: fileError } = await supabase.storage
        .from('datasets')
        .download(dataset.storage_path);
        
      if (fileError) throw fileError;
      
      // Parse the CSV file
      const text = await fileData.text();
      const parseResult = Papa.parse(text, { header: true });
      const data = parseResult.data as any[];
      
      // Execute the query based on the query type
      if (query_type === 'sql') {
        // For MVP, we're not actually executing SQL directly
        // Instead, we're simulating it by filtering the data in memory
        return this._processDataWithConfig(data, query_config);
      } 
      else if (query_type === 'natural_language') {
        // For MVP, we convert natural language to a query config using basic rules
        // In a real implementation, this would call an AI service
        const generatedConfig = this._convertNLToQueryConfig(query_text, dataset);
        return this._processDataWithConfig(data, generatedConfig);
      }
      else if (query_type === 'ui_builder') {
        // UI builder sends a structured query_config directly
        return this._processDataWithConfig(data, query_config);
      }
      
      throw new Error('Unsupported query type');
    } catch (error) {
      console.error('Error executing query:', error);
      return {
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'Failed to execute query'
      };
    }
  },
  
  // Save a query
  async saveQuery(query: Query): Promise<Query> {
    try {
      const user = await supabase.auth.getUser();
      
      if (!user.data.user) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase
        .from('queries')
        .insert({
          user_id: user.data.user.id,
          dataset_id: query.dataset_id,
          name: query.name,
          query_type: query.query_type,
          query_text: query.query_text,
          query_config: query.query_config
        })
        .select()
        .single();
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving query:', error);
      throw error;
    }
  },
  
  // Get queries for a dataset
  async getQueriesForDataset(datasetId: string): Promise<Query[]> {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching queries for dataset ${datasetId}:`, error);
      throw error;
    }
  },
  
  // Delete a query
  async deleteQuery(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('queries')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    } catch (error) {
      console.error(`Error deleting query ${id}:`, error);
      throw error;
    }
  },
  
  // Internal method to process data based on query config
  _processDataWithConfig(data: any[], config: QueryConfig): QueryResult {
    try {
      let processedData = [...data];
      
      // Apply filters
      if (config.filters && config.filters.length > 0) {
        processedData = processedData.filter(row => {
          return config.filters!.every(filter => {
            const value = row[filter.field];
            switch (filter.operator) {
              case 'eq': return value === filter.value;
              case 'neq': return value !== filter.value;
              case 'gt': return Number(value) > Number(filter.value);
              case 'lt': return Number(value) < Number(filter.value);
              case 'gte': return Number(value) >= Number(filter.value);
              case 'lte': return Number(value) <= Number(filter.value);
              case 'contains': return String(value).includes(String(filter.value));
              case 'not_contains': return !String(value).includes(String(filter.value));
              default: return true;
            }
          });
        });
      }
      
      // Group by dimensions and aggregate measures
      if (config.dimensions && config.dimensions.length > 0) {
        const groupedData = new Map();
        
        processedData.forEach(row => {
          // Create a key based on the dimension values
          const dimensionKey = config.dimensions.map(dim => row[dim.field]).join('|');
          
          if (!groupedData.has(dimensionKey)) {
            const newGroup = {
              // Add dimension fields
              ...config.dimensions.reduce((obj, dim) => ({
                ...obj,
                [dim.field]: row[dim.field]
              }), {}),
              // Initialize measure fields
              ...config.measures.reduce((obj, measure) => ({
                ...obj,
                [`${measure.aggregation}_${measure.field}`]: measure.aggregation === 'count' ? 1 : Number(row[measure.field]) || 0,
                [`${measure.field}_values`]: measure.aggregation === 'count' ? [1] : [Number(row[measure.field]) || 0]
              }), {})
            };
            groupedData.set(dimensionKey, newGroup);
          } else {
            const group = groupedData.get(dimensionKey);
            
            // Update measures
            config.measures.forEach(measure => {
              const value = measure.aggregation === 'count' ? 1 : Number(row[measure.field]) || 0;
              group[`${measure.field}_values`].push(value);
              
              if (measure.aggregation === 'count') {
                group[`${measure.aggregation}_${measure.field}`] += 1;
              } else if (measure.aggregation === 'sum') {
                group[`${measure.aggregation}_${measure.field}`] += value;
              }
              // We'll calculate avg, min, max after all data is processed
            });
          }
        });
        
        // Calculate final aggregations
        for (const group of groupedData.values()) {
          config.measures.forEach(measure => {
            const values = group[`${measure.field}_values`];
            if (measure.aggregation === 'avg') {
              group[`${measure.aggregation}_${measure.field}`] = values.reduce((sum, val) => sum + val, 0) / values.length;
            } else if (measure.aggregation === 'min') {
              group[`${measure.aggregation}_${measure.field}`] = Math.min(...values);
            } else if (measure.aggregation === 'max') {
              group[`${measure.aggregation}_${measure.field}`] = Math.max(...values);
            }
            
            // Remove temporary values array
            delete group[`${measure.field}_values`];
          });
        }
        
        processedData = Array.from(groupedData.values());
      }
      
      // Apply sorting
      if (config.sort && config.sort.length > 0) {
        processedData.sort((a, b) => {
          for (const sort of config.sort!) {
            const fieldA = a[sort.field];
            const fieldB = b[sort.field];
            
            if (fieldA < fieldB) return sort.direction === 'asc' ? -1 : 1;
            if (fieldA > fieldB) return sort.direction === 'asc' ? 1 : -1;
          }
          return 0;
        });
      }
      
      // Apply limit
      if (config.limit) {
        processedData = processedData.slice(0, config.limit);
      }
      
      // Determine columns (all unique keys from the result data)
      const columnSet = new Set<string>();
      processedData.forEach(row => {
        Object.keys(row).forEach(key => columnSet.add(key));
      });
      
      return {
        data: processedData,
        columns: Array.from(columnSet)
      };
    } catch (error) {
      console.error('Error processing data with config:', error);
      return {
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'Failed to process data'
      };
    }
  },
  
  // Simple NL to query config conversion for MVP
  _convertNLToQueryConfig(nlQuery: string, dataset: Dataset): QueryConfig {
    // For MVP, this is a very simplified implementation
    // In a real app, this would be a much more sophisticated NLP/AI service
    
    // Default config
    const config: QueryConfig = {
      dataset_id: dataset.id,
      chart_type: 'bar',
      measures: [],
      dimensions: []
    };
    
    // Extract column names from dataset schema
    const columns = Object.keys(dataset.column_schema);
    
    // Simple keyword detection
    const nlQueryLower = nlQuery.toLowerCase();
    
    // Detect dimensions (typically categorical data)
    const dimensionKeywords = ['by', 'group by', 'grouped by', 'broken down by', 'split by'];
    for (const column of columns) {
      const columnLower = column.toLowerCase();
      
      // Check if column is mentioned in context of a dimension
      for (const keyword of dimensionKeywords) {
        if (nlQueryLower.includes(`${keyword} ${columnLower}`)) {
          config.dimensions.push({ field: column });
          break;
        }
      }
      
      // If no explicit dimension context but the column is mentioned
      // and the schema says it's a string/category, make it a dimension
      if (
        config.dimensions.length === 0 && 
        nlQueryLower.includes(columnLower) && 
        (dataset.column_schema[column] === 'string' || dataset.column_schema[column] === 'date')
      ) {
        config.dimensions.push({ field: column });
      }
    }
    
    // Detect measures (typically numeric data)
    const aggregationKeywords = {
      'sum': ['sum', 'total', 'add'],
      'avg': ['average', 'mean', 'avg'],
      'min': ['min', 'minimum', 'lowest'],
      'max': ['max', 'maximum', 'highest'],
      'count': ['count', 'number of', 'how many']
    };
    
    for (const column of columns) {
      const columnLower = column.toLowerCase();
      
      // Only consider numeric fields for measures (except count which works on any field)
      if (dataset.column_schema[column] === 'number' || dataset.column_schema[column] === 'integer') {
        let aggregationType = null;
        
        // Check which aggregation is mentioned for this column
        for (const [agg, keywords] of Object.entries(aggregationKeywords)) {
          for (const keyword of keywords) {
            if (nlQueryLower.includes(`${keyword} ${columnLower}`)) {
              aggregationType = agg;
              break;
            }
          }
          if (aggregationType) break;
        }
        
        // If column is mentioned but no specific aggregation, default to sum
        if (!aggregationType && nlQueryLower.includes(columnLower)) {
          aggregationType = 'sum';
        }
        
        if (aggregationType) {
          config.measures.push({
            field: column,
            aggregation: aggregationType as 'sum' | 'avg' | 'min' | 'max' | 'count'
          });
        }
      }
    }
    
    // If no measures detected, try to find any numeric column for count
    if (config.measures.length === 0) {
      for (const column of columns) {
        if (nlQueryLower.includes('count') || nlQueryLower.includes('how many')) {
          config.measures.push({ field: column, aggregation: 'count' });
          break;
        }
      }
    }
    
    // If still no measures, use the first numeric column as sum
    if (config.measures.length === 0) {
      for (const column of columns) {
        if (dataset.column_schema[column] === 'number' || dataset.column_schema[column] === 'integer') {
          config.measures.push({ field: column, aggregation: 'sum' });
          break;
        }
      }
    }
    
    // Detect chart type
    const chartTypeKeywords = {
      'bar': ['bar chart', 'bar graph', 'bars'],
      'line': ['line chart', 'line graph', 'trend', 'over time'],
      'pie': ['pie chart', 'pie graph', 'percentage', 'proportion'],
      'scatter': ['scatter plot', 'scatter chart', 'correlation']
    };
    
    for (const [chartType, keywords] of Object.entries(chartTypeKeywords)) {
      for (const keyword of keywords) {
        if (nlQueryLower.includes(keyword)) {
          config.chart_type = chartType;
          break;
        }
      }
    }
    
    return config;
  }
};
