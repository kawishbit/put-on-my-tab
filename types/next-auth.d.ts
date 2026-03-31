import type { DefaultSession } from "next-auth";

import type { UserPolicy } from "@/types/database";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      policy: UserPolicy;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    policy: UserPolicy;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    policy?: UserPolicy;
  }
}
