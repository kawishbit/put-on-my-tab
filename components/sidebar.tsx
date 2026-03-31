"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar() {
  const path = usePathname()

  const items = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/transactions", label: "Transactions" },
    { href: "/users", label: "Users" },
    { href: "/categories", label: "Categories" },
    { href: "/settings", label: "Settings" },
  ]

  "use client"

  import Link from "next/link"
  import { usePathname } from "next/navigation"
  import { useSession, signOut } from "next-auth/react"

  export default function Sidebar() {
    const path = usePathname()
    const { data: session } = useSession()

    const items = [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/transactions", label: "Transactions" },
      { href: "/users", label: "Users" },
      { href: "/categories", label: "Categories" },
      { href: "/settings", label: "Settings" },
    ]

    const role = (session as any)?.user?.role ?? "user"

    const filtered = items.filter((it) => {
      if (role === "admin") return true
      if (role === "mod") return it.href !== "/users"
      return ["/dashboard", "/transactions", "/settings"].includes(it.href)
    })

    return (
      <aside className="w-64 bg-white dark:bg-slate-800 border-r min-h-screen p-4">
        <div className="mb-4 font-semibold text-lg">PutOnMyTab</div>

        <div className="mb-4 text-sm text-muted-foreground">
          <div>{session?.user?.name ?? session?.user?.email ?? "Guest"}</div>
          <div className="text-xs text-slate-500">Balance: {(session as any)?.user?.balance ?? "—"}</div>
        </div>

        <nav className="flex flex-col space-y-1">
          {filtered.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`block px-3 py-2 rounded ${path === it.href ? "bg-slate-100 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
              {it.label}
            </Link>
          ))}
        </nav>

        <div className="mt-6">
          {session ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-red-600 hover:underline"
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="text-sm text-primary hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </aside>
    )
  }
