/**
 * Shared error type for the service layer.
 *
 * This file used to hold `simulateRequest`, a setTimeout that resolved canned
 * data. It is gone: content reads now come from SQLite and mutations go through
 * the outbox, so there is nothing left to simulate. What remains is the one
 * genuinely shared concern — a typed error the UI can branch on.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** True for failures a retry might fix, as opposed to bad input. */
export function isTransient(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 503 || error.status === 429 || error.status >= 500;
  }
  return true;
}
