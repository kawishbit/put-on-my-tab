import { z } from "zod";

import { ApiError } from "@/lib/api/errors";

export const uuidSchema = z.uuid();

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
