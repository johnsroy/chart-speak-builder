
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
 * Enhanced color palettes for beautiful data visualization
 */
export const COLOR_PALETTES = {
  // Modern vibrant palette
  vibrant: [
    '#8B5CF6', // Main purple
    '#0EA5E9', // Sky blue
    '#F97316', // Orange
    '#22C55E', // Green
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#06B6D4', // Teal
    '#D946EF', // Fuchsia
    '#3B82F6', // Blue
    '#EC4899'  // Pink
  ],
  
  // Pastel colors
  pastel: [
    '#C7D2FE', // Indigo
    '#BFDBFE', // Blue
    '#A7F3D0', // Green
    '#FEE2E2', // Red
    '#FDE68A', // Yellow
    '#DDD6FE', // Purple
    '#FBCFE8', // Pink
    '#BAE6FD', // Light blue
    '#E5E7EB', // Gray
    '#FED7AA'  // Orange
  ],
  
  // Deep rich colors for dark mode
  rich: [
    '#7C3AED', // Deep purple
    '#2563EB', // Royal blue
    '#059669', // Emerald
    '#DC2626', // Deep red
    '#D97706', // Deep amber
    '#7C2D12', // Chocolate
    '#4F46E5', // Indigo
    '#BE123C', // Rose
    '#0369A1', // Deep sky blue
    '#15803D'  // Deep green
  ],
  
  // Gradient-friendly
  gradient: [
    '#0088FE', // Blue
    '#00C49F', // Teal
    '#FFBB28', // Yellow
    '#FF8042', // Orange
    '#8884d8', // Purple
    '#82ca9d', // Light green
    '#a4de6c', // Lime green
    '#d0ed57', // Yellow green
    '#ffc658', // Gold
    '#8dd1e1'  // Sky blue
  ],
  
  // Professional palette for business data
  professional: [
    '#4E79A7', // Blue
    '#F28E2B', // Orange
    '#E15759', // Red
    '#76B7B2', // Teal
    '#59A14F', // Green
    '#EDC948', // Yellow
    '#B07AA1', // Purple
    '#FF9DA7', // Pink
    '#9C755F', // Brown
    '#BAB0AC'  // Gray
  ]
};

/**
 * Generates chart colors with better aesthetics
 */
export const generateChartColors = (count: number, paletteName: keyof typeof COLOR_PALETTES = 'professional') => {
  const palette = COLOR_PALETTES[paletteName] || COLOR_PALETTES.professional;
  
  if (count <= palette.length) {
    return palette.slice(0, count);
  }
  
  // Generate additional colors by cycling through the palette
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(palette[i % palette.length]);
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
 * Creates chart-specific gradient definitions for SVG charts
 */
export const createChartGradients = (chartId: string, colors: string[] = COLOR_PALETTES.professional) => {
  return colors.map((color, index) => ({
    id: `gradient-${chartId}-${index}`,
    color,
    gradientStops: [
      { offset: '5%', stopColor: color, stopOpacity: 0.8 },
      { offset: '95%', stopColor: color, stopOpacity: 0.3 },
    ]
  }));
};

/**
 * Generate transparent color variants for overlays and highlights
 */
export const getTransparentColor = (color: string, opacity: number = 0.2): string => {
  // For hex colors
  if (color.startsWith('#')) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  // For rgb/rgba colors
  if (color.startsWith('rgb')) {
    if (color.startsWith('rgba')) {
      // Replace existing opacity
      return color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d\.]+\)/, `rgba($1, $2, $3, ${opacity})`);
    }
    // Convert rgb to rgba
    return color.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/, `rgba($1, $2, $3, ${opacity})`);
  }
  
  return color;
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
    field => /date|time|year/i.test(field)
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

/**
 * Formats number values for display in charts
 */
export const formatChartValue = (value: number): string => {
  if (typeof value !== 'number') return String(value);
  
  // For large numbers, use K, M, B suffixes
  if (Math.abs(value) >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1) + 'B';
  }
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(1) + 'K';
  }
  
  // For decimals, limit to 2 decimal places
  if (Math.floor(value) !== value) {
    return value.toFixed(2);
  }
  
  return value.toString();
};

/**
 * Formats percentage values for display
 */
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return percentage < 0.1 ? '<0.1%' : percentage.toFixed(1) + '%';
};

/**
 * Determines appropriate tick counts for axes based on container size
 */
export const getOptimalTickCount = (width: number, height: number): { xTicks: number, yTicks: number } => {
  // Base tick counts on available space
  const xTicks = Math.max(2, Math.min(10, Math.floor(width / 100)));
  const yTicks = Math.max(2, Math.min(10, Math.floor(height / 50)));
  
  return { xTicks, yTicks };
};
