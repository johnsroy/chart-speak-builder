
/**
 * Utility functions for file operations
 */

/**
 * Format file size to human-readable string
 * @param bytes Size in bytes
 * @returns Formatted size string (e.g. "1.24 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Parse CSV text into an array of objects
 * @param text CSV text content
 * @param maxRows Optional maximum number of rows to parse
 * @returns Array of parsed objects
 */
export const parseCSV = async (text: string, maxRows?: number): Promise<any[]> => {
  try {
    // Simple CSV parser for direct data access
    // Split into lines
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/^"(.+)"$/, '$1'));
    
    // Parse rows (apply maxRows limit if provided)
    const dataLines = maxRows ? lines.slice(1, maxRows + 1) : lines.slice(1);
    
    return dataLines.map(line => {
      // Handle quoted values with commas inside them
      const values: string[] = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim().replace(/^"(.+)"$/, '$1'));
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue.trim().replace(/^"(.+)"$/, '$1'));
      
      // Create object from header and values
      const obj: Record<string, any> = {};
      header.forEach((key, i) => {
        const value = values[i] || '';
        
        // Try to convert to number if appropriate
        const numValue = Number(value);
        obj[key] = isNaN(numValue) ? value : numValue;
      });
      
      return obj;
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
};

/**
 * Generate sample data based on column schema
 * @param schema Column schema
 * @param count Number of rows to generate
 * @returns Array of sample data objects
 */
export const generateSampleData = (schema: Record<string, string>, count: number = 10): any[] => {
  try {
    const result = [];
    const columnNames = Object.keys(schema);
    
    // Generate fake data based on column types
    for (let i = 0; i < count; i++) {
      const row: Record<string, any> = {};
      
      columnNames.forEach(column => {
        const type = schema[column].toLowerCase();
        
        if (type.includes('int') || type.includes('number')) {
          row[column] = Math.floor(Math.random() * 100);
        } else if (type.includes('float') || type.includes('double') || type.includes('decimal')) {
          row[column] = Math.random() * 100;
        } else if (type.includes('bool')) {
          row[column] = Math.random() > 0.5;
        } else if (type.includes('date')) {
          const date = new Date();
          date.setDate(date.getDate() - Math.floor(Math.random() * 365));
          row[column] = date.toISOString().split('T')[0];
        } else {
          row[column] = `Sample ${column} ${i + 1}`;
        }
      });
      
      result.push(row);
    }
    
    return result;
  } catch (error) {
    console.error('Error generating sample data:', error);
    return [];
  }
};

/**
 * Get dataset name from file
 * @param file File object
 * @returns Generated dataset name
 */
export const getDatasetNameFromFile = (file: File): string => {
  // Remove file extension
  const nameParts = file.name.split('.');
  
  if (nameParts.length > 1) {
    // Remove the extension and use the rest
    return nameParts.slice(0, -1).join('.');
  }
  
  return file.name;
};
