export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    const body: { error: ApiErrorBody } = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (error.details !== undefined) {
      body.error.details = error.details;
    }

    return Response.json(body, { status: error.status });
  }

  if (error instanceof Error) {
    return Response.json(
      {
        error: {
          code: "internal_error",
          message: error.message || "Unexpected server error",
        } satisfies ApiErrorBody,
      },
      { status: 500 },
    );
  }

  return Response.json(
    {
      error: {
        code: "internal_error",
        message: "Unexpected server error",
      } satisfies ApiErrorBody,
    },
    { status: 500 },
  );
}
