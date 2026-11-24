export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;

  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? `请求失败（${response.status}）`, response.status);
  }
  return payload?.data as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'GET', cache: 'no-store' });
}

export function apiSend<T>(url: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown) {
  return request<T>(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
