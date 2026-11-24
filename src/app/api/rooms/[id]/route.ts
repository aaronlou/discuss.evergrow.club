import { handleApiError, ok, parseJson } from '@/lib/api';
import {
  deleteRoom,
  getRoomBundle,
  updateRoom,
} from '@/lib/repo/rooms';
import { updateRoomSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    return ok(getRoomBundle(id));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const input = await parseJson(request, updateRoomSchema);
    return ok(updateRoom(id, input));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    deleteRoom(id);
    return ok({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
