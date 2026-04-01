import { z } from "zod";

import { getRequestContext, requirePolicy } from "@/lib/api/auth";
import { ApiError, toErrorResponse } from "@/lib/api/errors";
import { noContent, ok } from "@/lib/api/http";
import { parseJson, uuidSchema } from "@/lib/api/validation";
import {
  deleteTransactionCategory,
  updateTransactionCategory,
} from "@/lib/services/categoriesService";

const updateTransactionCategorySchema = z
  .object({
    label: z.string().trim().min(1).max(150).optional(),
    remarks: z.string().trim().max(1000).nullable().optional(),
  })
  .refine((value) => value.label !== undefined || value.remarks !== undefined, {
    message: "At least one field is required to update a category",
  });

function parseCategoryId(rawCategoryId: string): string {
  const parsed = uuidSchema.safeParse(rawCategoryId);

  if (!parsed.success) {
    throw new ApiError(422, "validation_error", "Invalid category id");
  }

  return parsed.data;
}

type RouteContext = {
  params: Promise<{
    categoryId: string;
  }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["admin"]);

    const { categoryId: rawCategoryId } = await context.params;
    const categoryId = parseCategoryId(rawCategoryId);

    const payload = await parseJson(request, updateTransactionCategorySchema);

    const updatedCategory = await updateTransactionCategory(categoryId, {
      label: payload.label,
      remarks: payload.remarks,
    });

    return ok(updatedCategory);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const requestContext = await getRequestContext(request);
    requirePolicy(requestContext, ["admin"]);

    const { categoryId: rawCategoryId } = await context.params;
    const categoryId = parseCategoryId(rawCategoryId);

    await deleteTransactionCategory(categoryId);

    return noContent();
  } catch (error) {
    return toErrorResponse(error);
  }
}
