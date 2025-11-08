"use client";

import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { SignInPage } from "@/components/sign-in-flow-1";

interface LandingHeroProps {
  onSuccess: () => void;
}

export function LandingHero({ onSuccess }: LandingHeroProps) {
  return (
    <div className="relative w-full min-h-screen">
      <div className="absolute inset-0">
        <HeroGeometric />
      </div>
      
      <div className="relative z-50">
        <SignInPage onSuccess={onSuccess} />
      </div>
    </div>
  );
}
