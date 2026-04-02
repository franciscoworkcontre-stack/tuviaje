import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  const steps: string[] = [];
  try {
    steps.push("1. starting");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    steps.push(`2. api key present: ${!!apiKey}, length: ${apiKey?.length ?? 0}, prefix: ${apiKey?.slice(0, 10) ?? "none"}`);

    const client = new Anthropic();
    steps.push("3. client created");

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: "Say OK" }],
    });
    steps.push(`4. claude responded: ${JSON.stringify(msg.content[0])}`);

    return NextResponse.json({ ok: true, steps });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      steps,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}
