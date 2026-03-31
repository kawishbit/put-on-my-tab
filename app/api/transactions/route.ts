import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  // Resolve current user in DB by email
  const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
  const role = (dbUser as any)?.role ?? "user"

  if (role === "admin") {
    const { data, error } = await supabase.from("transactions").select("*").order("created_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [])
  }

  const userId = (dbUser as any)?.id
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("paid_by", userId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const amount = typeof body.amount === "number" ? body.amount : parseFloat(body.amount)
    if (Number.isNaN(amount)) return NextResponse.json({ error: "invalid amount" }, { status: 400 })

    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    const role = (dbUser as any)?.role ?? "user"
    if (!["mod", "admin"].includes(role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }
    // If parties array present, create grouped transactions: one deposit (payer full amount)
    // plus a withdraw per participant (including payer) for equal split.
    const parties = Array.isArray(body.parties) ? body.parties.filter(Boolean) : []
    const paidBy = body.paidBy ?? (dbUser as any)?.id

    if (parties.length > 0) {
      // participants include payer + parties (payer may or may not be present in parties)
      const unique = Array.from(new Set([paidBy, ...parties]))
      const count = unique.length
      if (count === 0) return NextResponse.json({ error: "no participants" }, { status: 400 })

      // rounding to cents
      const perShare = parseFloat((amount / count).toFixed(2))
      const remainder = parseFloat((amount - perShare * count).toFixed(2))
      const groupKey = crypto.randomUUID()

      const rows: any[] = []
      // deposit record for payer
      rows.push({
        name: body.name ?? null,
        transaction_remark: body.remark ?? null,
        paid_by: paidBy,
        amount: amount,
        type: body.type ?? "deposit",
        status: body.status ?? "completed",
        group_key: groupKey,
        category_id: body.categoryId ?? null,
      })

      // withdraws per participant
      for (const participant of unique) {
        let share = perShare
        // add remainder to payer's withdraw so total sums to amount
        if (participant === paidBy) share = parseFloat((perShare + remainder).toFixed(2))

        rows.push({
          name: body.name ?? null,
          transaction_remark: body.remark ?? null,
          paid_by: participant,
          amount: share,
          type: "withdraw",
          status: body.status ?? "completed",
          group_key: groupKey,
          category_id: body.categoryId ?? null,
        })
      }

      const { data, error } = await supabase.from("transactions").insert(rows).select()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data, { status: 201 })
    }

    // single transaction fallback
    const payload = {
      name: body.name ?? null,
      transaction_remark: body.remark ?? null,
      paid_by: body.paidBy ?? null,
      amount: amount,
      type: body.type ?? "withdraw",
      status: body.status ?? "completed",
      group_key: body.groupKey ?? null,
      category_id: body.categoryId ?? null,
    }

    const { data, error } = await supabase.from("transactions").insert(payload).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 })
  }
}
