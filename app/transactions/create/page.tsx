import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { TransactionCreateForm } from "@/components/transactions/TransactionCreateForm";
import { authOptions } from "@/lib/auth/options";

export default async function CreateTransactionPage(): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftransactions%2Fcreate");
  }

  if (session.user.policy === "user") {
    redirect("/");
  }

  return <TransactionCreateForm initialPaidByUserId={session.user.id} />;
}
