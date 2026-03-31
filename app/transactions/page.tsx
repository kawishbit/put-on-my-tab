import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import Link from "next/link"

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const res = await fetch('/api/transactions')
  const transactions = (await res.json()) as Array<{ id: string; name: string; amount: number }>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Link href="/transactions/create" className="text-sm text-primary hover:underline">
          New Transaction
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded shadow overflow-hidden">
        <table className="w-full table-auto">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={2} className="p-6 text-center text-sm text-slate-500">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3">{t.name}</td>
                  <td className="px-4 py-3">${t.amount.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
