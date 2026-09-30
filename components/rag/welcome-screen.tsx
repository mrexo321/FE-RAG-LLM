"use client";

import { ArrowUpRight, ShieldCheck } from "lucide-react";

const PROMPTS = [
  { topic: "Permodalan", text: "Berapa rasio RBC minimum yang wajib dipenuhi?" },
  { topic: "Perhitungan", text: "Apa itu NDM dan bagaimana cara perhitungannya?" },
  { topic: "Struktur peraturan", text: "Apa isi Bagian Kesatu BAB II POJK 6/2022?" },
  { topic: "Pelaporan", text: "Jelaskan kewajiban pelaporan perusahaan asuransi ke OJK" },
];

interface WelcomeScreenProps {
  onExampleClick: (question: string) => void;
}

export function WelcomeScreen({ onExampleClick }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-4 py-10">
      <div className="animate-fade-in space-y-8">
        <div className="space-y-3">
          <h2 className="max-w-xl text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
            Tanya regulasi asuransi, jawaban disertai rujukan pasal.
          </h2>
          <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Setiap jawaban disusun dari dokumen resmi POJK. Buka kutipan di
            bawah jawaban untuk mencocokkannya dengan sumber aslinya.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PROMPTS.map(({ topic, text }) => (
            <button
              key={text}
              onClick={() => onExampleClick(text)}
              className="group flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex items-center justify-between text-xs font-medium text-primary">
                {topic}
                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
              </span>
              <span className="text-sm leading-relaxed text-foreground">{text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
