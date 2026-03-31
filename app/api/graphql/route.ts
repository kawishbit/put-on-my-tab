import { NextResponse } from "next/server"
import { buildSchema, graphql } from "graphql"
import { supabase } from "@/lib/supabaseServer"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

const schema = buildSchema(`
  type User { id: ID!, name: String, email: String, role: String, current_balance: Float }
  type Transaction { id: ID!, name: String, transaction_remark: String, paid_by: ID, amount: Float, type: String, status: String, group_key: String, category_id: ID, created_at: String }
  type Category { id: ID!, label: String }

  input CreateTransactionInput { name: String, amount: Float!, paidBy: ID, parties: [ID], type: String, status: String, categoryId: ID }

  type Query {
    users: [User]
    transactions(limit: Int, offset: Int): [Transaction]
    categories: [Category]
  }

  type Mutation {
    createCategory(label: String!): Category
    createUser(name: String, email: String!, role: String): User
    createTransaction(input: CreateTransactionInput!): [Transaction]
  }
`)

const root: any = {
  users: async (_: any, __: any, context: any) => {
    const session = context.session
    if (!session) throw new Error("unauthenticated")
    // only admin
    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    if ((dbUser as any)?.role !== "admin") throw new Error("forbidden")
    const { data } = await supabase.from("users").select("id, name, email, role, current_balance")
    return data
  },

  transactions: async ({ limit, offset }: any, __: any, context: any) => {
    const session = context.session
    if (!session) throw new Error("unauthenticated")
    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    const role = (dbUser as any)?.role ?? "user"
    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false })
    if (role !== "admin") query = query.eq("paid_by", (dbUser as any)?.id)
    if (limit) query = query.limit(limit)
    if (offset) query = query.range(offset, (offset || 0) + (limit || 100) - 1)
    const { data } = await query
    return data
  },

  categories: async () => {
    const { data } = await supabase.from("transaction_categories").select("id, label").order("label", { ascending: true })
    return data
  },

  createCategory: async ({ label }: any, __: any, context: any) => {
    const session = context.session
    if (!session) throw new Error("unauthenticated")
    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    if ((dbUser as any)?.role !== "admin") throw new Error("forbidden")
    const { data, error } = await supabase.from("transaction_categories").insert({ label }).select().single()
    if (error) throw error
    return data
  },

  createUser: async ({ name, email, role }: any, __: any, context: any) => {
    const session = context.session
    if (!session) throw new Error("unauthenticated")
    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    if ((dbUser as any)?.role !== "admin") throw new Error("forbidden")
    const { data, error } = await supabase.from("users").insert({ name, email, role }).select().single()
    if (error) throw error
    return data
  },

  createTransaction: async ({ input }: any, __: any, context: any) => {
    const session = context.session
    if (!session) throw new Error("unauthenticated")
    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    const role = (dbUser as any)?.role ?? "user"
    if (!["mod", "admin"].includes(role)) throw new Error("forbidden")

    const amount = input.amount
    const parties = Array.isArray(input.parties) ? input.parties.filter(Boolean) : []
    const paidBy = input.paidBy ?? (dbUser as any)?.id

    if (parties.length > 0) {
      const unique = Array.from(new Set([paidBy, ...parties]))
      const count = unique.length
      if (count === 0) throw new Error("no participants")
      const perShare = parseFloat((amount / count).toFixed(2))
      const remainder = parseFloat((amount - perShare * count).toFixed(2))
      const groupKey = crypto.randomUUID()
      const rows: any[] = []
      rows.push({ name: input.name ?? null, transaction_remark: null, paid_by: paidBy, amount: amount, type: input.type ?? "deposit", status: input.status ?? "completed", group_key: groupKey, category_id: input.categoryId ?? null })
      for (const participant of unique) {
        let share = perShare
        if (participant === paidBy) share = parseFloat((perShare + remainder).toFixed(2))
        rows.push({ name: input.name ?? null, transaction_remark: null, paid_by: participant, amount: share, type: "withdraw", status: input.status ?? "completed", group_key: groupKey, category_id: input.categoryId ?? null })
      }
      const { data, error } = await supabase.from("transactions").insert(rows).select()
      if (error) throw error
      return data
    }

    const payload = { name: input.name ?? null, transaction_remark: null, paid_by: paidBy, amount, type: input.type ?? "withdraw", status: input.status ?? "completed", group_key: input.groupKey ?? null, category_id: input.categoryId ?? null }
    const { data, error } = await supabase.from("transactions").insert(payload).select().single()
    if (error) throw error
    return [data]
  },
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const session = await getServerSession(authOptions)
    const context = { session }
    const result = await graphql({ schema, source: body.query, rootValue: root, contextValue: context, variableValues: body.variables })
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ errors: [{ message: e?.message || 'failed' }] }, { status: 500 })
  }
}
