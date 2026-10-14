export type CircuitBreakerOptions = {
  failureThreshold: number;
  cooldownMs: number;
};

export type CircuitState = "closed" | "open" | "half_open";

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private openedAt = 0;

  constructor(private readonly options: CircuitBreakerOptions) {}

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.openedAt >= this.options.cooldownMs) {
      this.state = "half_open";
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>, isFailure?: (error: unknown) => boolean): Promise<T> {
    const state = this.getState();
    if (state === "open") {
      throw new Error("CIRCUIT_OPEN");
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      if (!isFailure || isFailure(error)) {
        this.onFailure();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = "closed";
  }

  private onFailure(): void {
    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) {
      this.state = "open";
      this.openedAt = Date.now();
    }
  }
}
