import { z } from "zod";

import { getRequestContext, requireAuth, requirePolicy } from "@/lib/api/auth";
import { toErrorResponse } from "@/lib/api/errors";
import { ok } from "@/lib/api/http";
import { parseJson } from "@/lib/api/validation";
import {
  createTransactionCategory,
  listTransactionCategories,
} from "@/lib/services/categoriesService";

const createTransactionCategorySchema = z.object({
  label: z.string().trim().min(1).max(150),
  remarks: z.string().trim().max(1000).nullable().optional(),
});

export async function GET(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requireAuth(context);

    const categories = await listTransactionCategories();
    return ok(categories);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getRequestContext(request);
    requirePolicy(context, ["admin"]);

    const payload = await parseJson(request, createTransactionCategorySchema);

    const category = await createTransactionCategory({
      label: payload.label,
      is_deleted: false,
      remarks: payload.remarks ?? null,
    });

    return ok(category, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
