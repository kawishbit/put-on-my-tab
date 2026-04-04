import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { parseJson, uuidSchema } from "@/lib/api/validation";
import { updateTransactionStatus } from "@/lib/services/transactionsService";

const transactionStatusSchema = z.enum(["pending", "completed", "cancelled"]);

const updateTransactionStatusSchema = z.object({
  status: transactionStatusSchema,
});

function parseTransactionId(rawTransactionId: string): string {
  const parsed = uuidSchema.safeParse(rawTransactionId);

  if (!parsed.success) {
    throw new ApiError(422, "validation_error", "Invalid transaction id");
  }

  return parsed.data;
}

type RouteContext = {
  params: Promise<{
    transactionId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["admin"]);

    const { transactionId: rawTransactionId } = await context.params;
    const transactionId = parseTransactionId(rawTransactionId);

    const payload = await parseJson(request, updateTransactionStatusSchema);

    const updated = await updateTransactionStatus(
      transactionId,
      payload.status,
      requestContext.userId,
    );

    return ok(updated);
  } catch (error) {
    return toErrorResponse(error);
  }
}
