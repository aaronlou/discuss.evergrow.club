import { handleApiError, ok, parseJson } from '@/lib/api';
import { deleteAgent, updateAgent } from '@/lib/repo/agents';
import { agentInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = await parseJson(request, agentInputSchema);
    return ok(updateAgent(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    deleteAgent(id);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
