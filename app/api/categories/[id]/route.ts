import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabase.from("transaction_categories").select("*").eq("id", params.id).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    const role = (dbUser as any)?.role ?? "user"
    if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 })

    const body = await req.json()
    const updates: any = {}
    if (body.label !== undefined) updates.label = body.label

    const { data, error } = await supabase.from("transaction_categories").update(updates).eq("id", params.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

  const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
  const role = (dbUser as any)?.role ?? "user"
  if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 })

  const { data, error } = await supabase.from("transaction_categories").delete().eq("id", params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
