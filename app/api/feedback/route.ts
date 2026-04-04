import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = process.env.FEEDBACK_EMAIL ?? "hola@tuviaje.app";

export async function POST(req: NextRequest) {
  try {
    const { rating, message, source, context } = await req.json();

    if (!rating) {
      return NextResponse.json({ error: "rating requerido" }, { status: 400 });
    }

    const EMOJI_MAP: Record<number, string> = { 1: "😞", 2: "😐", 3: "😊", 4: "😄", 5: "🤩" };
    const emoji = EMOJI_MAP[rating] ?? "⭐";
    const sourceLabel = source === "trip" ? "Página del viaje" : "Landing page";

    await resend.emails.send({
      from: "tu[viaje] Feedback <onboarding@resend.dev>",
      to: TO_EMAIL,
      subject: `${emoji} Feedback ${rating}/5 — ${sourceLabel}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1A2332;margin-bottom:4px">Nuevo feedback ${emoji}</h2>
          <p style="color:#78909C;font-size:13px;margin-top:0">${sourceLabel} · ${new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" })}</p>

          <div style="background:#F5F0E8;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:0;font-size:28px;letter-spacing:6px">${Array.from({ length: 5 }, (_, i) => i < rating ? "⭐" : "☆").join("")}</p>
            <p style="margin:8px 0 0;color:#1A2332;font-size:22px;font-weight:bold">${rating} / 5</p>
          </div>

          ${message ? `
          <div style="background:#fff;border:1px solid #E0D5C5;border-radius:12px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#37474F;font-size:15px;line-height:1.6">"${message}"</p>
          </div>` : ""}

          ${context ? `
          <div style="background:#EFF6FF;border-radius:8px;padding:12px;margin-top:12px">
            <p style="margin:0;color:#78909C;font-size:11px;font-family:monospace">${context}</p>
          </div>` : ""}
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[feedback]", err);
    return NextResponse.json({ error: "Error enviando feedback" }, { status: 500 });
  }
}
