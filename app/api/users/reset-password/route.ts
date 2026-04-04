import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import {
  parseJson,
  strongPasswordSchema,
  uuidSchema,
} from "@/lib/api/validation";
import { resetUserPassword } from "@/lib/services/usersService";

const resetPasswordSchema = z.object({
  userId: uuidSchema,
  newPassword: strongPasswordSchema,
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["admin"]);

    const payload = await parseJson(request, resetPasswordSchema);

    await resetUserPassword(
      payload.userId,
      payload.newPassword,
      context.userId,
    );

    return ok({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
