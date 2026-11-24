export class AppError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
}

export function errorStatus(error: unknown): number {
  return error instanceof AppError ? error.status : 500;
}
