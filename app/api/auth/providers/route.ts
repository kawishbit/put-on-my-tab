import { z } from "zod";

import { getRequestContext, requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { parseJson } from "@/lib/api/validation";
import {
  disconnectProviderForUser,
  listConnectedProvidersForUser,
} from "@/lib/services/userLoginProvidersService";

const providerTypeSchema = z.enum(["google", "github"]);

const disconnectProviderSchema = z.object({
  providerType: providerTypeSchema,
});

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requireAuth(context);

    const connectedProviders = await listConnectedProvidersForUser(
      context.userId,
    );

    return ok({
      credentials: connectedProviders.includes("credentials"),
      google: connectedProviders.includes("google"),
      github: connectedProviders.includes("github"),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requireAuth(context);

    const payload = await parseJson(request, disconnectProviderSchema);

    await disconnectProviderForUser(context.userId, payload.providerType);

    return ok({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
