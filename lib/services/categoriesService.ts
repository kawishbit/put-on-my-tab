import { ApiError } from "@/lib/api/errors";
import { supabase } from "@/lib/supabaseServer";
import type {
  TransactionCategory,
  TransactionCategoryInsert,
  TransactionCategoryUpdate,
} from "@/types/database";

export async function listTransactionCategories(): Promise<
  TransactionCategory[]
> {
  const { data, error } = await supabase
    .from("transaction_categories")
    .select("*")
    .eq("is_deleted", false)
    .order("label", { ascending: true });

  if (error) {
    throw new ApiError(500, "categories_fetch_failed", error.message, error);
  }

  return data;
}

export async function createTransactionCategory(
  input: TransactionCategoryInsert,
  actorUserId: string,
): Promise<TransactionCategory> {
  const { data, error } = await supabase
    .from("transaction_categories")
    .insert({
      ...input,
      created_by: actorUserId,
      updated_by: actorUserId,
    } as never)
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "category_create_failed", error.message, error);
  }

  return data;
}

export async function updateTransactionCategory(
  transactionCategoryId: string,
  input: TransactionCategoryUpdate,
  actorUserId: string,
): Promise<TransactionCategory> {
  const { data, error } = await supabase
    .from("transaction_categories")
    .update({ ...input, updated_by: actorUserId } as never)
    .eq("transaction_category_id", transactionCategoryId)
    .eq("is_deleted", false)
    .select("*")
    .single();

  if (error) {
    throw new ApiError(500, "category_update_failed", error.message, error);
  }

  return data;
}

export async function deleteTransactionCategory(
  transactionCategoryId: string,
  actorUserId: string,
): Promise<void> {
  const { error } = await supabase
    .from("transaction_categories")
    .update({ is_deleted: true, updated_by: actorUserId } as never)
    .eq("transaction_category_id", transactionCategoryId)
    .eq("is_deleted", false);

  if (error) {
    throw new ApiError(500, "category_delete_failed", error.message, error);
  }
}
