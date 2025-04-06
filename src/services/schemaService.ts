
import { supabase } from '@/lib/supabase';

/**
 * Service for schema inference operations
 */
export const schemaService = {
  /**
   * Infer schema from CSV file
   * @param file CSV file
   * @returns Promise resolving to schema and row count
   */
  inferSchemaFromCSV: async (file: File): Promise<{schema: Record<string, string>, rowCount: number}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const rows = text.split('\n');
          const headers = rows[0].split(',').map(h => h.trim());
          const schema: Record<string, string> = {};
          
          // Use a few rows to infer types
          const sampleRowCount = Math.min(20, rows.length - 1);
          const sampleRows = rows.slice(1, 1 + sampleRowCount)
            .filter(row => row.trim().length > 0);
          
          headers.forEach((header, i) => {
            const values = sampleRows
              .map(row => {
                const cells = parseCSVRow(row);
                return cells[i];
              })
              .filter(val => val !== undefined && val !== null && val !== '');
            
            // Determine type based on sample values
            let type = 'string';
            
            if (values.every(val => !isNaN(Number(val)))) {
              type = 'number';
            } else if (values.every(val => val === 'true' || val === 'false')) {
              type = 'boolean';
            } else if (values.every(val => !isNaN(Date.parse(val)))) {
              type = 'date';
            }
            
            schema[header] = type;
          });
          
          resolve({ 
            schema, 
            rowCount: rows.length - 1 
          });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  },

  /**
   * Infer schema from JSON file
   * @param file JSON file
   * @returns Promise resolving to schema and row count
   */
  inferSchemaFromJSON: async (file: File): Promise<{schema: Record<string, string>, rowCount: number}> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const json = JSON.parse(text);
          const data = Array.isArray(json) ? json : [json];
          const schema: Record<string, string> = {};
          
          if (data.length === 0) {
            resolve({ schema: {}, rowCount: 0 });
            return;
          }
          
          // Use first object to determine schema
          const firstObj = data[0];
          
          for (const key in firstObj) {
            const value = firstObj[key];
            let type = 'string';
            
            if (typeof value === 'number') {
              type = 'number';
            } else if (typeof value === 'boolean') {
              type = 'boolean';
            } else if (
              typeof value === 'string' && 
              !isNaN(Date.parse(value)) &&
              String(value).match(/^\d{4}-\d{2}-\d{2}/)
            ) {
              type = 'date';
            } else if (typeof value === 'object' && value !== null) {
              type = 'object';
            }
            
            schema[key] = type;
          }
          
          resolve({ schema, rowCount: data.length });
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  },

  /**
   * Preview a dataset schema
   * @param file File to infer schema from
   * @returns Promise resolving to inferred schema
   */
  previewSchemaInference: async (file: File) => {
    try {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const result = await schemaService.inferSchemaFromCSV(file);
        return result.schema;
      } else if (file.name.endsWith('.json')) {
        const result = await schemaService.inferSchemaFromJSON(file);
        return result.schema;
      }
      
      return {};
    } catch (error) {
      console.error('Error previewing schema:', error);
      return {};
    }
  }
};

/**
 * Parse a CSV row, handling quotes correctly
 * @param row CSV row
 * @returns Array of cell values
 */
function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentCell = '';
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (i + 1 < row.length && row[i + 1] === '"') {
        // Handle escaped quotes
        currentCell += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of cell
      result.push(currentCell.trim());
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  // Don't forget the last cell
  result.push(currentCell.trim());
  return result;
}
