"use client";

import { signOut } from "next-auth/react";

export function LogoutButton(): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: "/login" })}
      className="app-button-secondary px-3 py-1.5"
    >
      Logout
    </button>
  );
}
