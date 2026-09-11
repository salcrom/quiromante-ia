import { NextResponse } from "next/server";
import { processNextVisionJob } from "@/lib/vision-worker";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.VISION_WORKER_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("authorization");
  return provided === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Unauthorized" } }, { status: 401 });
  }

  try {
    const result = await processNextVisionJob();
    return NextResponse.json({ data: result }, { status: result.status === "idle" ? 200 : 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "VISION_WORKER_FATAL_ERROR";
    return NextResponse.json(
      { error: { code: "VISION_WORKER_FATAL_ERROR", message, retryable: true } },
      { status: 500 },
    );
  }
}
