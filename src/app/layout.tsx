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
      <body className="min-h-screen bg-[#07080d] text-zinc-100 antialiased selection:bg-violet-500/30">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-15%] left-[18%] w-[520px] h-[520px] rounded-full bg-violet-600/20 blur-[130px]" />
          <div className="absolute bottom-[-12%] right-[14%] w-[460px] h-[460px] rounded-full bg-cyan-500/15 blur-[125px]" />
        </div>
        {children}
      </body>
    </html>
  );
}
