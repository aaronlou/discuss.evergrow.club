import { handleApiError, ok, parseJson } from '@/lib/api';
import {
  deleteProvider,
  toPublicProvider,
  updateProvider,
} from '@/lib/repo/providers';
import { providerInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = await parseJson(request, providerInputSchema);
    return ok(toPublicProvider(updateProvider(id, input)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    deleteProvider(id);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
