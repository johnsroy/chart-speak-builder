
import React from 'react';
import { BarChart, LineChart, PieChart } from 'lucide-react';
import { QueryResult } from '@/services/types/queryTypes';

/**
 * Utility functions for chat components
 */
export const ChatUtils = {
  /**
   * Get AI query response for a dataset
   */
  getAIQuery: async (datasetId: string, query: string, model: string, data: any[]) => {
    console.log(`Getting AI query for dataset ${datasetId} using ${model} model`);
    // Mock implementation for now - will be implemented in future
    return {
      data: [],
      columns: [],
      explanation: `This is a response to: "${query}"`,
      chartType: 'bar',
      xAxis: 'category',
      yAxis: 'value'
    };
  }
};

/**
 * Get the appropriate chart icon based on the chart type
 * @param {QueryResult} result - The result object containing chart type information.
 * @returns {JSX.Element} - The JSX element representing the chart icon.
 */
export const getChartTypeIcon = (result?: QueryResult) => {
  if (!result) return <BarChart className="h-4 w-4 text-purple-400" />;
  
  const chartType = result.chartType || result.chart_type || 'bar';
  
  switch (chartType) {
    case 'bar':
      return <BarChart className="h-4 w-4 text-purple-400" />;
    case 'line':
      return <LineChart className="h-4 w-4 text-blue-400" />;
    case 'pie':
      return <PieChart className="h-4 w-4 text-green-400" />;
    default:
      return <BarChart className="h-4 w-4 text-purple-400" />;
  }
};

/**
 * Calculate standard deviation of a set of values
 * @param {number[]} values - An array of numbers.
 * @returns {number} - The standard deviation of the values.
 */
export const calculateStandardDeviation = (values: number[]): number => {
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
  return Math.sqrt(avgSquareDiff);
};

/**
 * Identify growth and decline periods in time series data
 * @param {any[]} data - An array of data points.
 * @param {string} xKey - The key for the x-axis values.
 * @param {string} yKey - The key for the y-axis values.
 * @returns {{growth: object | null, decline: object | null}} - An object containing the growth and decline periods.
 */
export const identifyGrowthPeriods = (data: any[], xKey: string, yKey: string) => {
  if (data.length < 3) return { growth: null, decline: null };
  
  let maxGrowth = { rate: 0, start: '', end: '' };
  let maxDecline = { rate: 0, start: '', end: '' };
  
  for (let i = 0; i < data.length - 1; i++) {
    const start = data[i];
    const end = data[i + 1];
    
    const startVal = Number(start[yKey]);
    const endVal = Number(end[yKey]);
    
    if (startVal === 0) continue; // Avoid division by zero
    
    const changeRate = (endVal - startVal) / startVal;
    
    if (changeRate > maxGrowth.rate) {
      maxGrowth = { rate: changeRate, start: start[xKey], end: end[xKey] };
    }
    
    if (changeRate < maxDecline.rate) {
      maxDecline = { rate: changeRate, start: start[xKey], end: end[xKey] };
    }
  }
  
  return {
    growth: maxGrowth.rate > 0 ? maxGrowth : null,
    decline: maxDecline.rate < 0 ? maxDecline : null
  };
};

/**
 * Generate a step-by-step explanation of data analysis results
 * @param {QueryResult} result - The result object containing data analysis information.
 * @param {string} datasetName - The name of the dataset.
 * @returns {string} - A step-by-step explanation of the data analysis results.
 */
export const generateStepByStepExplanation = (result: QueryResult, datasetName: string): string => {
  if (!result.data || result.data.length === 0) {
    return "I analyzed your question but couldn't find enough data to generate insights.";
  }
  
  const chartType = result.chartType || result.chart_type || 'bar';
  const xAxis = result.xAxis || result.x_axis || 'category';
  const yAxis = result.yAxis || result.y_axis || 'value';
  
  let explanation = `I analyzed your question about ${datasetName}.\n\n`;
  explanation += `Step 1: I identified that you're interested in understanding ${yAxis} in relation to ${xAxis}.\n\n`;
  explanation += `Step 2: After examining the data structure, I determined a ${chartType} chart would be most effective for visualizing this relationship.\n\n`;
  
  if (chartType === 'bar' || chartType === 'pie') {
    try {
      const sortedData = [...result.data].sort((a, b) => Number(b[yAxis]) - Number(a[yAxis]));
      const total = sortedData.reduce((sum, item) => sum + Number(item[yAxis]), 0);
      const average = total / sortedData.length;
      
      explanation += `Step 3: I analyzed the distribution and found these insights:\n\n`;
      
      if (sortedData.length > 0) {
        explanation += `- The highest ${yAxis} is in ${sortedData[0][xAxis]} with a value of ${sortedData[0][yAxis]}`;
        if (total > 0) {
          const topPercentage = (Number(sortedData[0][yAxis]) / total * 100).toFixed(1);
          explanation += ` (${topPercentage}% of the total).\n`;
        } else {
          explanation += `.\n`;
        }
        
        if (sortedData.length > 1) {
          explanation += `- The lowest ${yAxis} is in ${sortedData[sortedData.length - 1][xAxis]} with a value of ${sortedData[sortedData.length - 1][yAxis]}.\n`;
        }
        
        explanation += `- The average ${yAxis} across categories is ${average.toFixed(2)}.\n`;
        
        const topThree = sortedData.slice(0, 3);
        const topThreeSum = topThree.reduce((sum, item) => sum + Number(item[yAxis]), 0);
        explanation += `- The top 3 categories (${topThree.map(item => item[xAxis]).join(', ')}) account for ${((topThreeSum / total) * 100).toFixed(1)}% of the total.\n`;
        
        const stdDev = calculateStandardDeviation(sortedData.map(item => Number(item[yAxis])));
        const outliers = sortedData.filter(item => Math.abs(Number(item[yAxis]) - average) > 2 * stdDev);
        if (outliers.length > 0) {
          explanation += `- I detected ${outliers.length} outlier(s), including ${outliers[0][xAxis]} which deviates significantly from the average.\n`;
        }
      }
      
      explanation += `\nStep 4: The ${chartType} chart visualizes this distribution, making it easy to compare ${yAxis} across different ${xAxis} categories.`;
    } catch (e) {
      console.error('Error generating bar/pie explanation:', e);
      explanation += `Step 3: The data shows the distribution of ${yAxis} across different ${xAxis} categories.\n\n`;
      explanation += `Step 4: The ${chartType} chart helps visualize these differences clearly.`;
    }
  } else if (chartType === 'line') {
    try {
      let timeData = [...result.data];
      try {
        timeData.sort((a, b) => {
          const dateA = new Date(a[xAxis]);
          const dateB = new Date(b[xAxis]);
          return dateA.getTime() - dateB.getTime();
        });
      } catch (e) {
        // If date sorting fails, keep original order
      }
      
      explanation += `Step 3: I analyzed the trends over time and found:\n\n`;
      
      if (timeData.length > 1) {
        const firstValue = Number(timeData[0]?.[yAxis]);
        const lastValue = Number(timeData[timeData.length - 1]?.[yAxis]);
        const change = lastValue - firstValue;
        const percentChange = (change / (firstValue || 1) * 100).toFixed(1);
        
        explanation += `- From ${timeData[0][xAxis]} to ${timeData[timeData.length - 1][xAxis]}, there was a ${change >= 0 ? 'increase' : 'decrease'} of ${Math.abs(change).toFixed(2)} (${change >= 0 ? '+' : ''}${percentChange}%)\n`;
        
        const maxItem = timeData.reduce((max, item) => Number(item[yAxis]) > Number(max[yAxis]) ? item : max, timeData[0]);
        const minItem = timeData.reduce((min, item) => Number(item[yAxis]) < Number(min[yAxis]) ? item : min, timeData[0]);
        
        explanation += `- The peak value was ${maxItem[yAxis]} on ${maxItem[xAxis]}.\n`;
        explanation += `- The lowest value was ${minItem[yAxis]} on ${minItem[xAxis]}.\n`;
        
        const periods = identifyGrowthPeriods(timeData, xAxis, yAxis);
        if (periods.growth) {
          explanation += `- The strongest growth period was from ${periods.growth.start} to ${periods.growth.end}.\n`;
        }
        if (periods.decline) {
          explanation += `- The most significant decline was from ${periods.decline.start} to ${periods.decline.end}.\n`;
        }
      }
      
      explanation += `\nStep 4: The line chart visualizes these trends over time, showing how ${yAxis} has changed across the ${xAxis} timeline.`;
    } catch (e) {
      console.error('Error generating line chart explanation:', e);
      explanation += `Step 3: The data shows how ${yAxis} changes over different ${xAxis} points.\n\n`;
      explanation += `Step 4: The line chart helps visualize the trend and pattern of change.`;
    }
  }
  
  explanation += `\n\nStep 5: Based on this visualization, you can make informed decisions about ${datasetName.toLowerCase()}.`;
  
  return explanation;
};
