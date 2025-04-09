
/**
 * Parses CSV text content into an array of objects
 * @param text CSV text content
 * @param maxRows Maximum number of rows to parse (default: 10000)
 * @returns Array of objects with headers as keys
 */
export const parseCSV = async (text: string, maxRows: number = 10000): Promise<any[]> => {
  try {
    const lines = text.split('\n');
    if (lines.length < 2) {
      return [];
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];
    
    // Process rows up to the maximum
    const rowsToProcess = Math.min(lines.length, maxRows + 1); // +1 to account for header
    
    for (let i = 1; i < rowsToProcess; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing - doesn't handle quoted fields with commas
      const values = line.split(',');
      const row: Record<string, any> = {};
      
      headers.forEach((header, index) => {
        if (!header) return; // Skip empty headers
        
        const value = values[index]?.trim() || '';
        
        // Try to convert numeric values
        if (!isNaN(Number(value)) && value !== '') {
          row[header] = Number(value);
        } else {
          row[header] = value;
        }
      });
      
      result.push(row);
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    throw error;
  }
};

/**
 * Extract dataset name from filename
 * @param fileName Name of the file
 * @returns Clean dataset name
 */
export const extractDatasetNameFromFileName = (fileName: string): string => {
  if (!fileName) return '';
  
  // Remove extension
  const namePart = fileName.split('.').slice(0, -1).join('.');
  
  // Replace underscores with spaces and capitalize words
  return namePart
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};
