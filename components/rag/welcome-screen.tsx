"use client";

import * as React from "react";
import { ShieldCheck } from "lucide-react";

interface WelcomeScreenProps {
  onExampleClick?: (question: string) => void;
}

export function WelcomeScreen({ onExampleClick }: WelcomeScreenProps) {
  const [greeting, setGreeting] = React.useState("Selamat datang");


  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting("Selamat pagi");
    else if (hour >= 12 && hour < 15) setGreeting("Selamat siang");
    else if (hour >= 15 && hour < 18) setGreeting("Selamat sore");
    else setGreeting("Selamat malam");
  }, []);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-13rem)] max-w-2xl flex-col items-center justify-center px-4 py-8 text-center select-none">
      <div className="animate-fade-in flex flex-col items-center space-y-4">
        {/* Clean Greeting Headline & Subtitle */}
        <div className="space-y-2 max-w-lg">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}, apa yang ingin Anda tanyakan?
          </h2>
          <p className="text-sm sm:text-[15px] leading-relaxed text-muted-foreground">
            Konsultasikan regulasi POJK, rasio keuangan, atau kepatuhan perasuransian. Jawaban disusun langsung dengan rujukan dokumen resmi OJK.
          </p>
        </div>
      </div>
    </div>
  );
}
