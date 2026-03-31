import { ApiError } from "@/lib/api/errors";
import { supabase } from "@/lib/supabaseServer";
import type { Transaction, TransactionStatus } from "@/types/database";

interface SplitTransactionRpcResult {
  group_key: string;
  transaction_ids: string[];
}

export interface CreateSplitTransactionInput {
  name: string;
  transactionRemark?: string | null;
  paidBy: string;
  amount: number;
  partiesInvolved: string[];
  category?: string | null;
  status?: TransactionStatus;
}

export interface SplitTransactionCreationResult {
  groupKey: string;
  transactionIds: string[];
  transactions: Transaction[];
}

export async function listTransactions(filters?: {
  paidBy?: string;
  status?: TransactionStatus;
}): Promise<Transaction[]> {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (filters?.paidBy) {
    query = query.eq("paid_by", filters.paidBy);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new ApiError(500, "transactions_fetch_failed", error.message, error);
  }

  return data;
}

export async function createSplitTransaction(
  input: CreateSplitTransactionInput,
): Promise<SplitTransactionCreationResult> {
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "create_split_transaction",
    {
      p_name: input.name,
      p_transaction_remark: input.transactionRemark ?? null,
      p_paid_by: input.paidBy,
      p_amount: input.amount,
      p_parties: input.partiesInvolved,
      p_category: input.category ?? null,
      p_status: input.status ?? "completed",
    } as never,
  );

  if (rpcError) {
    throw new ApiError(
      500,
      "transaction_create_failed",
      rpcError.message,
      rpcError,
    );
  }

  const splitResult = rpcResult?.[0] as SplitTransactionRpcResult | undefined;

  if (!splitResult) {
    throw new ApiError(
      500,
      "transaction_create_failed",
      "Split transaction RPC returned no rows",
    );
  }

  const { data: transactions, error: selectError } = await supabase
    .from("transactions")
    .select("*")
    .eq("group_key", splitResult.group_key)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (selectError) {
    throw new ApiError(
      500,
      "transactions_fetch_failed",
      selectError.message,
      selectError,
    );
  }

  return {
    groupKey: splitResult.group_key,
    transactionIds: splitResult.transaction_ids,
    transactions,
  };
}
