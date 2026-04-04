import { FeedbackWidget } from "@/components/FeedbackWidget";

export function FeedbackSection() {
  return (
    <section className="py-16 px-6 bg-linen border-t border-[#E0D5C5]">
      <div className="max-w-md mx-auto text-center">
        <p className="section-label mb-3">Tu opinión</p>
        <h2 className="text-[28px] md:text-[32px] font-bold text-[#1A2332] mb-2">
          ¿Qué te pareció?
        </h2>
        <p className="text-[15px] text-[#78909C] mb-8">
          Estamos construyendo esto en público. Cada feedback va directo al equipo.
        </p>
        <FeedbackWidget source="landing" />
      </div>
    </section>
  );
}
