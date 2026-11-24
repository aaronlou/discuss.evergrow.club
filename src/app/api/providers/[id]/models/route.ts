import { handleApiError, ok } from '@/lib/api';
import { fetchProviderModels } from '@/lib/llm/provider-test';
import { getProvider } from '@/lib/repo/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const models = await fetchProviderModels(getProvider(id));
    return ok({ models });
  } catch (error) {
    return handleApiError(error);
  }
}
