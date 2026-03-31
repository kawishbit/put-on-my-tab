"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function CreateTransactionPage() {
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, amount: parseFloat(amount) || 0 }),
      })
      if (!res.ok) throw new Error('failed')
      router.push('/transactions')
    } catch (err) {
      console.error(err)
      alert('Failed to create transaction')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Create Transaction</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Amount</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            step="0.01"
          />
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-white rounded">Create</button>
        </div>
      </form>
    </div>
  )
}
