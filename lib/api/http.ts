export interface ApiSuccess<TData> {
  data: TData;
}

export function ok<TData>(data: TData, status = 200): Response {
  return Response.json({ data } satisfies ApiSuccess<TData>, { status });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}
