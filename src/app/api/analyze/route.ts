import { NextRequest, NextResponse } from "next/server";
import { analyzeMessageWithGemini } from "@/lib/gemini-detector";
import { AnalyzeRequest } from "@/types/scamshield";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<AnalyzeRequest>;
    if (!body.message || typeof body.message !== "string" || body.message.trim().length < 5) {
      return NextResponse.json(
        { error: "Please paste a message of at least 5 characters." },
        { status: 400 }
      );
    }

    const sanitized: AnalyzeRequest = {
      message: body.message.slice(0, 3000),
      channel: body.channel || "whatsapp",
      senderInfo: (body.senderInfo || "").slice(0, 120),
    };

    const overrideKey = req.headers.get("x-gemini-key");
    const result = await analyzeMessageWithGemini(sanitized, overrideKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to analyze message." }, { status: 500 });
  }
}
