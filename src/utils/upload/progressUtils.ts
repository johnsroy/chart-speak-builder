
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
  
  const progressInterval = setInterval(() => {
    let currentProgress = 0;
    
    setProgress(prev => {
      currentProgress = prev;
      // Move slowly to 90% to simulate upload
      if (prev < 90) {
        // Larger files should progress more slowly
        const increment = totalSize > 5 * 1024 * 1024 ? 1 : 3;
        return Math.min(90, prev + increment);
      }
      return prev;
    });
    
    // If we've reached or exceeded 90%, clear the interval
    if (currentProgress >= 90) {
      clearInterval(progressInterval);
    }
  }, 300); // Faster updates for more responsive UI
  
  return progressInterval;
};
