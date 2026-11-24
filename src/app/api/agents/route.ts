import { handleApiError, ok, parseJson } from '@/lib/api';
import { createAgent, listAgentViews } from '@/lib/repo/agents';
import { agentInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(listAgentViews());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, agentInputSchema);
    return ok(createAgent(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
