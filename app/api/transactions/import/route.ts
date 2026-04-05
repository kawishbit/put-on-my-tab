import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { importTransactionsFromJson } from "@/lib/services/transactionsService";

async function parseImportPayload(request: Request): Promise<{
  records: unknown[];
  defaultPaidBy?: string;
}> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw new ApiError(
      400,
      "invalid_form_data",
      "Request body must be multipart/form-data",
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new ApiError(422, "validation_error", "A JSON file is required.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text()) as unknown;
  } catch {
    throw new ApiError(422, "invalid_json", "Uploaded file must be valid JSON");
  }

  const records = Array.isArray(parsed) ? parsed : [parsed];
  if (records.length === 0) {
    throw new ApiError(422, "validation_error", "JSON file is empty");
  }

  const defaultPaidByValue = formData.get("defaultPaidBy");
  const defaultPaidBy =
    typeof defaultPaidByValue === "string" &&
    defaultPaidByValue.trim().length > 0
      ? defaultPaidByValue.trim()
      : undefined;

  return {
    records,
    defaultPaidBy,
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["mod", "admin"]);

    const { records, defaultPaidBy } = await parseImportPayload(request);
    const imported = await importTransactionsFromJson(
      records,
      context.userId,
      defaultPaidBy,
    );

    return ok(imported, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
