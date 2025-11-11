/**
 * Maps internal error codes to user-friendly messages
 * Prevents exposure of database schema and internal details
 */
export const getSafeErrorMessage = (error: any): string => {
  // Log full error for debugging (server-side in production)
  console.error('[Security] Error details:', error);
  
  // Map common error codes to safe messages
  const errorCode = error?.code;
  const errorMap: Record<string, string> = {
    '42501': 'You do not have permission to perform this action',
    '23505': 'This record already exists',
    '23503': 'Cannot complete operation due to related records',
    'PGRST116': 'Invalid request parameters',
    'PGRST301': 'You do not have permission to access this resource',
    '22P02': 'Invalid data format provided',
    '23514': 'The provided data does not meet requirements',
  };
  
  // Check for specific error patterns
  if (error?.message?.includes('row-level security')) {
    return 'You do not have permission to perform this action';
  }
  
  if (error?.message?.includes('duplicate key')) {
    return 'This record already exists';
  }
  
  if (error?.message?.includes('violates')) {
    return 'The provided data does not meet requirements';
  }
  
  // Return mapped error or generic message
  return errorMap[errorCode] || 'An error occurred. Please try again.';
};
