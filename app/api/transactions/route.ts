import { z } from "zod";

import { getRequestContext, requireAuth, requirePolicy } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { parseJson, uuidSchema } from "@/lib/api/validation";
import {
  type CreateSplitTransactionInput,
  createSplitTransaction,
  listTransactions,
} from "@/lib/services/transactionsService";

const transactionStatusSchema = z.enum(["pending", "completed", "cancelled"]);

const createSplitTransactionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  transactionRemark: z.string().trim().max(1500).nullable().optional(),
  paidBy: uuidSchema,
  amount: z.number().positive(),
  partiesInvolved: z.array(uuidSchema).default([]),
  category: uuidSchema.nullable().optional(),
  status: transactionStatusSchema.optional(),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requireAuth(context);

    const { searchParams } = new URL(request.url);
    const requestedStatus = searchParams.get("status");
    const requestedPaidBy = searchParams.get("paidBy");

    const status = requestedStatus
      ? transactionStatusSchema.parse(requestedStatus)
      : undefined;

    const paidBy =
      context.policy === "user"
        ? context.userId
        : requestedPaidBy && z.uuid().safeParse(requestedPaidBy).success
          ? requestedPaidBy
          : undefined;

    const transactions = await listTransactions({
      paidBy,
      status,
    });

    return ok(transactions);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["mod", "admin"]);

    const payload = await parseJson(request, createSplitTransactionSchema);

    const created = await createSplitTransaction(
      payload as CreateSplitTransactionInput,
    );
    return ok(created, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
