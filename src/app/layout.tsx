import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScamShield AI — Spot Digital Scams in Seconds",
  description:
    "Paste any suspicious WhatsApp message, SMS, job offer, or UPI request. AI exposes hidden scam tactics and writes a safe reply.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-screen bg-[#06070c] text-zinc-100 antialiased selection:bg-violet-500/30">
        {/* Soft Atmospheric Glassmorphism Blurs */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="ambient-orb absolute top-[-18%] left-[12%] w-[560px] h-[560px] rounded-full bg-violet-600/22 blur-[150px]" />
          <div
            className="ambient-orb absolute top-[18%] right-[-8%] w-[480px] h-[480px] rounded-full bg-cyan-500/18 blur-[150px]"
            style={{ animationDelay: "-5s" }}
          />
          <div
            className="ambient-orb absolute bottom-[-20%] left-[32%] w-[520px] h-[520px] rounded-full bg-indigo-500/16 blur-[160px]"
            style={{ animationDelay: "-9s" }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
