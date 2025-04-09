
/**
 * Parse a CSV string into an array of objects
 * @param csvText The CSV text to parse
 * @param maxRows Maximum number of rows to parse
 * @returns Array of objects representing the CSV data
 */
export const parseCSV = async (csvText: string, maxRows: number = 10000): Promise<any[]> => {
  try {
    if (!csvText) return [];
    
    const lines = csvText.split('\n');
    if (lines.length < 2) return []; // Need at least header + 1 row
    
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    
    // Process rows up to maxRows limit
    const rowsToProcess = Math.min(lines.length, maxRows + 1); // +1 for header
    
    for (let i = 1; i < rowsToProcess; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle potential quoted values with commas inside
      let values: string[] = [];
      let currentValue = '';
      let inQuotes = false;
      
      // Simple CSV parser that handles quoted values
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue);
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      
      // Add the last value
      values.push(currentValue);
      
      // If simple split works better (no quotes), use that instead
      if (values.length !== headers.length) {
        values = line.split(',');
      }
      
      const row: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        if (header && index < values.length) {
          const value = values[index].trim().replace(/^"(.*)"$/, '$1'); // Remove quotes if present
          
          // Try to convert to appropriate type
          if (value === '') {
            row[header] = null;
          } else if (!isNaN(Number(value))) {
            row[header] = Number(value);
          } else if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
            row[header] = value.toLowerCase() === 'true';
          } else {
            row[header] = value;
          }
        } else if (header) {
          row[header] = null; // Ensure all headers have values
        }
      });
      
      result.push(row);
    }
    
    return result;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    return [];
  }
};

/**
 * Format a byte size to a human readable format
 * @param bytes Size in bytes
 * @returns Formatted size string (e.g. "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
