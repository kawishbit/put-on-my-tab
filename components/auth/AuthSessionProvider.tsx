"use client";

import { SessionProvider } from "next-auth/react";

type AuthSessionProviderProps = {
  children: React.ReactNode;
};

export function AuthSessionProvider({
  children,
}: AuthSessionProviderProps): React.JSX.Element {
  return <SessionProvider>{children}</SessionProvider>;
}
