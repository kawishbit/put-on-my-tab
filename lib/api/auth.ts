import { getServerSession } from "next-auth";
import { ApiError } from "@/lib/api/errors";

import { authOptions } from "@/lib/auth/options";
import { isUserPolicy } from "@/lib/auth/policies";
import type { UserPolicy } from "@/types/database";

export interface RequestContext {
  userId: string | null;
  policy: UserPolicy | null;
}

export async function getRequestContext(
  request: Request,
): Promise<RequestContext> {
  const session = await getServerSession(authOptions);

  if (session?.user?.id && session.user.policy) {
    return {
      userId: session.user.id,
      policy: session.user.policy,
    };
  }

  const userId = request.headers.get("x-user-id");
  const requestedPolicy = request.headers.get("x-user-policy");

  const policy = isUserPolicy(requestedPolicy) ? requestedPolicy : null;

  return {
    userId,
    policy,
  };
}

export function requireAuth(context: RequestContext): asserts context is {
  userId: string;
  policy: UserPolicy;
} {
  if (!context.userId || !context.policy) {
    throw new ApiError(401, "unauthorized", "Missing authentication context");
  }
}

export function requirePolicy(
  context: RequestContext,
  allowedPolicies: UserPolicy[],
): asserts context is {
  userId: string;
  policy: UserPolicy;
} {
  requireAuth(context);

  if (!allowedPolicies.includes(context.policy)) {
    throw new ApiError(
      403,
      "forbidden",
      "Insufficient policy for this operation",
    );
  }
}
