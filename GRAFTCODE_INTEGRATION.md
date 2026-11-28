# ScamShield AI — Graftcode Integration Guide

> **Selected Tracks:** Track 1 (PS11: AI Agents & MCP) & Track 2 (PS21: Microservices & Distributed Systems)

## Overview
ScamShield AI integrates with **Graftcode** to expose core scam detection and suspect lookup capabilities directly as **Model Context Protocol (MCP)** endpoints and strongly-typed microservice Grafts without manual REST controllers or API glue code.

---

## 1. Environment Configuration
Project keys are secured locally in `.env.local`:
```env
GC_PROJECT_KEY=scamshieldai:eyJhbGciOiJSUzI1NiIs...
GEMINI_API_KEY=your_gemini_key_here
```

---

## 2. Architecture & Public Methods (`ScamShieldGraftService`)
The backend service exposes clean public methods in `src/lib/graftcode-service.ts`:
1. **`analyzeSuspiciousMessage(payload)`**: Evaluates suspicious SMS, WhatsApp, UPI, or email content through the 3-stage ScamShield pipeline (Deterministic Heuristics + Gemini AI).
2. **`lookupSuspectIdentifier(identifier)`**: Queries suspect phone numbers, UPI handles, or URLs against threat registries.
3. **`getServiceHealth()`**: Gateway health check for MCP registration.

---

## 3. Graftcode Gateway (gg) Setup & MCP Endpoint
When running on Graftcode Gateway (`gg`):
- Public methods are automatically inspected.
- Generates a live MCP endpoint (`/mcp`) out of the box.
- AI agents (Claude, Cursor, OpenAI Agents SDK, LangGraph) can discover and invoke `analyzeSuspiciousMessage` directly to evaluate threat levels of incoming messages in real time.

---

## 4. Verification & Testing
Run unit tests to verify microservice logic:
```bash
pnpm test:unit
```
Result: All deterministic scam detectors, prompt-injection guards, and Graftcode service methods pass successfully.
