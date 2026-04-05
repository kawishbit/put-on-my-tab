import { z } from "zod";

import { getRequestContext, requireAuth, requirePolicy } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { parseJson, uuidSchema } from "@/lib/api/validation";
import {
  createTransaction,
  listTransactions,
} from "@/lib/services/transactionsService";
import type { TransactionType } from "@/types/database";

const transactionStatusSchema = z.enum(["pending", "completed", "cancelled"]);
const transactionTypeSchema = z.enum(["deposit", "withdraw"]);
const sortBySchema = z.enum([
  "transaction_date",
  "amount",
  "name",
  "status",
  "type",
]);
const sortOrderSchema = z.enum(["asc", "desc"]);

const createTransactionSchema = z.object({
  name: z.string().trim().min(1).max(200),
  transactionRemark: z.string().trim().max(1500).nullable().optional(),
  transactionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  paidBy: uuidSchema,
  amount: z.number().positive(),
  type: transactionTypeSchema,
  category: uuidSchema.nullable().optional(),
  status: transactionStatusSchema.optional(),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requireAuth(context);

    const { searchParams } = new URL(request.url);
    const requestedStatus = searchParams.get("status");
    const requestedType = searchParams.get("type");
    const requestedPaidBy = searchParams.get("paidBy");
    const requestedCategory = searchParams.get("category");
    const requestedSearch = searchParams.get("search");
    const requestedScope = searchParams.get("scope");
    const requestedPage = searchParams.get("page");
    const requestedPageSize = searchParams.get("pageSize");
    const requestedSortBy = searchParams.get("sortBy");
    const requestedSortOrder = searchParams.get("sortOrder");

    const status = requestedStatus
      ? transactionStatusSchema.parse(requestedStatus)
      : undefined;

    const type = requestedType
      ? transactionTypeSchema.parse(requestedType)
      : undefined;

    const category = requestedCategory
      ? uuidSchema.safeParse(requestedCategory).success
        ? requestedCategory
        : undefined
      : undefined;

    const page = requestedPage ? Number.parseInt(requestedPage, 10) : 1;
    const pageSize = requestedPageSize
      ? Number.parseInt(requestedPageSize, 10)
      : 20;

    const sortBy = requestedSortBy
      ? sortBySchema.parse(requestedSortBy)
      : undefined;

    const sortOrder = requestedSortOrder
      ? sortOrderSchema.parse(requestedSortOrder)
      : undefined;

    const mineOnly = requestedScope === "mine";

    const paidByFromRequest =
      requestedPaidBy && uuidSchema.safeParse(requestedPaidBy).success
        ? requestedPaidBy
        : undefined;

    const paidBy =
      context.policy === "user"
        ? context.userId
        : mineOnly
          ? context.userId
          : paidByFromRequest;

    const typeFilter = type as TransactionType | undefined;

    const transactions = await listTransactions({
      paidBy,
      status,
      type: typeFilter,
      category,
      search: requestedSearch?.trim() || undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
      sortBy,
      sortOrder,
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

    const payload = await parseJson(request, createTransactionSchema);

    const created = await createTransaction(payload, context.userId);
    return ok(created, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
