import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AdminCategoriesManagement } from "@/components/admin/AdminCategoriesManagement";
import { authOptions } from "@/lib/auth/options";

export default async function AdminCategoriesPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fsettings%2Fadmin%2Fcategories");
  }

  if (session.user.policy !== "admin") {
    redirect("/settings");
  }

  return <AdminCategoriesManagement />;
}
