/**
 * accountsClient.js - Hardened Outbound Cross-Service Caller
 *
 * Rules:
 * D1: Resolve address from environment variable, never hard-coded.
 * D2: Give it a timeout (2.0s), and a retry with exponential backoff and jitter.
 *     Retry ONLY what is safe: 4xx must NEVER be retried.
 * D3: Fallback decision: if Accounts is offline, return fallback flag so
 *     complaint filing never fails on transient network drops.
 */

const { CircuitBreaker } = require('./breaker');

const ACCOUNTS_URL = process.env.ACCOUNTS_URL || 'http://localhost:8080';
const breaker = new CircuitBreaker({ failMax: 5, resetAfterMs: 30000 });

class UserVerificationError extends Error {
  constructor(message, status = 422) {
    super(message);
    this.status = status;
    this.isClientError = status >= 400 && status < 500;
  }
}

class AccountsUnavailableError extends Error {
  constructor(message = 'Accounts service unreachable after retries') {
    super(message);
    this.status = 503;
    this.isClientError = false;
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Raw single HTTP attempt with timeout
 */
async function _fetchUserWithTimeout(userId, timeoutMs = 2000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${ACCOUNTS_URL}/users/${encodeURIComponent(userId)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timer);

    if (response.status === 200) {
      const user = await response.json();
      return { verified: true, user };
    }

    if (response.status === 404) {
      // 4xx is a business fact (user does not exist). DO NOT RETRY.
      throw new UserVerificationError(`User ${userId} not found in Accounts directory`, 422);
    }

    if (response.status >= 400 && response.status < 500) {
      // Any other 4xx is client error. DO NOT RETRY.
      throw new UserVerificationError(`Accounts service rejected request with status ${response.status}`, response.status);
    }

    // 5xx is transport/server failure
    throw new AccountsUnavailableError(`Accounts service returned ${response.status}`);
  } catch (err) {
    clearTimeout(timer);

    if (err.name === 'AbortError') {
      throw new AccountsUnavailableError(`Accounts call timed out after ${timeoutMs}ms`);
    }
    if (err instanceof UserVerificationError) {
      throw err;
    }
    // Network errors (e.g. ECONNREFUSED)
    throw new AccountsUnavailableError(err.message);
  }
}

/**
 * Hardened call wrapped in Circuit Breaker + Retry with Backoff & Jitter
 */
async function validateUser(userId, { allowFallback = true, mockHandler = null } = {}) {
  // If mockHandler provided (for isolated testing), use it
  const callFn = mockHandler || (() => _fetchUserWithTimeout(userId, 2000));

  try {
    return await breaker.call(async () => {
      let lastError = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await callFn();
        } catch (err) {
          lastError = err;

          // 4xx client errors must NEVER be retried
          if (err.isClientError) {
            throw err;
          }

          // Backoff with randomized jitter
          if (attempt < 2) {
            const backoff = (2 ** attempt) * 100 + (Math.random() * 50);
            await sleep(backoff);
          }
        }
      }

      throw lastError || new AccountsUnavailableError();
    });
  } catch (err) {
    // 4xx user validation errors re-throw directly to inform caller
    if (err.isClientError) {
      throw err;
    }

    // D3 Fallback reasoning:
    // If Accounts is unreachable, we degrade gracefully by queuing validation
    // rather than rejecting the student's urgent grievance report.
    if (allowFallback) {
      return {
        verified: false,
        fallbackMode: true,
        reason: 'Accounts service temporarily unreachable; marked for asynchronous validation'
      };
    }

    throw err;
  }
}

module.exports = {
  validateUser,
  UserVerificationError,
  AccountsUnavailableError,
  ACCOUNTS_URL,
  breaker
};
