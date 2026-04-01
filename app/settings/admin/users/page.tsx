import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AdminUsersManagement } from "@/components/admin/AdminUsersManagement";
import { authOptions } from "@/lib/auth/options";

export default async function AdminUsersPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fsettings%2Fadmin%2Fusers");
  }

  if (session.user.policy !== "admin") {
    redirect("/settings");
  }

  return <AdminUsersManagement />;
}
