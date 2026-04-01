import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import {
  parseJson,
  strongPasswordSchema,
  uuidSchema,
} from "@/lib/api/validation";
import { resetUserPassword } from "@/lib/services/usersService";

const resetPasswordSchema = z.object({
  newPassword: strongPasswordSchema,
});

function parseUserId(rawUserId: string): string {
  const parsed = uuidSchema.safeParse(rawUserId);

  if (!parsed.success) {
    throw new ApiError(422, "validation_error", "Invalid user id");
  }

  return parsed.data;
}

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["admin"]);

    const { userId: rawUserId } = await context.params;
    const userId = parseUserId(rawUserId);

    const payload = await parseJson(request, resetPasswordSchema);
    await resetUserPassword(userId, payload.newPassword);

    return ok({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
