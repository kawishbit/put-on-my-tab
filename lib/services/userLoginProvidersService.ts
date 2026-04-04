import { ApiError } from "@/lib/api/errors";
import { supabase } from "@/lib/supabaseServer";
import type { ProviderType } from "@/types/database";

type UserLoginProviderRow = {
  user_login_provider_id: string;
  user_id: string;
  is_deleted: boolean;
};

export async function listConnectedProvidersForUser(
  userId: string,
): Promise<ProviderType[]> {
  const { data, error } = await supabase
    .from("user_login_providers")
    .select("provider_type")
    .eq("user_id", userId)
    .eq("is_deleted", false);

  if (error) {
    throw new ApiError(
      500,
      "providers_fetch_failed",
      "Failed to load login providers",
      error,
    );
  }

  const rows = (data ?? []) as Array<{ provider_type: ProviderType }>;
  return rows.map((row) => row.provider_type);
}

export async function linkProviderToUser(
  userId: string,
  providerType: ProviderType,
  providerKey: string,
  actorUserId: string,
): Promise<void> {
  const { data: existingByKey, error: existingByKeyError } = await supabase
    .from("user_login_providers")
    .select("user_login_provider_id,user_id,is_deleted")
    .eq("provider_type", providerType)
    .eq("provider_key", providerKey)
    .maybeSingle();

  if (existingByKeyError) {
    throw new ApiError(
      500,
      "provider_lookup_failed",
      "Failed to check existing provider mapping",
      existingByKeyError,
    );
  }

  if (existingByKey) {
    const typedExistingByKey = existingByKey as Pick<
      UserLoginProviderRow,
      "user_login_provider_id" | "user_id" | "is_deleted"
    >;

    if (
      typedExistingByKey.user_id !== userId &&
      !typedExistingByKey.is_deleted
    ) {
      throw new ApiError(
        409,
        "provider_already_linked",
        "This provider account is already linked to another user",
      );
    }

    const { error: updateError } = await supabase
      .from("user_login_providers")
      .update({
        user_id: userId,
        is_deleted: false,
        updated_by: actorUserId,
      } as never)
      .eq("user_login_provider_id", typedExistingByKey.user_login_provider_id);

    if (updateError) {
      throw new ApiError(
        500,
        "provider_link_failed",
        "Failed to link login provider",
        updateError,
      );
    }

    return;
  }

  const { error: insertError } = await supabase
    .from("user_login_providers")
    .insert({
      user_id: userId,
      provider_type: providerType,
      provider_key: providerKey,
      created_by: actorUserId,
      updated_by: actorUserId,
      is_deleted: false,
      remarks: null,
    } as never);

  if (insertError) {
    throw new ApiError(
      500,
      "provider_link_failed",
      "Failed to link login provider",
      insertError,
    );
  }
}

export async function disconnectProviderForUser(
  userId: string,
  providerType: Extract<ProviderType, "google" | "github">,
  actorUserId: string,
): Promise<void> {
  const connectedProviders = await listConnectedProvidersForUser(userId);
  const isConnected = connectedProviders.includes(providerType);

  if (!isConnected) {
    throw new ApiError(
      404,
      "provider_not_connected",
      "Provider is not connected",
    );
  }

  if (connectedProviders.length <= 1) {
    throw new ApiError(
      400,
      "last_provider_disconnect_blocked",
      "At least one login provider must stay connected",
    );
  }

  const { error } = await supabase
    .from("user_login_providers")
    .update({ is_deleted: true, updated_by: actorUserId } as never)
    .eq("user_id", userId)
    .eq("provider_type", providerType)
    .eq("is_deleted", false);

  if (error) {
    throw new ApiError(
      500,
      "provider_disconnect_failed",
      "Failed to disconnect login provider",
      error,
    );
  }
}

export async function ensureCredentialsProviderForUser(
  userId: string,
  actorUserId: string,
): Promise<void> {
  await linkProviderToUser(userId, "credentials", userId, actorUserId);
}
