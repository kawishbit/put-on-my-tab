"use client";

import { signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";

export function LogoutButton(): React.JSX.Element {
  return (
    <Button
      onClick={() => void signOut({ callbackUrl: "/login" })}
      variant="secondary"
      size="sm"
    >
      Logout
    </Button>
  );
}
