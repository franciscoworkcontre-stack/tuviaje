import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function GET() {
  // Block in production — this endpoint leaks internal details
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const steps: string[] = [];
  try {
    steps.push("1. starting");

    const apiKey = process.env.ANTHROPIC_API_KEY;
    // Never expose key prefix, length, or presence in logs
    steps.push(`2. api key configured: ${!!apiKey}`);

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
    // In dev, stack traces are useful
    return NextResponse.json({
      ok: false,
      steps,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
