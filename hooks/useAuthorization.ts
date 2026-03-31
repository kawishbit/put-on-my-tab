"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";

import { hasRequiredPolicy, isUserPolicy } from "@/lib/auth/policies";
import type { UserPolicy } from "@/types/database";

type AuthzState = {
  isAuthenticated: boolean;
  policy: UserPolicy | null;
  canAccess: (allowedPolicies: readonly UserPolicy[]) => boolean;
  isLoading: boolean;
};

export function useAuthorization(): AuthzState {
  const { data: session, status } = useSession();

  const policy = isUserPolicy(session?.user?.policy)
    ? session.user.policy
    : null;
  const isAuthenticated = Boolean(session?.user?.id && policy);

  const canAccess = useMemo(() => {
    return (allowedPolicies: readonly UserPolicy[]) => {
      if (!policy) {
        return false;
      }

      return hasRequiredPolicy(policy, allowedPolicies);
    };
  }, [policy]);

  return {
    isAuthenticated,
    policy,
    canAccess,
    isLoading: status === "loading",
  };
}

type UseRequirePolicyOptions = {
  redirectTo?: string;
  loginPath?: string;
};

export function useRequirePolicy(
  allowedPolicies: readonly UserPolicy[],
  options?: UseRequirePolicyOptions,
): AuthzState {
  const authz = useAuthorization();
  const router = useRouter();

  useEffect(() => {
    if (authz.isLoading) {
      return;
    }

    if (!authz.isAuthenticated) {
      router.replace(options?.loginPath ?? "/login");
      return;
    }

    if (!authz.canAccess(allowedPolicies)) {
      router.replace(options?.redirectTo ?? "/");
    }
  }, [allowedPolicies, authz, options?.loginPath, options?.redirectTo, router]);

  return authz;
}
