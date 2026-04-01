import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

import { hasRequiredPolicy, isUserPolicy } from "@/lib/auth/policies";
import type { UserPolicy } from "@/types/database";

type RouteRequirement = {
  allowedPolicies: readonly UserPolicy[];
  methods?: readonly string[];
};

const AUTH_REQUIRED_POLICIES: readonly UserPolicy[] = ["user", "mod", "admin"];

const ROUTE_REQUIREMENTS: Record<string, RouteRequirement> = {
  "/settings": { allowedPolicies: AUTH_REQUIRED_POLICIES },
  "/api/auth/connected-providers": {
    allowedPolicies: AUTH_REQUIRED_POLICIES,
  },
  "/api/auth/change-password": { allowedPolicies: AUTH_REQUIRED_POLICIES },
  "/api/transactions": {
    allowedPolicies: ["mod", "admin"],
    methods: ["POST"],
  },
  "/api/transaction-categories": {
    allowedPolicies: ["admin"],
    methods: ["POST"],
  },
  "/api/users": {
    allowedPolicies: ["admin"],
  },
  "/api/users/reset-password": {
    allowedPolicies: ["admin"],
    methods: ["POST"],
  },
};

function getRouteRequirement(
  pathname: string,
  method: string,
): RouteRequirement | null {
  if (pathname.startsWith("/settings/admin")) {
    return { allowedPolicies: ["admin"] };
  }

  if (
    pathname.startsWith("/api/users/") &&
    pathname !== "/api/users/reset-password"
  ) {
    return { allowedPolicies: ["admin"] };
  }

  for (const [route, requirement] of Object.entries(ROUTE_REQUIREMENTS)) {
    if (pathname !== route) {
      continue;
    }

    if (!requirement.methods || requirement.methods.includes(method)) {
      return requirement;
    }
  }

  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    return { allowedPolicies: AUTH_REQUIRED_POLICIES };
  }

  return null;
}

function unauthorizedResponse(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: {
          code: "unauthorized",
          message: "Authentication required",
        },
      },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function forbiddenResponse(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: {
          code: "forbidden",
          message: "Insufficient policy for this operation",
        },
      },
      { status: 403 },
    );
  }

  return NextResponse.redirect(new URL("/", request.url));
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const requirement = getRouteRequirement(
    request.nextUrl.pathname,
    request.method,
  );

  if (!requirement) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const userId = typeof token?.userId === "string" ? token.userId : null;
  const policy = isUserPolicy(token?.policy) ? token.policy : null;

  if (!userId || !policy) {
    return unauthorizedResponse(request);
  }

  if (!hasRequiredPolicy(policy, requirement.allowedPolicies)) {
    return forbiddenResponse(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/api/:path*"],
};
