import { handleApiError, ok, parseJson } from '@/lib/api';
import { createRoom, listRoomSummaries, updateRoom, deleteRoom } from '@/lib/repo/rooms';
import { createRoomSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(listRoomSummaries());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, createRoomSchema);
    return ok(createRoom(input), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
