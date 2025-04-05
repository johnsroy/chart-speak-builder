
import { Dataset } from '@/services/dataService';

/**
 * Determines if a field is suitable for a numeric axis
 */
export const isNumericField = (fieldName: string, dataset: Dataset): boolean => {
  const fieldType = dataset.column_schema[fieldName];
  return fieldType === 'number' || fieldType === 'integer';
};

/**
 * Determines if a field is suitable for a categorical axis
 */
export const isCategoricalField = (fieldName: string, dataset: Dataset): boolean => {
  const fieldType = dataset.column_schema[fieldName];
  return fieldType === 'string' || fieldType === 'date';
};

/**
 * Gets suitable field options for chart axes based on the dataset schema
 */
export const getFieldOptions = (dataset: Dataset) => {
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
 * Generates chart colors
 */
export const generateChartColors = (count: number) => {
  const baseColors = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
    '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'
  ];
  
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }
  
  // Generate additional colors if needed
  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137) % 360; // golden angle approximation
    colors.push(`hsl(${hue}, 70%, 60%)`);
  }
  
  return colors;
};
