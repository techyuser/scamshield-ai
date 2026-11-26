import { NextResponse } from "next/server";
import { GEMINI_MODEL_ID } from "@/lib/constants";
import { hasServerGeminiKey } from "@/lib/gemini-detector";

/**
 * GET /api/health — Lightweight runtime readiness check without exposing secrets.
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      serverGeminiConfigured: hasServerGeminiKey(),
      model: GEMINI_MODEL_ID,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
