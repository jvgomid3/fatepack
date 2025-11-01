/**
 * Sanitizes error messages to prevent information leakage in production.
 * Returns detailed error messages only in development mode.
 */
export function safeErrorMessage(error: any): string {
  // In production, return generic message to avoid exposing database structure or internal logic
  if (process.env.NODE_ENV === "production") {
    return "Erro ao processar requisição. Tente novamente mais tarde."
  }

  // In development, return detailed error for debugging
  if (error?.message) {
    return String(error.message)
  }

  if (typeof error === "string") {
    return error
  }

  return "Erro desconhecido"
}

/**
 * Creates a standardized error response object for API routes.
 */
export function createErrorResponse(error: any, status: number = 500) {
  return {
    error: safeErrorMessage(error),
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== "production" && error?.stack ? { stack: error.stack } : {}),
  }
}
