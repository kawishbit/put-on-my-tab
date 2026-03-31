import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import { supabase } from "@/lib/supabaseServer"
import CategoriesAdmin from "@/components/categoriesAdmin"

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions)
  if (!session) return <div>Please sign in.</div>

  const { data: dbUser } = await supabase.from("users").select("id, role").eq("email", session.user?.email).maybeSingle()
  const role = (dbUser as any)?.role ?? "user"
  if (role !== "admin") return <div>Forbidden</div>

  const { data: categories } = await supabase.from("transaction_categories").select("id, label").order("label", { ascending: true })

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Transaction Categories</h1>
      <CategoriesAdmin initial={(categories ?? []) as any} />
    </div>
  )
}
