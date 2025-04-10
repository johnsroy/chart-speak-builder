
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
  // Ensure we start at the provided percentage
  setProgress(Math.max(startPercent, 0));
  
  let lastProgress = startPercent;
  
  const progressInterval = setInterval(() => {
    setProgress(prev => {
      // Never go backwards in progress
      const newProgress = Math.max(prev, lastProgress);
      
      // Move more slowly for larger files to prevent overly optimistic progress
      let increment;
      if (totalSize > 50 * 1024 * 1024) { // Over 50MB
        increment = 0.25; // Very slow progress for large files
      } else if (totalSize > 10 * 1024 * 1024) { // Over 10MB
        increment = 0.5; // Slow progress for medium files
      } else {
        increment = 1; // Normal progress for small files
      }
      
      // Cap at 90% to leave room for final processing
      const updatedProgress = Math.min(90, newProgress + increment);
      lastProgress = updatedProgress;
      return updatedProgress;
    });
    
    // If we've reached or exceeded 90%, clear the interval
    if (lastProgress >= 90) {
      clearInterval(progressInterval);
    }
  }, 1000); // Consistent, steady updates
  
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

/**
 * Completes the progress to 100%
 * @param setProgress Progress setter function
 * @returns Promise that resolves when progress reaches 100%
 */
export const completeProgress = (
  setProgress: React.Dispatch<React.SetStateAction<number>>
): Promise<void> => {
  return new Promise(resolve => {
    // Move to 100% in steps for a smoother finish animation
    let currentProgress = 90;
    const finishInterval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(finishInterval);
        setProgress(100);
        setTimeout(resolve, 300); // Small delay to show 100% briefly
      }
    }, 100);
  });
};
