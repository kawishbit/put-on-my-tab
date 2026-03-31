import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET() {
  const { data, error } = await supabase.from("transaction_categories").select("*").order("label", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
    const role = (dbUser as any)?.role ?? "user"
    if (role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 })

    const body = await req.json()
    if (!body?.label) return NextResponse.json({ error: "label required" }, { status: 400 })

    const { data, error } = await supabase.from("transaction_categories").insert({ label: body.label }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 })
  }
}
