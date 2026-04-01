import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth/options";

export default async function AdminDashboardPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Fadmin%2Fdashboard");
  }

  if (session.user.policy !== "admin") {
    redirect("/dashboard");
  }

  redirect("/dashboard");
}
