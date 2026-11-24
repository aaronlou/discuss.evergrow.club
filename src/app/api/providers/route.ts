import { handleApiError, ok, parseJson } from '@/lib/api';
import { createProvider, listPublicProviders, toPublicProvider } from '@/lib/repo/providers';
import { providerInputSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return ok(listPublicProviders());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, providerInputSchema);
    const provider = createProvider(input);
    return ok(toPublicProvider(provider), 201);
  } catch (error) {
    return handleApiError(error);
  }
}
