# 🛡️ ScamShield AI — Spot Digital Scams in Seconds

> **Built for PromptWars × Echo Engineer's AI Vibeathon 2026**  
> **Tagline:** *Paste any sketchy message. Know before you click or pay.*

---

## 🎯 Problem It Solves

Everyday WhatsApp job scams, fake bank KYC freeze alerts, shortened phishing URLs, and UPI QR/PIN traps trick millions of people through urgency and impersonation.

**ScamShield AI** inspects any suspicious message in seconds using a **3-Stage AI Pipeline**:
1. **Link & Money Scanner:** Extracts shortened URLs, UPI/fee demands, phone numbers, and panic phrases.
2. **Manipulation Detector:** Identifies psychological tactics (*Reverse UPI PIN Trap*, *Advance-Fee Task Scam*, *Credential/OTP Harvesting*, *Panic & Time-Pressure*).
3. **Clear Action Plan:** Outputs a `0–100` Scam Risk Score, highlighted red-flag snippets, what **not** to do, safe next steps (including India Cybercrime helpline `1930`), and a **1-click safe reply**.

---

## ✨ Features

- **4 Instant 1-Click Demo Cases:** *Fake Job / Task Scam*, *Urgent Bank KYC Freeze*, *UPI QR / Refund Trick*, and *Genuine Delivery Alert* (safe control).
- **Resilient Hybrid Engine:** Uses `gemini-3.5-flash-lite` via `@google/genai` when `GEMINI_API_KEY` is provided, and seamlessly falls back to a built-in deterministic fraud pattern engine offline.
- **`Cmd+K` Quick Actions:** Fast keyboard navigation across demos and exports.

---

## 🚀 Run Locally

```bash
pnpm install
cp .env.example .env.local   # Optional: add GEMINI_API_KEY
pnpm dev
```

Open `http://localhost:3000`.
