
/**
 * Utility functions for file operations
 */

/**
 * Format file size
 * @param bytes Size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Parse CSV text
 * @param text CSV text
 * @returns Parsed CSV data
 */
export function parseCSV(text: string): any[] {
  const rows = text.split('\n');
  if (rows.length === 0) return [];
  
  const headers = parseCSVRow(rows[0]);
  const result = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i].trim()) continue;
    
    const values = parseCSVRow(rows[i]);
    if (values.length !== headers.length) continue;
    
    const obj: Record<string, any> = {};
    headers.forEach((header, index) => {
      const value = values[index];
      
      if (value === '' || value === 'null') {
        obj[header] = null;
      } else if (!isNaN(Number(value))) {
        obj[header] = Number(value);
      } else if (value === 'true') {
        obj[header] = true;
      } else if (value === 'false') {
        obj[header] = false;
      } else {
        obj[header] = value;
      }
    });
    
    result.push(obj);
  }
  
  return result;
}

/**
 * Parse a CSV row, handling quotes correctly
 * @param row CSV row
 * @returns Array of cell values
 */
export function parseCSVRow(row: string): string[] {
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

/**
 * Generate sample data based on schema
 * @param schema Column schema
 * @param count Number of rows to generate
 * @returns Generated data
 */
export function generateSampleData(schema: Record<string, string>, count: number): any[] {
  const result = [];
  const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
  const products = ['Product X', 'Product Y', 'Product Z'];
  const regions = ['North', 'South', 'East', 'West'];
  
  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};
    
    for (const [key, type] of Object.entries(schema)) {
      if (type === 'number') {
        row[key] = Math.floor(Math.random() * 1000);
      } else if (type === 'boolean') {
        row[key] = Math.random() > 0.5;
      } else if (type === 'date') {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 365));
        row[key] = date.toISOString().split('T')[0];
      } else if (key.toLowerCase().includes('category')) {
        row[key] = categories[i % categories.length];
      } else if (key.toLowerCase().includes('product')) {
        row[key] = products[i % products.length];
      } else if (key.toLowerCase().includes('region')) {
        row[key] = regions[i % regions.length];
      } else {
        row[key] = `Value ${i + 1}`;
      }
    }
    
    result.push(row);
  }
  
  return result;
}
