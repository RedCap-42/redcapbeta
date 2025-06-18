// Circuit breaker pour éviter les boucles infinies d'authentification
class AuthCircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private readonly threshold: number = 5;
  private readonly timeout: number = 60000; // 1 minute
  
  canProceed(): boolean {
    const now = Date.now();
    
    // Si le timeout est passé, réinitialiser le circuit breaker
    if (now - this.lastFailureTime > this.timeout) {
      this.failures = 0;
    }
    
    // Si on a trop d'échecs, empêcher l'exécution
    return this.failures < this.threshold;
  }
  
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    console.warn(`Auth circuit breaker: ${this.failures}/${this.threshold} failures`);
  }
  
  recordSuccess(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
  }
  
  getStatus(): string {
    if (this.failures >= this.threshold) {
      const remainingTime = Math.max(0, this.timeout - (Date.now() - this.lastFailureTime));
      return `Circuit breaker open, ${Math.ceil(remainingTime / 1000)}s remaining`;
    }
    return `Circuit breaker closed, ${this.failures}/${this.threshold} failures`;
  }
}

export const authCircuitBreaker = new AuthCircuitBreaker();
