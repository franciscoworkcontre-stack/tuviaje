import { Hero } from "@/components/landing/Hero";
import { AgentDemo } from "@/components/landing/AgentDemo";
import { SocialProof } from "@/components/landing/SocialProof";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ItineraryPreview } from "@/components/landing/ItineraryPreview";
import { Features } from "@/components/landing/Features";
import { SEOTools } from "@/components/landing/SEOTools";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linen">
      <Hero />
      <AgentDemo />
      <SocialProof />
      <HowItWorks />
      <ItineraryPreview />
      <Features />
      <SEOTools />
      <LandingFooter />
    </div>
  );
}
