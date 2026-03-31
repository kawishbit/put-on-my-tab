import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: dbUser } = await supabase.from('users').select('id').eq('email', session.user?.email).maybeSingle()
  if (!dbUser) return NextResponse.json([], { status: 200 })

  const { data, error } = await supabase.from('user_login_providers').select('id, provider_type, provider_key, created_at').eq('user_id', (dbUser as any).id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json()
    const providerType = body.providerType
    if (!providerType) return NextResponse.json({ error: 'providerType required' }, { status: 400 })

    const { data: dbUser } = await supabase.from('users').select('id').eq('email', session.user?.email).maybeSingle()
    if (!dbUser) return NextResponse.json({ error: 'user not found' }, { status: 404 })

    const { error } = await supabase.from('user_login_providers').delete().eq('user_id', (dbUser as any).id).eq('provider_type', providerType)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 })
  }
}
