import { z } from "zod";

import { getRequestContext, requireAuth } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { parseJson, strongPasswordSchema } from "@/lib/api/validation";
import { changeOwnPassword } from "@/lib/services/usersService";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: strongPasswordSchema,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from your current password",
    path: ["newPassword"],
  });

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requireAuth(context);

    const payload = await parseJson(request, changePasswordSchema);

    await changeOwnPassword(
      context.userId,
      payload.currentPassword,
      payload.newPassword,
    );

    return ok({ success: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
