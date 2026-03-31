import type { UserPolicy } from "@/types/database";

export const VALID_POLICIES: readonly UserPolicy[] = ["user", "mod", "admin"];

export function isUserPolicy(value: unknown): value is UserPolicy {
  return (
    typeof value === "string" &&
    (VALID_POLICIES as readonly string[]).includes(value)
  );
}

export function hasRequiredPolicy(
  policy: UserPolicy,
  allowedPolicies: readonly UserPolicy[],
): boolean {
  return allowedPolicies.includes(policy);
}
