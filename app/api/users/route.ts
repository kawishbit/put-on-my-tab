import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import {
  emailSchema,
  parseJson,
  strongPasswordSchema,
} from "@/lib/api/validation";
import { createUser, listUsers } from "@/lib/services/usersService";

const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: emailSchema,
  password: strongPasswordSchema,
  avatar: z.url().nullable().optional(),
  remarks: z.string().trim().max(1000).nullable().optional(),
  policy: z.enum(["user", "mod", "admin"]).default("user"),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["mod", "admin"]);

    const users = await listUsers();
    return ok(users);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["admin"]);

    const payload = await parseJson(request, createUserSchema);
    const user = await createUser({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      avatar: payload.avatar ?? null,
      current_balance: 0,
      last_login_date: null,
      is_deleted: false,
      remarks: payload.remarks ?? null,
      policy: payload.policy,
    });

    return ok(user, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
