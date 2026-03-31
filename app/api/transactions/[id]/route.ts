import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"
import { getServerSession } from "next-auth"
import { authOptions } from "../../auth/[...nextauth]/route"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
  const role = (dbUser as any)?.role ?? "user"

  const { data, error } = await supabase.from("transactions").select("*").eq("id", params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })

  if (role === "admin" || (data as any).paid_by === (dbUser as any)?.id) {
    return NextResponse.json(data)
  }
  return NextResponse.json({ error: "forbidden" }, { status: 403 })
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    const role = (dbUser as any)?.role ?? "user"
    if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 })

    const body = await req.json()

    // Fetch existing transaction to detect group
    const { data: existingTx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', params.id).maybeSingle()
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!existingTx) return NextResponse.json({ error: 'transaction not found' }, { status: 404 })

    const groupKey = (existingTx as any).group_key

    // If this transaction is part of a group and caller requested a group rebuild (body.rebuildGroup===true)
    // or provided parties array, then recreate the entire group so splits remain consistent.
    if (groupKey && (body.rebuildGroup === true || Array.isArray(body.parties))) {
      // Determine parameters for new group
      const amount = typeof body.amount === 'number' ? body.amount : parseFloat(body.amount ?? (existingTx as any).amount)
      const parties = Array.isArray(body.parties) ? body.parties.filter(Boolean) : []
      const paidBy = body.paidBy ?? (existingTx as any).paid_by

      if (parties.length > 0) {
        const unique = Array.from(new Set([paidBy, ...parties]))
        const count = unique.length
        if (count === 0) return NextResponse.json({ error: 'no participants' }, { status: 400 })

        const perShare = parseFloat((amount / count).toFixed(2))
        const remainder = parseFloat((amount - perShare * count).toFixed(2))

        // remove existing group rows
        const { error: delErr } = await supabase.from('transactions').delete().eq('group_key', groupKey)
        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

        // build new rows using the same groupKey
        const rows: any[] = []
        rows.push({
          name: body.name ?? (existingTx as any).name ?? null,
          transaction_remark: body.remark ?? (existingTx as any).transaction_remark ?? null,
          paid_by: paidBy,
          amount: amount,
          type: body.type ?? (existingTx as any).type ?? 'deposit',
          status: body.status ?? (existingTx as any).status ?? 'completed',
          group_key: groupKey,
          category_id: body.categoryId ?? (existingTx as any).category_id ?? null,
        })

        for (const participant of unique) {
          let share = perShare
          if (participant === paidBy) share = parseFloat((perShare + remainder).toFixed(2))
          rows.push({
            name: body.name ?? (existingTx as any).name ?? null,
            transaction_remark: body.remark ?? (existingTx as any).transaction_remark ?? null,
            paid_by: participant,
            amount: share,
            type: 'withdraw',
            status: body.status ?? (existingTx as any).status ?? 'completed',
            group_key: groupKey,
            category_id: body.categoryId ?? (existingTx as any).category_id ?? null,
          })
        }

        const { data, error: insertErr } = await supabase.from('transactions').insert(rows).select()
        if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })
        return NextResponse.json(data)
      }
    }

    // Fallback: update single transaction row
    const { data, error } = await supabase
      .from('transactions')
      .update({
        name: body.name,
        transaction_remark: body.remark,
        amount: body.amount,
        status: body.status,
        type: body.type,
        category_id: body.categoryId,
        group_key: body.groupKey,
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
  const role = (dbUser as any)?.role ?? "user"
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  // Determine if transaction is part of a group and delete group if so
  const { data: existingTx, error: fetchErr } = await supabase.from('transactions').select('*').eq('id', params.id).maybeSingle()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!existingTx) return NextResponse.json({ error: 'transaction not found' }, { status: 404 })

  const groupKey = (existingTx as any).group_key
  if (groupKey) {
    const { error } = await supabase.from('transactions').delete().eq('group_key', groupKey)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { data, error } = await supabase.from('transactions').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
