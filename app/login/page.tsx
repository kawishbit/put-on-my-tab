"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await signIn("credentials", { redirect: true, email, password, callbackUrl: "/" })
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <main className="w-full max-w-md p-8 bg-white dark:bg-slate-800 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Sign in</h1>

        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            <Button variant="outline" onClick={() => signIn(undefined, { callbackUrl: "/" })}>
              Guest
            </Button>
          </div>
        </form>

        <div className="mt-6">
          <div className="mb-2 text-sm text-muted-foreground">Or continue with</div>
          <div className="flex gap-2">
            <Button onClick={() => signIn("google", { callbackUrl: "/" })} variant="secondary">
              Google
            </Button>
            <Button onClick={() => signIn("github", { callbackUrl: "/" })} variant="secondary">
              GitHub
            </Button>
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground">Account creation is by admin only.</p>
      </main>
    </div>
  )
}
