import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data, requestId: randomUUID() }, { status });
}

export function apiError(
  code: string,
  message: string,
  status: number,
  retryable = false,
  details?: unknown,
) {
  return NextResponse.json(
    { error: { code, message, retryable, details }, requestId: randomUUID() },
    { status },
  );
}
