"use client"

import { useState } from "react"

type Category = { id: string; label: string }

export default function CategoriesAdmin({ initial }: { initial: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initial)
  const [label, setLabel] = useState("")
  const [loading, setLoading] = useState(false)

  async function createCategory(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      setCategories((s) => [data, ...s])
      setLabel('')
    } catch (err: any) {
      alert(err?.message || 'Failed to create')
    } finally {
      setLoading(false)
    }
  }

  async function deleteCategory(id: string) {
    if (!confirm('Delete category?')) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      setCategories((s) => s.filter((c) => c.id !== id))
    } catch (err: any) {
      alert(err?.message || 'Failed to delete')
    }
  }

  return (
    <div>
      <section className="mb-6 max-w-lg">
        <h2 className="text-lg font-semibold mb-2">Create category</h2>
        <form onSubmit={createCategory} className="flex gap-2">
          <input className="flex-1 rounded border px-3 py-2" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
          <button className="px-4 py-2 bg-primary text-white rounded" disabled={loading}>{loading ? 'Creating…' : 'Create'}</button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Categories</h2>
        <div className="bg-white dark:bg-slate-800 rounded shadow overflow-hidden">
          <table className="w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">{c.label}</td>
                  <td className="px-4 py-3"><button className="text-sm text-red-600 hover:underline" onClick={() => deleteCategory(c.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
