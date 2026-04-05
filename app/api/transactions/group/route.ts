import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { parseJson, uuidSchema } from "@/lib/api/validation";
import {
  type CreateSplitTransactionInput,
  createSplitTransaction,
} from "@/lib/services/transactionsService";

const transactionStatusSchema = z.enum(["pending", "completed", "cancelled"]);

const createSplitTransactionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  transactionRemark: z.string().trim().max(1500).nullable().optional(),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  paidBy: uuidSchema,
  amount: z.number().positive(),
  partiesInvolved: z.array(uuidSchema).default([]),
  partySplits: z.record(z.string(), z.number().positive()).optional(),
  category: uuidSchema.nullable().optional(),
  status: transactionStatusSchema.optional(),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["mod", "admin"]);

    const payload = await parseJson(request, createSplitTransactionSchema);

    const created = await createSplitTransaction(
      payload as CreateSplitTransactionInput,
      context.userId,
    );

    return ok(created, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
