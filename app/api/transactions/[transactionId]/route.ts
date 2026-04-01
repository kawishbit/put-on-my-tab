import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { noContent, ok } from "@/lib/api/http";
import { parseJson, uuidSchema } from "@/lib/api/validation";
import {
  deleteTransaction,
  getSplitTransactionEditDetails,
  updateSplitTransaction,
} from "@/lib/services/transactionsService";

const transactionStatusSchema = z.enum(["pending", "completed", "cancelled"]);

const updateSplitTransactionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  transactionRemark: z.string().trim().max(1500).nullable().optional(),
  paidBy: uuidSchema,
  amount: z.number().positive(),
  partiesInvolved: z.array(uuidSchema).default([]),
  category: uuidSchema.nullable().optional(),
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

export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["mod", "admin"]);

    const { transactionId: rawTransactionId } = await context.params;
    const transactionId = parseTransactionId(rawTransactionId);

    const transaction = await getSplitTransactionEditDetails(transactionId);

    return ok(transaction);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["mod", "admin"]);

    const { transactionId: rawTransactionId } = await context.params;
    const transactionId = parseTransactionId(rawTransactionId);

    const payload = await parseJson(request, updateSplitTransactionSchema);

    const updated = await updateSplitTransaction(transactionId, {
      name: payload.name,
      transactionRemark: payload.transactionRemark,
      paidBy: payload.paidBy,
      amount: payload.amount,
      category: payload.category,
      status: payload.status,
      partiesInvolved: payload.partiesInvolved,
    });

    return ok(updated);
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

    const { transactionId: rawTransactionId } = await context.params;
    const transactionId = parseTransactionId(rawTransactionId);

    await deleteTransaction(transactionId);

    return noContent();
  } catch (error) {
    return toErrorResponse(error);
  }
}
