/**
 * breaker.js - Circuit Breaker pattern
 *
 * Implements CLOSED, OPEN, HALF-OPEN states.
 * Fails fast when downstream service is down to prevent thread/connection pool exhaustion.
 */

class CircuitBreaker {
  constructor({ failMax = 5, resetAfterMs = 30000 } = {}) {
    this.failMax = failMax;
    this.resetAfterMs = resetAfterMs;
    this.fails = 0;
    this.openedAt = null;
  }

  async call(fn) {
    const now = Date.now();

    // 1. OPEN state: fail immediately without hitting network
    if (this.openedAt) {
      if (now - this.openedAt < this.resetAfterMs) {
        const err = new Error('Circuit open: downstream Accounts service unavailable');
        err.isCircuitOpen = true;
        throw err;
      }
      // Transition from OPEN -> HALF-OPEN
      this.openedAt = null;
    }

    try {
      const result = await fn();
      // On success: reset counter -> CLOSED
      this.fails = 0;
      return result;
    } catch (err) {
      // 4xx errors are client errors, do not count against circuit failure
      if (!err.isClientError) {
        this.fails++;
        if (this.fails >= this.failMax) {
          this.openedAt = Date.now(); // Trip circuit -> OPEN
        }
      }
      throw err;
    }
  }

  getState() {
    if (this.openedAt && Date.now() - this.openedAt < this.resetAfterMs) {
      return 'OPEN';
    }
    return this.fails > 0 ? 'HALF-OPEN' : 'CLOSED';
  }
}

module.exports = { CircuitBreaker };
