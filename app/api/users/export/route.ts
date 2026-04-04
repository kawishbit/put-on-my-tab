import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { buildCsvContent, csvDownloadHeaders } from "@/lib/api/csv";
import { toErrorResponse } from "@/lib/api/errors";
import { listUsers } from "@/lib/services/usersService";

function formatCsvDate(value: string | null): string {
  return value ? new Date(value).toISOString() : "";
}

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["admin"]);

    const users = await listUsers();

    const csv = buildCsvContent(
      [
        "User ID",
        "Name",
        "Email",
        "Policy",
        "Current Balance",
        "Avatar",
        "Last Login Date",
        "Remarks",
        "Created At",
        "Updated At",
      ],
      users.map((user) => [
        user.user_id,
        user.name,
        user.email,
        user.policy,
        user.current_balance,
        user.avatar,
        formatCsvDate(user.last_login_date),
        user.remarks,
        formatCsvDate(user.created_at),
        formatCsvDate(user.updated_at),
      ]),
    );

    const today = new Date().toISOString().slice(0, 10);
    const fileName = `users-${today}.csv`;

    return new Response(csv, {
      status: 200,
      headers: csvDownloadHeaders(fileName),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
