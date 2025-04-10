
/**
 * Validates user ID
 * @param userId User ID to validate
 * @returns Validated user ID
 */
export const validateUserId = (userId?: string): string => {
  if (!userId || userId.trim() === '') {
    console.warn('No user ID provided, using system account');
    return 'fe4ab121-d26c-486d-92ca-b5cc4d99e984';
  }
  
  return userId;
};
