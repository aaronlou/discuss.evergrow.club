import { fail, handleApiError, parseJson } from '@/lib/api';
import { endRound, startRound } from '@/lib/active-rounds';
import { getRoom } from '@/lib/repo/rooms';
import { runRound } from '@/lib/round';
import { createSseResponse } from '@/lib/sse-response';
import { messageInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    getRoom(id);
  } catch (error) {
    return handleApiError(error);
  }

  let input: ReturnType<typeof messageInputSchema.parse>;
  try {
    input = await parseJson(request, messageInputSchema);
  } catch (error) {
    return handleApiError(error);
  }

  const abort = startRound(id);
  if (!abort) {
    return fail('这桌正在发言，等它说完或者先点停止', 409);
  }

  return createSseResponse(request, abort, async (send, signal) => {
    try {
      await runRound({
        roomId: id,
        userMessage: input.content,
        agentIds: input.mentions,
        send,
        signal,
      });
    } finally {
      endRound(id);
    }
  });
}
