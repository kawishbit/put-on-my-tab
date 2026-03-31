"use client"

import { useEffect, useState } from 'react'
import { getProviders, signIn } from 'next-auth/react'

export default function SettingsPageClient() {
  const [providers, setProviders] = useState<any[]>([])
  const [linked, setLinked] = useState<any[]>([])
  const [cur, setCur] = useState({ currentPassword: '', newPassword: '' })

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/providers')
      if (res.ok) setLinked(await res.json())
    }
    load()
  }, [])

  async function unlink(providerType: string) {
    if (!confirm('Unlink ' + providerType + '?')) return
    const res = await fetch('/api/providers', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerType }) })
    if (res.ok) {
      setLinked((s) => s.filter((p) => p.provider_type !== providerType))
      alert('Unlinked')
    } else {
      alert('Failed')
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!cur.currentPassword || !cur.newPassword) { alert('Fill both'); return }
    const res = await fetch('/api/users/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cur) })
    if (res.ok) { alert('Password changed') ; setCur({ currentPassword: '', newPassword: '' }) } else { const d = await res.json(); alert(d?.error || 'Failed') }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">Settings</h1>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Linked providers</h2>
        <div className="flex gap-2 mb-2">
          <button onClick={() => signIn('google', { callbackUrl: '/settings' })} className="px-3 py-2 bg-primary text-white rounded">Link Google</button>
          <button onClick={() => signIn('github', { callbackUrl: '/settings' })} className="px-3 py-2 bg-primary text-white rounded">Link GitHub</button>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded shadow p-4">
          {linked.length === 0 ? <div className="text-sm text-slate-500">No linked providers</div> : (
            linked.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>{p.provider_type}</div>
                <button className="text-sm text-red-600" onClick={() => unlink(p.provider_type)}>Unlink</button>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Change password</h2>
        <form onSubmit={changePassword} className="space-y-2">
          <input placeholder="Current password" type="password" className="w-full rounded border px-3 py-2" value={cur.currentPassword} onChange={(e) => setCur((s) => ({ ...s, currentPassword: e.target.value }))} />
          <input placeholder="New password" type="password" className="w-full rounded border px-3 py-2" value={cur.newPassword} onChange={(e) => setCur((s) => ({ ...s, newPassword: e.target.value }))} />
          <div><button className="px-4 py-2 bg-primary text-white rounded">Change password</button></div>
        </form>
      </section>
    </div>
  )
}
