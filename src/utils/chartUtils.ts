import { supabase } from '@/lib/supabase';
import { Dataset } from '@/services/types/datasetTypes';

/**
 * Determines if a field is suitable for a numeric axis
 */
export const isNumericField = (fieldName: string, dataset: Dataset): boolean => {
  if (!dataset || !dataset.column_schema) return false;
  const fieldType = dataset.column_schema[fieldName];
  return fieldType === 'number' || fieldType === 'integer';
};

/**
 * Determines if a field is suitable for a categorical axis
 */
export const isCategoricalField = (fieldName: string, dataset: Dataset): boolean => {
  if (!dataset || !dataset.column_schema) return false;
  const fieldType = dataset.column_schema[fieldName];
  return fieldType === 'string' || fieldType === 'date';
};

/**
 * Gets suitable field options for chart axes based on the dataset schema
 */
export const getFieldOptions = (dataset: any) => {
  if (!dataset || !dataset.column_schema) {
    return {
      categoryFields: [],
      numericFields: [],
    };
  }

  const categoryFields: string[] = [];
  const numericFields: string[] = [];

  Object.entries(dataset.column_schema).forEach(([field, type]) => {
    if (type === 'string' || type === 'date') {
      categoryFields.push(field);
    }
    if (type === 'number' || type === 'integer') {
      numericFields.push(field);
    }
  });

  return {
    categoryFields,
    numericFields,
  };
};

/**
 * Processes data for charting by ensuring proper types
 */
export const processChartData = (data: any[], xField: string, yField: string) => {
  return data.map(item => ({
    ...item,
    [yField]: typeof item[yField] === 'string' ? parseFloat(item[yField]) || 0 : item[yField]
  })).filter(item => item[xField] !== null && item[xField] !== undefined);
};

/**
 * Beautiful color palettes for data visualization
 */
export const COLOR_PALETTES = {
  // Purple-focused
  purple: ['#9b87f5', '#7E69AB', '#6E59A5', '#D6BCFA', '#E5DEFF', '#8B5CF6', '#A78BFA', '#C4B5FD'],
  
  // Vibrant colors
  vibrant: ['#F97316', '#8B5CF6', '#0EA5E9', '#22C55E', '#EF4444', '#F59E0B', '#06B6D4', '#D946EF'],
  
  // Pastel colors
  pastel: ['#FEC6A1', '#FEF7CD', '#F2FCE2', '#D3E4FD', '#FFDEE2', '#FDE1D3', '#E5DEFF', '#C8C8C9'],
  
  // Gradient-friendly
  gradient: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'],
  
  // Dark mode friendly
  dark: ['#1A1F2C', '#403E43', '#221F26', '#333333', '#555555', '#8A898C', '#C8C8C9', '#9F9EA1']
};

/**
 * Generates chart colors with better aesthetics
 */
export const generateChartColors = (count: number, paletteName: keyof typeof COLOR_PALETTES = 'vibrant') => {
  const palette = COLOR_PALETTES[paletteName] || COLOR_PALETTES.vibrant;
  
  if (count <= palette.length) {
    return palette.slice(0, count);
  }
  
  // Generate additional colors if needed
  const colors = [...palette];
  for (let i = palette.length; i < count; i++) {
    const hue = (i * 137.5) % 360; // golden ratio approximation for better distribution
    const saturation = 65 + (i % 3) * 5; // vary saturation slightly
    const lightness = 45 + (i % 5) * 5; // vary lightness slightly
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  return colors;
};

/**
 * Create a gradient set for beautiful charts
 */
export const createGradientColors = (baseColor: string, count: number = 5) => {
  // Convert hex to HSL for easier manipulation
  const hexToHSL = (hex: string): {h: number, s: number, l: number} => {
    let r = 0, g = 0, b = 0;
    
    // 3 digits
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } 
    // 6 digits
    else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    
    // Convert RGB to HSL
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    return { h: h * 360, s: s * 100, l: l * 100 };
  };
  
  // Create gradient by varying lightness and saturation
  const hsl = hexToHSL(baseColor);
  const colors = [];
  
  for (let i = 0; i < count; i++) {
    const newL = Math.min(85, Math.max(25, hsl.l + (i - Math.floor(count/2)) * 10));
    const newS = Math.min(100, Math.max(20, hsl.s + (i - Math.floor(count/2)) * 5));
    colors.push(`hsl(${hsl.h}, ${newS}%, ${newL}%)`);
  }
  
  return colors;
};

/**
 * Extracts a dataset name from file name
 */
export const extractDatasetNameFromFileName = (fileName: string): string => {
  // Remove file extension
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  // Replace underscores with spaces
  return withoutExtension.replace(/_/g, " ");
};

/**
 * Gets a date field from a dataset if available
 */
export const findDateField = (dataset: any): string | null => {
  if (!dataset?.column_schema) return null;
  
  // Look for fields with 'date' in the name
  const dateNameFields = Object.keys(dataset.column_schema).filter(
    field => /date|time/i.test(field)
  );
  
  if (dateNameFields.length > 0) return dateNameFields[0];
  
  // Look for fields with date type
  const dateTypeFields = Object.entries(dataset.column_schema)
    .filter(([_, type]) => type === 'date')
    .map(([field]) => field);
    
  if (dateTypeFields.length > 0) return dateTypeFields[0];
  
  return null;
};

/**
 * Determines if dataset contains time series data
 */
export const isTimeSeriesData = (dataset: any): boolean => {
  return !!findDateField(dataset);
};
