import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

import { AppError, errorMessage, errorStatus } from './errors';

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, details?: unknown): NextResponse {
  return NextResponse.json({ error: { message, details } }, { status });
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return fail('参数不合法', 400, error.issues);
  }
  return fail(errorMessage(error), errorStatus(error));
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new AppError('请求体不是合法 JSON', 400);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('；');
    throw new AppError(issues || '参数不合法', 400, result.error.issues);
  }
  return result.data;
}
