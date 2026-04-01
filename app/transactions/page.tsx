import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { TransactionsManagement } from "@/components/transactions/TransactionsManagement";
import { authOptions } from "@/lib/auth/options";

export default async function TransactionsPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftransactions");
  }

  return (
    <TransactionsManagement policy={session.user.policy} initialScope="all" />
  );
}
