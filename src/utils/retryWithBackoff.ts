export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error as Error;
        // Si c'est une erreur de rate limit et qu'on a encore des tentatives
      if (
        attempt < maxRetries &&
        ((error instanceof Error && error.message?.includes('rate limit')) || 
        ((error as { status?: number })?.status === 429))
      ) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Rate limit atteint, retry dans ${delay}ms (tentative ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Pour les autres erreurs ou si on a épuisé les tentatives, on relance l'erreur
      throw error;
    }
  }
  
  throw lastError!;
}
