import { compare, hash } from "bcryptjs";
import { ApiError } from "@/lib/api/errors";
import { ensureCredentialsProviderForUser } from "@/lib/services/userLoginProvidersService";
import { supabase } from "@/lib/supabaseServer";
import type { PublicUser, UserInsert, UserUpdate } from "@/types/database";

const USER_PUBLIC_COLUMNS =
  "user_id,name,email,avatar,current_balance,last_login_date,created_at,updated_at,is_deleted,remarks,policy";
const PASSWORD_SALT_ROUNDS = 12;

type ActiveUserPolicyRow = {
  user_id: string;
  policy: "user" | "mod" | "admin";
  is_deleted: boolean;
};

async function getActiveUserPolicyRow(
  userId: string,
): Promise<ActiveUserPolicyRow> {
  const { data, error } = await supabase
    .from("users")
    .select("user_id,policy,is_deleted")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "user_lookup_failed", error.message, error);
  }

  if (!data) {
    throw new ApiError(404, "user_not_found", "User was not found");
  }

  return data as ActiveUserPolicyRow;
}

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

export async function getUserById(userId: string): Promise<PublicUser> {
  const { data, error } = await supabase
    .from("users")
    .select(USER_PUBLIC_COLUMNS)
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "user_fetch_failed", error.message, error);
  }

  if (!data) {
    throw new ApiError(404, "user_not_found", "User was not found");
  }

  return data as PublicUser;
}

export async function createUser(input: UserInsert): Promise<PublicUser> {
  const hashedPassword = await hash(input.password, PASSWORD_SALT_ROUNDS);

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
      password: await hash(input.password, PASSWORD_SALT_ROUNDS),
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

export async function deleteUser(userId: string): Promise<void> {
  const user = await getActiveUserPolicyRow(userId);

  if (user.policy === "admin") {
    throw new ApiError(
      403,
      "admin_delete_blocked",
      "Admin users cannot be deleted from the app. Delete directly from the database if required.",
    );
  }

  const { error } = await supabase
    .from("users")
    .update({ is_deleted: true } as never)
    .eq("user_id", userId)
    .eq("is_deleted", false);

  if (error) {
    throw new ApiError(500, "user_delete_failed", error.message, error);
  }
}

type UserPasswordRow = {
  user_id: string;
  password: string;
  is_deleted: boolean;
};

async function getActiveUserPasswordRow(
  userId: string,
): Promise<UserPasswordRow> {
  const { data, error } = await supabase
    .from("users")
    .select("user_id,password,is_deleted")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (error) {
    throw new ApiError(
      500,
      "user_password_lookup_failed",
      error.message,
      error,
    );
  }

  if (!data) {
    throw new ApiError(404, "user_not_found", "User was not found");
  }

  return data as UserPasswordRow;
}

export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  nextPassword: string,
): Promise<void> {
  const userRow = await getActiveUserPasswordRow(userId);
  const isCurrentPasswordValid = await compare(
    currentPassword,
    userRow.password,
  );

  if (!isCurrentPasswordValid) {
    throw new ApiError(
      400,
      "invalid_current_password",
      "Current password is incorrect",
    );
  }

  const isPasswordReused = await compare(nextPassword, userRow.password);

  if (isPasswordReused) {
    throw new ApiError(
      400,
      "password_reuse_blocked",
      "New password must be different from your current password",
    );
  }

  const hashedPassword = await hash(nextPassword, PASSWORD_SALT_ROUNDS);

  const { error } = await supabase
    .from("users")
    .update({ password: hashedPassword } as never)
    .eq("user_id", userId)
    .eq("is_deleted", false);

  if (error) {
    throw new ApiError(
      500,
      "user_password_update_failed",
      error.message,
      error,
    );
  }

  await ensureCredentialsProviderForUser(userId);
}

export async function resetUserPassword(
  userId: string,
  nextPassword: string,
): Promise<void> {
  await getActiveUserPasswordRow(userId);

  const hashedPassword = await hash(nextPassword, PASSWORD_SALT_ROUNDS);

  const { error } = await supabase
    .from("users")
    .update({ password: hashedPassword } as never)
    .eq("user_id", userId)
    .eq("is_deleted", false);

  if (error) {
    throw new ApiError(500, "user_password_reset_failed", error.message, error);
  }

  await ensureCredentialsProviderForUser(userId);
}
