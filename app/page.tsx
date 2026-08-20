import type { Metadata } from "next";
import { Faq } from "@/components/landing/Faq";
import { Features } from "@/components/landing/Features";
import { FinalCta } from "@/components/landing/FinalCta";
import { Grounding } from "@/components/landing/Grounding";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { Pricing } from "@/components/landing/Pricing";
import { Problem } from "@/components/landing/Problem";

export const metadata: Metadata = {
  // The root title template appends "— GereeZ"; the landing page is the one
  // place that should carry the full positioning line instead.
  title: {
    absolute: "GereeZ — Гэрээгээ гарын үсэг зурахаасаа өмнө шалгуулаарай",
  },
  description:
    "Гэрээгээ оруулаад нийцлийн оноо, эрсдэлтэй заалт бүрийг Иргэний хуулийн зүйл, заалттай нь холбож ойлгомжтой монголоор аваарай.",
  alternates: { canonical: "/" },
};

/**
 * Public landing page — the front door for a visitor who has never used
 * GereeZ. The signed-in app lives at `/app` (see lib/routes.ts); the proxy
 * sends an authenticated visitor there rather than showing them this page.
 */
export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main className="flex-1">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Grounding />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
