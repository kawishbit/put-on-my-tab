import { z } from "zod";

import { getRequestContext, requireAuth } from "@/lib/api/auth";
import { buildCsvContent, csvDownloadHeaders } from "@/lib/api/csv";
import { toErrorResponse } from "@/lib/api/errors";
import { uuidSchema } from "@/lib/api/validation";
import { listTransactionsForExport } from "@/lib/services/transactionsService";
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

function formatCsvDate(value: string): string {
  return new Date(value).toISOString();
}

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

    const transactions = await listTransactionsForExport({
      paidBy,
      status,
      type: typeFilter,
      category,
      search: requestedSearch?.trim() || undefined,
      sortBy,
      sortOrder,
    });

    const csv = buildCsvContent(
      [
        "Transaction ID",
        "Group Key",
        "Name",
        "Remark",
        "Paid By Name",
        "Paid By Email",
        "Amount",
        "Type",
        "Status",
        "Category",
        "Transaction Date",
        "Updated At",
      ],
      transactions.items.map((transaction) => [
        transaction.transaction_id,
        transaction.group_key,
        transaction.name,
        transaction.transaction_remark,
        transaction.paid_by_user_name ?? transaction.paid_by,
        transaction.paid_by_user_email ?? "",
        transaction.amount,
        transaction.type,
        transaction.status,
        transaction.category_label ?? "Uncategorized",
        formatCsvDate(transaction.transaction_date),
        formatCsvDate(transaction.updated_at),
      ]),
    );

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `transactions-${today}.csv`;

    return new Response(csv, {
      status: 200,
      headers: csvDownloadHeaders(fileName),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
