import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabaseServer"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json()
    const { currentPassword, newPassword } = body
    if (!newPassword) return NextResponse.json({ error: 'newPassword required' }, { status: 400 })

    const { data: dbUser } = await supabase.from('users').select('id, password_hash, email').eq('email', session.user?.email).maybeSingle()
    if (!dbUser) return NextResponse.json({ error: 'user not found' }, { status: 404 })

    if (!dbUser.password_hash) return NextResponse.json({ error: 'no existing password set' }, { status: 400 })
    if (!currentPassword) return NextResponse.json({ error: 'currentPassword required' }, { status: 400 })

    const ok = bcrypt.compareSync(currentPassword, dbUser.password_hash)
    if (!ok) return NextResponse.json({ error: 'current password incorrect' }, { status: 403 })

    const newHash = bcrypt.hashSync(newPassword, 10)
    const { error } = await supabase.from('users').update({ password_hash: newHash }).eq('id', (dbUser as any).id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'failed' }, { status: 500 })
  }
}
