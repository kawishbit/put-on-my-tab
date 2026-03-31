import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { supabase } from "@/lib/supabaseServer"
import UsersAdmin from "@/components/usersAdmin"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) return (
    // server->client redirect
    // Note: Next.js server redirect not used here to keep simple; client will be shown sign in link
    <div>Please sign in as admin.</div>
  )

  // ensure admin
  const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
  const role = (dbUser as any)?.role ?? "user"
  if (role !== "admin") return <div>Forbidden</div>

  const { data: users } = await supabase.from("users").select("id, name, email, role, current_balance")

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">User Management</h1>
      {/* initial users fetched server-side passed into client component */}
      <UsersAdmin initialUsers={(users ?? []) as any} />
    </div>
  )
}
