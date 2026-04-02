import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { SocialProof } from "@/components/landing/SocialProof";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ItineraryPreview } from "@/components/landing/ItineraryPreview";
import { Features } from "@/components/landing/Features";
import { SEOTools } from "@/components/landing/SEOTools";
import { Pricing } from "@/components/landing/Pricing";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linen">
      <LandingNav />
      <Hero />
      <SocialProof />
      <HowItWorks />
      <ItineraryPreview />
      <Features />
      <SEOTools />
      <Pricing />
      <LandingFooter />
    </div>
  );
}
