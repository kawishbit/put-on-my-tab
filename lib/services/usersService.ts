import { hash } from "bcryptjs";
import { ApiError } from "@/lib/api/errors";
import { supabase } from "@/lib/supabaseServer";
import type { PublicUser, UserInsert, UserUpdate } from "@/types/database";

const USER_PUBLIC_COLUMNS =
  "user_id,name,email,avatar,current_balance,last_login_date,created_at,updated_at,is_deleted,remarks,policy";

export async function listUsers(): Promise<PublicUser[]> {
  const { data, error } = await supabase
    .from("users")
    .select(USER_PUBLIC_COLUMNS)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(500, "users_fetch_failed", error.message, error);
  }

  return data as PublicUser[];
}

export async function createUser(input: UserInsert): Promise<PublicUser> {
  const hashedPassword = await hash(input.password, 12);

  const { data, error } = await supabase
    .from("users")
    .insert({
      ...input,
      password: hashedPassword,
    } as never)
    .select(USER_PUBLIC_COLUMNS)
    .single();

  if (error) {
    throw new ApiError(500, "user_create_failed", error.message, error);
  }

  return data as PublicUser;
}

export async function updateUser(
  userId: string,
  input: UserUpdate,
): Promise<PublicUser> {
  let updatePayload: UserUpdate = input;

  if (input.password) {
    updatePayload = {
      ...input,
      password: await hash(input.password, 12),
    };
  }

  const { data, error } = await supabase
    .from("users")
    .update(updatePayload as never)
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .select(USER_PUBLIC_COLUMNS)
    .single();

  if (error) {
    throw new ApiError(500, "user_update_failed", error.message, error);
  }

  return data as PublicUser;
}
