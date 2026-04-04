"use client";

import { useState } from "react";

const RATINGS = [
  { value: 1, emoji: "😞", label: "Malo" },
  { value: 2, emoji: "😐", label: "Regular" },
  { value: 3, emoji: "😊", label: "Bueno" },
  { value: 4, emoji: "😄", label: "Muy bueno" },
  { value: 5, emoji: "🤩", label: "Excelente" },
];

interface Props {
  source: "landing" | "trip";
  context?: string;          // e.g. "NYC → París → Roma, 14 días"
  className?: string;
}

export function FeedbackWidget({ source, context, className = "" }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit() {
    if (!rating) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message, source, context }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className={`text-center py-6 ${className}`}>
        <p className="text-[28px] mb-2">🙌</p>
        <p className="text-[15px] font-semibold text-[#1A2332]">¡Gracias por tu feedback!</p>
        <p className="text-[13px] text-[#78909C] mt-1">Nos ayuda a mejorar el producto.</p>
      </div>
    );
  }

  const active = hovered ?? rating;

  return (
    <div className={className}>
      {/* Emoji rating row */}
      <div className="flex justify-center gap-3 mb-4">
        {RATINGS.map(({ value, emoji, label }) => (
          <button
            key={value}
            onClick={() => setRating(value)}
            onMouseEnter={() => setHovered(value)}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
            aria-label={label}
          >
            <span
              className="text-[32px] leading-none transition-all duration-150"
              style={{ filter: active && active !== value ? "grayscale(1) opacity(0.4)" : "none" }}
            >
              {emoji}
            </span>
            <span
              className="text-[10px] font-semibold transition-colors duration-150"
              style={{ color: active === value ? "#1565C0" : "#B0BEC5" }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Message box — always visible */}
      <div className="mt-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="¿Qué no funcionó? ¿Qué mejorarías? (opcional)"
          rows={3}
          className="w-full text-[13px] px-3 py-2.5 rounded-xl border border-[#E0D5C5] bg-white resize-none focus:outline-none focus:border-ocean text-[#37474F] placeholder:text-[#B0BEC5]"
        />
        <button
          onClick={submit}
          disabled={!rating || status === "sending"}
          className="mt-2 w-full btn btn-primary text-[13px] min-h-[40px] justify-center disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Enviando..." : "Enviar feedback →"}
        </button>
        {!rating && (
          <p className="text-[11px] text-[#B0BEC5] text-center mt-1">Selecciona una valoración para enviar</p>
        )}
        {status === "error" && (
          <p className="text-[11px] text-red-500 text-center mt-1">Error al enviar. Intenta de nuevo.</p>
        )}
      </div>
    </div>
  );
}
