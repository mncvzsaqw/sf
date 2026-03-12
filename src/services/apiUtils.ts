
export function getValidModelName(modelName: string): string {
  if (!modelName) return 'gemini-3-flash-preview';
  return modelName;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 7,
  initialDelay: number = 3000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      const errorMsg = (error?.message || String(error)).toUpperCase();
      const errorStr = JSON.stringify(error).toUpperCase();
      
      const isRetryableError = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('500') ||
        errorMsg.includes('502') ||
        errorMsg.includes('503') ||
        errorMsg.includes('504') ||
        errorMsg.includes('INTERNAL') ||
        errorMsg.includes('SERVICE_UNAVAILABLE') ||
        errorStr.includes('429') || 
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('500') ||
        errorStr.includes('INTERNAL') ||
        error?.status === 429 ||
        error?.status >= 500 ||
        error?.error?.code === 429 ||
        error?.error?.code >= 500;

      if (isRetryableError && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        const reason = error?.status === 429 || errorMsg.includes('429') ? 'Rate limit' : 'Internal error';
        console.warn(`${reason} hit. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
