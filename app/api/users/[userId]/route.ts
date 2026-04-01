import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { noContent, ok } from "@/lib/api/http";
import {
  emailSchema,
  parseJson,
  strongPasswordSchema,
  uuidSchema,
} from "@/lib/api/validation";
import { deleteUser, updateUser } from "@/lib/services/usersService";

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: emailSchema.optional(),
    password: strongPasswordSchema.optional(),
    avatar: z.url().nullable().optional(),
    remarks: z.string().trim().max(1000).nullable().optional(),
    policy: z.enum(["user", "mod", "admin"]).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.email !== undefined ||
      value.password !== undefined ||
      value.avatar !== undefined ||
      value.remarks !== undefined ||
      value.policy !== undefined,
    {
      message: "At least one field is required to update a user",
    },
  );

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

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["admin"]);

    const { userId: rawUserId } = await context.params;
    const userId = parseUserId(rawUserId);

    const payload = await parseJson(request, updateUserSchema);

    const updatedUser = await updateUser(userId, {
      name: payload.name,
      email: payload.email,
      password: payload.password,
      avatar: payload.avatar,
      remarks: payload.remarks,
      policy: payload.policy,
    });

    return ok(updatedUser);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["admin"]);

    const { userId: rawUserId } = await context.params;
    const userId = parseUserId(rawUserId);

    await deleteUser(userId);

    return noContent();
  } catch (error) {
    return toErrorResponse(error);
  }
}
