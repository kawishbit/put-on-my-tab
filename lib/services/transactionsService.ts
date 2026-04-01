import { ApiError } from "@/lib/api/errors";
import { supabase } from "@/lib/supabaseServer";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/types/database";

interface SplitTransactionRpcResult {
  group_key: string;
  transaction_ids: string[];
}

type UserLookupRow = {
  user_id: string;
  name: string;
  email: string;
};

type CategoryLookupRow = {
  transaction_category_id: string;
  label: string;
};

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

export interface TransactionListItem extends Transaction {
  paid_by_user_name: string | null;
  paid_by_user_email: string | null;
  category_label: string | null;
}

export interface TransactionListResult {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListTransactionsInput {
  paidBy?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "amount" | "name" | "status" | "type";
  sortOrder?: "asc" | "desc";
}

export interface UpdateSplitTransactionInput {
  name: string;
  transactionRemark?: string | null;
  paidBy: string;
  amount: number;
  partiesInvolved: string[];
  category?: string | null;
  status: TransactionStatus;
}

export interface SplitTransactionEditDetails {
  transactionId: string;
  groupKey: string;
  name: string;
  transactionRemark: string | null;
  paidBy: string;
  amount: number;
  category: string | null;
  status: TransactionStatus;
  partiesInvolved: string[];
  createdAt: string;
  updatedAt: string;
}

interface GroupIdentity {
  transactionId: string;
  groupKey: string;
}

type GroupIdentityRow = {
  transaction_id: string;
  group_key: string;
};

async function getGroupIdentityByTransactionId(
  transactionId: string,
): Promise<GroupIdentity> {
  const { data, error } = await supabase
    .from("transactions")
    .select("transaction_id,group_key")
    .eq("transaction_id", transactionId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "transaction_lookup_failed", error.message, error);
  }

  if (!data) {
    throw new ApiError(404, "transaction_not_found", "Transaction not found");
  }

  const row = data as GroupIdentityRow;

  return {
    transactionId: row.transaction_id,
    groupKey: row.group_key,
  };
}

async function getTransactionsByGroupKey(
  groupKey: string,
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("group_key", groupKey)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) {
    throw new ApiError(500, "transactions_fetch_failed", error.message, error);
  }

  return data;
}

async function mapTransactionRows(
  rows: Transaction[],
): Promise<TransactionListItem[]> {
  const paidByIds = Array.from(new Set(rows.map((row) => row.paid_by)));
  const categoryIds = Array.from(
    new Set(
      rows
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [usersResult, categoriesResult] = await Promise.all([
    paidByIds.length > 0
      ? supabase
          .from("users")
          .select("user_id,name,email")
          .in("user_id", paidByIds)
      : Promise.resolve({ data: [] as UserLookupRow[], error: null }),
    categoryIds.length > 0
      ? supabase
          .from("transaction_categories")
          .select("transaction_category_id,label")
          .in("transaction_category_id", categoryIds)
      : Promise.resolve({ data: [] as CategoryLookupRow[], error: null }),
  ]);

  if (usersResult.error) {
    throw new ApiError(
      500,
      "users_fetch_failed",
      usersResult.error.message,
      usersResult.error,
    );
  }

  if (categoriesResult.error) {
    throw new ApiError(
      500,
      "categories_fetch_failed",
      categoriesResult.error.message,
      categoriesResult.error,
    );
  }

  const usersById = new Map(
    (usersResult.data ?? []).map((user) => [user.user_id, user]),
  );
  const categoriesById = new Map(
    (categoriesResult.data ?? []).map((category) => [
      category.transaction_category_id,
      category,
    ]),
  );

  return rows.map((row) => {
    const paidByUser = usersById.get(row.paid_by);
    const category = row.category ? categoriesById.get(row.category) : null;

    return {
      ...row,
      paid_by_user_name: paidByUser?.name ?? null,
      paid_by_user_email: paidByUser?.email ?? null,
      category_label: category?.label ?? null,
    };
  });
}

export async function listTransactions(filters?: {
  paidBy?: string;
  status?: TransactionStatus;
  type?: TransactionType;
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "amount" | "name" | "status" | "type";
  sortOrder?: "asc" | "desc";
}): Promise<TransactionListResult> {
  const page = Math.max(filters?.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 20, 1), 100);
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  const sortBy = filters?.sortBy ?? "created_at";
  const sortOrder = filters?.sortOrder ?? "desc";

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("is_deleted", false)
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(fromIndex, toIndex);

  if (filters?.paidBy) {
    query = query.eq("paid_by", filters.paidBy);
  }

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  if (filters?.type) {
    query = query.eq("type", filters.type);
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.search) {
    query = query.ilike("name", `%${filters.search.trim()}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    throw new ApiError(500, "transactions_fetch_failed", error.message, error);
  }

  const items = await mapTransactionRows(data ?? []);

  return {
    items,
    total: count ?? 0,
    page,
    pageSize,
  };
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

export async function getSplitTransactionEditDetails(
  transactionId: string,
): Promise<SplitTransactionEditDetails> {
  const identity = await getGroupIdentityByTransactionId(transactionId);
  const transactions = await getTransactionsByGroupKey(identity.groupKey);

  if (transactions.length === 0) {
    throw new ApiError(
      404,
      "transaction_group_not_found",
      "Transaction group not found",
    );
  }

  const deposit = transactions.find(
    (transaction) => transaction.type === "deposit",
  );
  const withdraws = transactions.filter(
    (transaction) => transaction.type === "withdraw",
  );

  if (!deposit) {
    throw new ApiError(
      500,
      "transaction_data_invalid",
      "Split transaction group is missing deposit record",
    );
  }

  return {
    transactionId: identity.transactionId,
    groupKey: identity.groupKey,
    name: deposit.name,
    transactionRemark: deposit.transaction_remark,
    paidBy: deposit.paid_by,
    amount: deposit.amount,
    category: deposit.category,
    status: deposit.status,
    partiesInvolved: Array.from(
      new Set(withdraws.map((transaction) => transaction.paid_by)),
    ),
    createdAt: deposit.created_at,
    updatedAt: deposit.updated_at,
  };
}

export async function updateSplitTransaction(
  transactionId: string,
  input: UpdateSplitTransactionInput,
): Promise<SplitTransactionCreationResult> {
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "update_split_transaction",
    {
      p_transaction_id: transactionId,
      p_name: input.name,
      p_transaction_remark: input.transactionRemark ?? null,
      p_paid_by: input.paidBy,
      p_amount: input.amount,
      p_parties: input.partiesInvolved,
      p_category: input.category ?? null,
      p_status: input.status,
    } as never,
  );

  if (rpcError) {
    throw new ApiError(
      500,
      "transaction_update_failed",
      rpcError.message,
      rpcError,
    );
  }

  const splitResult = rpcResult?.[0] as SplitTransactionRpcResult | undefined;

  if (!splitResult) {
    throw new ApiError(
      500,
      "transaction_update_failed",
      "Split transaction update RPC returned no rows",
    );
  }

  const transactions = await getTransactionsByGroupKey(splitResult.group_key);

  return {
    groupKey: splitResult.group_key,
    transactionIds: splitResult.transaction_ids,
    transactions,
  };
}

export async function deleteTransaction(transactionId: string): Promise<void> {
  const { error } = await supabase.rpc("soft_delete_transaction_group", {
    p_transaction_id: transactionId,
  } as never);

  if (error) {
    throw new ApiError(500, "transaction_delete_failed", error.message, error);
  }
}

export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
): Promise<SplitTransactionEditDetails> {
  const { error } = await supabase.rpc("update_transaction_group_status", {
    p_transaction_id: transactionId,
    p_status: status,
  } as never);

  if (error) {
    throw new ApiError(
      500,
      "transaction_status_update_failed",
      error.message,
      error,
    );
  }

  return getSplitTransactionEditDetails(transactionId);
}
