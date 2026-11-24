import { fail, ok, parseJson } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { testProvider } from '@/lib/llm/provider-test';
import { getProvider } from '@/lib/repo/providers';
import { providerTestSchema } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const input = await parseJson(request, providerTestSchema);

    let apiKey = input.apiKey ?? null;
    let baseUrl = input.baseUrl;
    let model = input.model;
    if (input.providerId) {
      const stored = getProvider(input.providerId);
      if (!apiKey) apiKey = stored.apiKey;
      if (!baseUrl) baseUrl = stored.baseUrl;
      if (!model) model = stored.models[0];
    }

    const result = await testProvider({ ...input, apiKey, baseUrl, model });
    return ok(result);
  } catch (error) {
    return fail(errorMessage(error), 400);
  }
}
