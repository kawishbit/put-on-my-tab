"use client"

import { useState } from "react"

type User = { id: string; name?: string; email: string; role?: string; current_balance?: number }

export default function UsersAdmin({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("user")
  const [loading, setLoading] = useState(false)

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "failed")
      setUsers((s) => [data, ...s])
      setName("")
      setEmail("")
      setPassword("")
    } catch (err: any) {
      alert(err?.message || "Failed to create user")
    } finally {
      setLoading(false)
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "failed")
      setUsers((s) => s.filter((u) => u.id !== id))
    } catch (err: any) {
      alert(err?.message || "Failed to delete")
    }
  }

  return (
    <div>
      <section className="mb-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-2">Create user</h2>
        <form onSubmit={createUser} className="space-y-2">
          <input className="w-full rounded border px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="w-full rounded border px-3 py-2" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <select className="w-full rounded border px-3 py-2" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="mod">Mod</option>
            <option value="admin">Admin</option>
          </select>
          <div>
            <button className="px-4 py-2 bg-primary text-white rounded" disabled={loading}>
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">All users</h2>
        <div className="bg-white dark:bg-slate-800 rounded shadow overflow-hidden">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{typeof u.current_balance === 'number' ? u.current_balance.toFixed(2) : '—'}</td>
                  <td className="px-4 py-3">
                    <button className="text-sm text-red-600 hover:underline" onClick={() => deleteUser(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
