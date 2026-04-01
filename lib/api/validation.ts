import { z } from "zod";

import { ApiError } from "@/lib/api/errors";

export const uuidSchema = z.uuid();

export const emailSchema = z
  .email()
  .transform((email) => email.toLowerCase().trim());

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/\d/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character")
  .refine((value) => !/\s/.test(value), {
    message: "Password must not contain spaces",
  });

export async function parseJson<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
): Promise<z.infer<TSchema>> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be valid JSON");
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError(
      422,
      "validation_error",
      "Request validation failed",
      parsed.error.flatten(),
    );
  }

  return parsed.data;
}
