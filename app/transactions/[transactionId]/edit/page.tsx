import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { TransactionEditForm } from "@/components/transactions/TransactionEditForm";
import { authOptions } from "@/lib/auth/options";

type PageProps = {
  params: Promise<{
    transactionId: string;
  }>;
};

export default async function EditTransactionPage(
  props: PageProps,
): Promise<React.JSX.Element> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=%2Ftransactions");
  }

  if (session.user.policy !== "admin") {
    redirect("/dashboard");
  }

  const { transactionId } = await props.params;

  return <TransactionEditForm transactionId={transactionId} />;
}
