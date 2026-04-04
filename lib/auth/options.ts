import { compare } from "bcryptjs";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";

import { emailSchema } from "@/lib/api/validation";
import {
  ensureCredentialsProviderForUser,
  linkProviderToUser,
} from "@/lib/services/userLoginProvidersService";
import { supabase } from "@/lib/supabaseServer";
import type { UserPolicy } from "@/types/database";

type AuthUserRow = {
  user_id: string;
  email: string;
  name: string;
  password: string;
  policy: UserPolicy;
};

type OauthAppUserRow = Omit<AuthUserRow, "password">;

const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const oauthProviderSchema = z.enum(["google", "github"]);

function getOauthProviders(): NextAuthOptions["providers"] {
  const providers: NextAuthOptions["providers"] = [];

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }),
    );
  }

  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHubProvider({
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }),
    );
  }

  return providers;
}

export const authOptions: NextAuthOptions = {
  providers: [
    ...getOauthProviders(),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const { data: user, error } = await supabase
          .from("users")
          .select("user_id,email,name,password,policy,is_deleted")
          .eq("email", parsed.data.email)
          .eq("is_deleted", false)
          .maybeSingle();

        const typedUser = user as AuthUserRow | null;

        if (error || !typedUser) {
          return null;
        }

        const isValidPassword = await compare(
          parsed.data.password,
          typedUser.password,
        );

        if (!isValidPassword) {
          return null;
        }

        await supabase
          .from("users")
          .update({
            last_login_date: new Date().toISOString(),
            updated_by: typedUser.user_id,
          } as never)
          .eq("user_id", typedUser.user_id);

        await ensureCredentialsProviderForUser(
          typedUser.user_id,
          typedUser.user_id,
        );

        return {
          id: typedUser.user_id,
          email: typedUser.email,
          name: typedUser.name,
          policy: typedUser.policy,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      const parsedProvider = oauthProviderSchema.safeParse(account.provider);

      if (!parsedProvider.success) {
        return false;
      }

      const providerKey = account.providerAccountId;

      if (!providerKey) {
        return false;
      }

      const oauthEmail = user.email?.toLowerCase().trim();

      if (!oauthEmail) {
        return false;
      }

      const { data: appUser, error: appUserError } = await supabase
        .from("users")
        .select("user_id,email,name,policy,is_deleted")
        .eq("email", oauthEmail)
        .eq("is_deleted", false)
        .maybeSingle();

      const typedAppUser = appUser as OauthAppUserRow | null;

      if (appUserError || !typedAppUser) {
        return false;
      }

      await linkProviderToUser(
        typedAppUser.user_id,
        parsedProvider.data,
        providerKey,
        typedAppUser.user_id,
      );

      await supabase
        .from("users")
        .update({
          last_login_date: new Date().toISOString(),
          updated_by: typedAppUser.user_id,
        } as never)
        .eq("user_id", typedAppUser.user_id);

      const mutableUser = user as NextAuthUser;
      mutableUser.id = typedAppUser.user_id;
      mutableUser.email = typedAppUser.email;
      mutableUser.name = typedAppUser.name;
      mutableUser.policy = typedAppUser.policy;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.policy = user.policy;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.userId === "string" ? token.userId : "";
        session.user.policy =
          (token.policy as UserPolicy | undefined) ?? "user";
      }

      return session;
    },
  },
};
