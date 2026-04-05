import { randomUUID } from "node:crypto";
import { ApiError } from "@/lib/api/errors";
import { supabase } from "@/lib/supabaseServer";
import type {
  Transaction,
  TransactionStatus,
  TransactionType,
} from "@/types/database";

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
  transactionDate?: string;
  paidBy: string;
  amount: number;
  partiesInvolved: string[];
  partySplits?: Record<string, number>;
  category?: string | null;
  status?: TransactionStatus;
}

export interface SplitTransactionCreationResult {
  groupKey: string;
  transactionIds: string[];
  transactions: Transaction[];
}

export interface CreateTransactionInput {
  name: string;
  transactionRemark?: string | null;
  transactionDate?: string;
  paidBy: string;
  amount: number;
  type: TransactionType;
  status?: TransactionStatus;
  category?: string | null;
}

export interface TransactionCreationResult {
  transactionId: string;
  groupKey: string;
  transaction: Transaction;
}

export interface BulkTransactionImportResult {
  importedCount: number;
  failedCount: number;
  failures: string[];
}

export interface TransactionListItem extends Transaction {
  paid_by_user_name: string | null;
  paid_by_user_email: string | null;
  created_by_user_name: string | null;
  created_by_user_email: string | null;
  updated_by_user_name: string | null;
  updated_by_user_email: string | null;
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
  sortBy?: "transaction_date" | "amount" | "name" | "status" | "type";
  sortOrder?: "asc" | "desc";
}

export interface ListTransactionsExportResult {
  items: TransactionListItem[];
  total: number;
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

interface PartySplitRow {
  userId: string;
  amount: number;
}

type GroupIdentityRow = {
  transaction_id: string;
  group_key: string;
};

type TransactionInsertPayload = {
  name: string;
  transaction_remark: string | null;
  transaction_date: string;
  paid_by: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  group_key: string;
  category: string | null;
  is_deleted: boolean;
  remarks: string | null;
  created_by: string;
  updated_by: string;
};

type SingleTransactionImportRecord = {
  name?: unknown;
  transactionRemark?: unknown;
  transaction_date?: unknown;
  transactionDate?: unknown;
  amount?: unknown;
  paidBy?: unknown;
  type?: unknown;
  status?: unknown;
  category?: unknown;
};

type SplitTransactionImportRecord = {
  name?: unknown;
  transactionRemark?: unknown;
  transaction_date?: unknown;
  transactionDate?: unknown;
  amount?: unknown;
  paidBy?: unknown;
  status?: unknown;
  category?: unknown;
  partiesInvolved?: unknown;
  party_splits?: unknown;
  partySplits?: unknown;
};

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function parseTransactionStatus(value: unknown): TransactionStatus {
  if (value === "pending" || value === "cancelled") {
    return value;
  }

  return "completed";
}

function parseTransactionType(value: unknown): TransactionType {
  return value === "withdraw" ? "withdraw" : "deposit";
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveUserIdFromReference(
  reference: string,
  users: UserLookupRow[],
  fieldName: string,
): string {
  const raw = reference.trim();

  if (!raw) {
    throw new Error(`${fieldName} is required.`);
  }

  const exactMatch = users.find((user) => user.user_id === raw);
  if (exactMatch) {
    return exactMatch.user_id;
  }

  const query = normalizeSearchValue(raw);
  const matches = users.filter((user) => {
    const name = normalizeSearchValue(user.name);
    const email = normalizeSearchValue(user.email);
    return name.includes(query) || email.includes(query);
  });

  if (matches.length === 0) {
    throw new Error(
      `${fieldName} "${raw}" did not match any user by id, name, or email.`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `${fieldName} "${raw}" is ambiguous. Use a more specific value or user id.`,
    );
  }

  return matches[0].user_id;
}

function resolveCategoryIdFromReference(
  reference: string | undefined,
  categories: CategoryLookupRow[],
): string | null {
  if (!reference) {
    return null;
  }

  const raw = reference.trim();
  if (!raw) {
    return null;
  }

  const exactMatch = categories.find(
    (category) => category.transaction_category_id === raw,
  );
  if (exactMatch) {
    return exactMatch.transaction_category_id;
  }

  const query = normalizeSearchValue(raw);
  const matches = categories.filter((category) =>
    normalizeSearchValue(category.label).includes(query),
  );

  if (matches.length === 0) {
    throw new Error(
      `category "${raw}" did not match any category by id or label.`,
    );
  }

  if (matches.length > 1) {
    throw new Error(
      `category "${raw}" is ambiguous. Use a more specific value or category id.`,
    );
  }

  return matches[0].transaction_category_id;
}

async function loadImportLookups(): Promise<{
  users: UserLookupRow[];
  categories: CategoryLookupRow[];
}> {
  const [usersResult, categoriesResult] = await Promise.all([
    supabase.from("users").select("user_id,name,email"),
    supabase
      .from("transaction_categories")
      .select("transaction_category_id,label"),
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

  return {
    users: usersResult.data ?? [],
    categories: categoriesResult.data ?? [],
  };
}

function buildPartySplits(
  paidBy: string,
  partiesInvolved: string[],
  amount: number,
  partySplits?: Record<string, number>,
): PartySplitRow[] {
  const participants = Array.from(
    new Set([...partiesInvolved, paidBy].filter(Boolean)),
  );

  if (participants.length === 0) {
    throw new ApiError(
      422,
      "invalid_transaction_parties",
      "At least one party must be included",
    );
  }

  if (partySplits) {
    const splitEntries = Object.entries(partySplits);

    if (splitEntries.length !== participants.length) {
      throw new ApiError(
        422,
        "invalid_party_splits",
        "partySplits must include every involved participant exactly once",
      );
    }

    const participantSet = new Set(participants);
    let splitTotal = 0;

    for (const [userId, splitAmount] of splitEntries) {
      if (!participantSet.has(userId)) {
        throw new ApiError(
          422,
          "invalid_party_splits",
          "partySplits contains users not present in the split",
        );
      }

      if (!Number.isFinite(splitAmount) || splitAmount <= 0) {
        throw new ApiError(
          422,
          "invalid_party_splits",
          "Each party split amount must be a positive number",
        );
      }

      splitTotal += splitAmount;
    }

    if (Math.round(splitTotal * 100) !== Math.round(amount * 100)) {
      throw new ApiError(
        422,
        "invalid_party_splits",
        "Sum of partySplits must equal transaction amount",
      );
    }

    return participants.map((userId) => ({
      userId,
      amount: Number((partySplits[userId] ?? 0).toFixed(2)),
    }));
  }

  const partyCount = participants.length;
  const baseShare = Number((amount / partyCount).toFixed(2));
  let allocated = 0;

  return participants.map((userId, index) => {
    const share =
      index < partyCount - 1
        ? baseShare
        : Number((amount - allocated).toFixed(2));

    allocated += share;
    return { userId, amount: share };
  });
}

async function recomputeUserBalances(actorUserId: string): Promise<void> {
  const { error } = await supabase.rpc("recompute_user_balances", {
    p_actor_user_id: actorUserId,
  } as never);

  if (error) {
    throw new ApiError(500, "balance_recompute_failed", error.message, error);
  }
}

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
  const relatedUserIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.paid_by, row.created_by, row.updated_by])
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const categoryIds = Array.from(
    new Set(
      rows
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [usersResult, categoriesResult] = await Promise.all([
    relatedUserIds.length > 0
      ? supabase
          .from("users")
          .select("user_id,name,email")
          .in("user_id", relatedUserIds)
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
    const createdByUser = row.created_by ? usersById.get(row.created_by) : null;
    const updatedByUser = row.updated_by ? usersById.get(row.updated_by) : null;
    const category = row.category ? categoriesById.get(row.category) : null;

    return {
      ...row,
      paid_by_user_name: paidByUser?.name ?? null,
      paid_by_user_email: paidByUser?.email ?? null,
      created_by_user_name: createdByUser?.name ?? null,
      created_by_user_email: createdByUser?.email ?? null,
      updated_by_user_name: updatedByUser?.name ?? null,
      updated_by_user_email: updatedByUser?.email ?? null,
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
  sortBy?: "transaction_date" | "amount" | "name" | "status" | "type";
  sortOrder?: "asc" | "desc";
}): Promise<TransactionListResult> {
  const page = Math.max(filters?.page ?? 1, 1);
  const pageSize = Math.min(Math.max(filters?.pageSize ?? 20, 1), 100);
  const fromIndex = (page - 1) * pageSize;
  const toIndex = fromIndex + pageSize - 1;

  const sortBy = filters?.sortBy ?? "transaction_date";
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

export async function listTransactionsForExport(
  filters?: ListTransactionsInput,
): Promise<ListTransactionsExportResult> {
  const sortBy = filters?.sortBy ?? "transaction_date";
  const sortOrder = filters?.sortOrder ?? "desc";

  let query = supabase
    .from("transactions")
    .select("*", { count: "exact" })
    .eq("is_deleted", false)
    .order(sortBy, { ascending: sortOrder === "asc" });

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
  };
}

export async function createSplitTransaction(
  input: CreateSplitTransactionInput,
  actorUserId: string,
): Promise<SplitTransactionCreationResult> {
  const groupKey = randomUUID();
  const transactionDate =
    input.transactionDate ?? new Date().toISOString().slice(0, 10);
  const partySplits = buildPartySplits(
    input.paidBy,
    input.partiesInvolved,
    input.amount,
    input.partySplits,
  );

  const { data: depositRows, error: depositError } = await supabase
    .from("transactions")
    .insert({
      name: input.name,
      transaction_remark: input.transactionRemark ?? null,
      transaction_date: transactionDate,
      paid_by: input.paidBy,
      amount: input.amount,
      type: "deposit",
      status: input.status ?? "completed",
      group_key: groupKey,
      category: input.category ?? null,
      is_deleted: false,
      remarks: null,
      created_by: actorUserId,
      updated_by: actorUserId,
    } as never)
    .select("transaction_id")
    .single();

  if (depositError || !depositRows) {
    throw new ApiError(
      500,
      "transaction_create_failed",
      depositError?.message ?? "Failed to insert deposit transaction",
      depositError,
    );
  }

  const depositRow = depositRows as { transaction_id: string };

  const withdrawPayload = partySplits.map((split) => ({
    name: input.name,
    transaction_remark: input.transactionRemark ?? null,
    transaction_date: transactionDate,
    paid_by: split.userId,
    amount: split.amount,
    type: "withdraw" as const,
    status: input.status ?? "completed",
    group_key: groupKey,
    category: input.category ?? null,
    is_deleted: false,
    remarks: null,
    created_by: actorUserId,
    updated_by: actorUserId,
  }));

  const { data: withdrawRows, error: withdrawError } = await supabase
    .from("transactions")
    .insert(withdrawPayload as never)
    .select("transaction_id");

  if (withdrawError) {
    throw new ApiError(
      500,
      "transaction_create_failed",
      withdrawError.message,
      withdrawError,
    );
  }

  const withdrawTransactionRows = (withdrawRows ?? []) as {
    transaction_id: string;
  }[];

  await recomputeUserBalances(actorUserId);

  const transactionIds = [
    depositRow.transaction_id,
    ...withdrawTransactionRows.map((row) => row.transaction_id),
  ];

  const { data: transactions, error: selectError } = await supabase
    .from("transactions")
    .select("*")
    .eq("group_key", groupKey)
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
    groupKey,
    transactionIds,
    transactions,
  };
}

export async function createTransaction(
  input: CreateTransactionInput,
  actorUserId: string,
): Promise<TransactionCreationResult> {
  const groupKey = randomUUID();
  const transactionDate =
    input.transactionDate ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      name: input.name,
      transaction_remark: input.transactionRemark ?? null,
      transaction_date: transactionDate,
      paid_by: input.paidBy,
      amount: input.amount,
      type: input.type,
      status: input.status ?? "completed",
      group_key: groupKey,
      category: input.category ?? null,
      is_deleted: false,
      remarks: null,
      created_by: actorUserId,
      updated_by: actorUserId,
    } as never)
    .select("*")
    .single();

  if (error || !data) {
    throw new ApiError(
      500,
      "transaction_create_failed",
      error?.message ?? "Failed to create transaction",
      error,
    );
  }

  const transaction = data as Transaction;

  await recomputeUserBalances(actorUserId);

  return {
    transactionId: transaction.transaction_id,
    groupKey,
    transaction,
  };
}

export async function importTransactionsFromJson(
  records: unknown[],
  actorUserId: string,
  defaultPaidBy?: string,
): Promise<BulkTransactionImportResult> {
  const { users, categories } = await loadImportLookups();
  const transactionDateFallback = new Date().toISOString().slice(0, 10);

  const rowsToInsert: TransactionInsertPayload[] = [];
  const failures: string[] = [];

  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== "object") {
      failures.push(`Item ${index + 1}: invalid object.`);
      continue;
    }

    try {
      const candidate = record as SingleTransactionImportRecord;
      const name =
        typeof candidate.name === "string" ? candidate.name.trim() : "";

      if (!name) {
        throw new Error("Transaction name is required.");
      }

      const amount = Number(candidate.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Amount must be a positive number.");
      }

      const paidByReference =
        typeof candidate.paidBy === "string"
          ? candidate.paidBy
          : (defaultPaidBy ?? actorUserId);

      const paidBy = resolveUserIdFromReference(
        paidByReference,
        users,
        "paidBy",
      );

      const category = resolveCategoryIdFromReference(
        toOptionalString(candidate.category),
        categories,
      );

      rowsToInsert.push({
        name,
        transaction_remark:
          toOptionalString(candidate.transactionRemark) ?? null,
        transaction_date:
          toOptionalString(candidate.transaction_date) ??
          toOptionalString(candidate.transactionDate) ??
          transactionDateFallback,
        paid_by: paidBy,
        amount,
        type: parseTransactionType(candidate.type),
        status: parseTransactionStatus(candidate.status),
        group_key: randomUUID(),
        category,
        is_deleted: false,
        remarks: null,
        created_by: actorUserId,
        updated_by: actorUserId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import item.";
      failures.push(`Item ${index + 1}: ${message}`);
    }
  }

  if (rowsToInsert.length > 0) {
    const { error } = await supabase
      .from("transactions")
      .insert(rowsToInsert as never);

    if (error) {
      throw new ApiError(
        500,
        "transaction_bulk_import_failed",
        error.message,
        error,
      );
    }

    await recomputeUserBalances(actorUserId);
  }

  return {
    importedCount: rowsToInsert.length,
    failedCount: failures.length,
    failures,
  };
}

export async function importSplitTransactionsFromJson(
  records: unknown[],
  actorUserId: string,
  defaultPaidBy?: string,
): Promise<BulkTransactionImportResult> {
  const { users, categories } = await loadImportLookups();
  const transactionDateFallback = new Date().toISOString().slice(0, 10);

  const rowsToInsert: TransactionInsertPayload[] = [];
  const failures: string[] = [];
  let importedGroups = 0;

  for (const [index, record] of records.entries()) {
    if (!record || typeof record !== "object") {
      failures.push(`Item ${index + 1}: invalid object.`);
      continue;
    }

    try {
      const candidate = record as SplitTransactionImportRecord;
      const name =
        typeof candidate.name === "string" ? candidate.name.trim() : "";

      if (!name) {
        throw new Error("Transaction name is required.");
      }

      const amount = Number(candidate.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Amount must be a positive number.");
      }

      const paidByReference =
        typeof candidate.paidBy === "string"
          ? candidate.paidBy
          : (defaultPaidBy ?? actorUserId);

      const paidBy = resolveUserIdFromReference(
        paidByReference,
        users,
        "paidBy",
      );

      const category = resolveCategoryIdFromReference(
        toOptionalString(candidate.category),
        categories,
      );

      const transactionDate =
        toOptionalString(candidate.transaction_date) ??
        toOptionalString(candidate.transactionDate) ??
        transactionDateFallback;

      const status = parseTransactionStatus(candidate.status);
      const partyReferences = Array.isArray(candidate.partiesInvolved)
        ? candidate.partiesInvolved.filter(
            (value): value is string => typeof value === "string",
          )
        : [];

      const resolvedParties = Array.from(
        new Set(
          partyReferences
            .map((reference) =>
              resolveUserIdFromReference(reference, users, "partiesInvolved"),
            )
            .filter((partyId) => partyId !== paidBy),
        ),
      );

      if (resolvedParties.length === 0) {
        throw new Error("At least one party must be involved.");
      }

      const splitSource = (candidate.party_splits ?? candidate.partySplits) as
        | Record<string, unknown>
        | undefined;

      let resolvedPartySplits: Record<string, number> | undefined;
      if (splitSource && typeof splitSource === "object") {
        resolvedPartySplits = {};

        for (const [participantReference, splitValue] of Object.entries(
          splitSource,
        )) {
          const participantId = resolveUserIdFromReference(
            participantReference,
            users,
            "party_splits",
          );
          const numericSplit = Number(splitValue);

          if (!Number.isFinite(numericSplit) || numericSplit <= 0) {
            throw new Error(
              `Custom split is missing or invalid for participant ${participantReference}.`,
            );
          }

          resolvedPartySplits[participantId] = numericSplit;
        }
      }

      const partySplits = buildPartySplits(
        paidBy,
        resolvedParties,
        amount,
        resolvedPartySplits,
      );
      const groupKey = randomUUID();

      rowsToInsert.push({
        name,
        transaction_remark:
          toOptionalString(candidate.transactionRemark) ?? null,
        transaction_date: transactionDate,
        paid_by: paidBy,
        amount,
        type: "deposit",
        status,
        group_key: groupKey,
        category,
        is_deleted: false,
        remarks: null,
        created_by: actorUserId,
        updated_by: actorUserId,
      });

      for (const split of partySplits) {
        rowsToInsert.push({
          name,
          transaction_remark:
            toOptionalString(candidate.transactionRemark) ?? null,
          transaction_date: transactionDate,
          paid_by: split.userId,
          amount: split.amount,
          type: "withdraw",
          status,
          group_key: groupKey,
          category,
          is_deleted: false,
          remarks: null,
          created_by: actorUserId,
          updated_by: actorUserId,
        });
      }

      importedGroups += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to import item.";
      failures.push(`Item ${index + 1}: ${message}`);
    }
  }

  if (rowsToInsert.length > 0) {
    const { error } = await supabase
      .from("transactions")
      .insert(rowsToInsert as never);

    if (error) {
      throw new ApiError(
        500,
        "transaction_bulk_import_failed",
        error.message,
        error,
      );
    }

    await recomputeUserBalances(actorUserId);
  }

  return {
    importedCount: importedGroups,
    failedCount: failures.length,
    failures,
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
  actorUserId: string,
): Promise<SplitTransactionCreationResult> {
  const identity = await getGroupIdentityByTransactionId(transactionId);
  const groupKey = identity.groupKey;

  const { error: markDeletedError } = await supabase
    .from("transactions")
    .update({ is_deleted: true, updated_by: actorUserId } as never)
    .eq("group_key", groupKey)
    .eq("is_deleted", false);

  if (markDeletedError) {
    throw new ApiError(
      500,
      "transaction_update_failed",
      markDeletedError.message,
      markDeletedError,
    );
  }

  const partySplits = buildPartySplits(
    input.paidBy,
    input.partiesInvolved,
    input.amount,
  );

  const { data: depositRows, error: depositError } = await supabase
    .from("transactions")
    .insert({
      name: input.name,
      transaction_remark: input.transactionRemark ?? null,
      paid_by: input.paidBy,
      amount: input.amount,
      type: "deposit",
      status: input.status,
      group_key: groupKey,
      category: input.category ?? null,
      is_deleted: false,
      remarks: null,
      created_by: actorUserId,
      updated_by: actorUserId,
    } as never)
    .select("transaction_id")
    .single();

  if (depositError || !depositRows) {
    throw new ApiError(
      500,
      "transaction_update_failed",
      depositError?.message ?? "Failed to insert deposit transaction",
      depositError,
    );
  }

  const depositRow = depositRows as { transaction_id: string };

  const withdrawPayload = partySplits.map((split) => ({
    name: input.name,
    transaction_remark: input.transactionRemark ?? null,
    paid_by: split.userId,
    amount: split.amount,
    type: "withdraw" as const,
    status: input.status,
    group_key: groupKey,
    category: input.category ?? null,
    is_deleted: false,
    remarks: null,
    created_by: actorUserId,
    updated_by: actorUserId,
  }));

  const { data: withdrawRows, error: withdrawError } = await supabase
    .from("transactions")
    .insert(withdrawPayload as never)
    .select("transaction_id");

  if (withdrawError) {
    throw new ApiError(
      500,
      "transaction_update_failed",
      withdrawError.message,
      withdrawError,
    );
  }

  const withdrawTransactionRows = (withdrawRows ?? []) as {
    transaction_id: string;
  }[];

  await recomputeUserBalances(actorUserId);

  const transactions = await getTransactionsByGroupKey(groupKey);
  const transactionIds = [
    depositRow.transaction_id,
    ...withdrawTransactionRows.map((row) => row.transaction_id),
  ];

  return {
    groupKey,
    transactionIds,
    transactions,
  };
}

export async function deleteTransaction(
  transactionId: string,
  actorUserId: string,
): Promise<void> {
  const { error } = await supabase.rpc("soft_delete_transaction_group", {
    p_transaction_id: transactionId,
    p_actor_user_id: actorUserId,
  } as never);

  if (error) {
    throw new ApiError(500, "transaction_delete_failed", error.message, error);
  }
}

export async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  actorUserId: string,
): Promise<SplitTransactionEditDetails> {
  const { error } = await supabase.rpc("update_transaction_group_status", {
    p_transaction_id: transactionId,
    p_status: status,
    p_actor_user_id: actorUserId,
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
