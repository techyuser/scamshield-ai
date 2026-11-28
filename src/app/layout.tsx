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
  keywords: [
    "scam detector",
    "UPI fraud prevention",
    "phishing analyzer",
    "prompt injection guard",
    "Gemini AI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable} dark`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var r=document.documentElement;if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){r.classList.add('capacitor-native');}var raw=localStorage.getItem('scamshield_mobile_settings_v1');if(raw){var s=JSON.parse(raw);var isLight=s.theme==='light'||(s.theme==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches);if(isLight){r.classList.add('theme-light');r.classList.remove('dark');}}}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#06070c] text-zinc-100 antialiased selection:bg-violet-500/30">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-full focus:bg-violet-600 focus:text-white focus:text-xs focus:font-semibold"
        >
          Skip to main content
        </a>
        {/* Soft Atmospheric Glassmorphism Glows (GPU-lightweight radial gradients) */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
          <div
            className="absolute top-[-18%] left-[12%] w-[560px] h-[560px] rounded-full opacity-45"
            style={{
              background: "radial-gradient(circle, rgba(124,58,237,0.38) 0%, rgba(124,58,237,0) 70%)",
            }}
          />
          <div
            className="absolute top-[18%] right-[-8%] w-[480px] h-[480px] rounded-full opacity-40"
            style={{
              background: "radial-gradient(circle, rgba(6,182,212,0.34) 0%, rgba(6,182,212,0) 70%)",
            }}
          />
          <div
            className="absolute bottom-[-20%] left-[32%] w-[520px] h-[520px] rounded-full opacity-35"
            style={{
              background: "radial-gradient(circle, rgba(99,102,241,0.32) 0%, rgba(99,102,241,0) 70%)",
            }}
          />
        </div>
        {children}
      </body>
    </html>
  );
}
