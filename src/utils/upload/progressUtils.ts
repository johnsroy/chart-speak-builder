
import React from 'react';

/**
 * Simulates upload progress for better user experience
 * @param startPercent Starting percentage
 * @param totalSize Total file size
 * @param setProgress Progress setter function
 * @returns Interval ID to clear when done
 */
export const simulateProgress = (
  startPercent: number, 
  totalSize: number, 
  setProgress: React.Dispatch<React.SetStateAction<number>>
): NodeJS.Timeout => {
  setProgress(startPercent);
  
  let lastProgress = startPercent;
  
  const progressInterval = setInterval(() => {
    setProgress(prev => {
      // Never go backwards in progress
      const newProgress = Math.max(prev, lastProgress);
      
      // Move slowly to 90% to simulate upload
      if (newProgress < 90) {
        // Larger files should progress more slowly
        const increment = totalSize > 5 * 1024 * 1024 ? 1 : 3;
        const updatedProgress = Math.min(90, newProgress + increment);
        lastProgress = updatedProgress;
        return updatedProgress;
      }
      return newProgress;
    });
    
    // If we've reached or exceeded 90%, clear the interval
    if (lastProgress >= 90) {
      clearInterval(progressInterval);
    }
  }, 500); // Slower updates for more stability
  
  return progressInterval;
};

/**
 * Ensures progress only increases, never decreases
 * @param currentValue Current progress value
 * @param newValue New progress value to set
 * @returns The higher of the two values
 */
export const ensureProgressIncreases = (currentValue: number, newValue: number): number => {
  return Math.max(currentValue, newValue);
};
