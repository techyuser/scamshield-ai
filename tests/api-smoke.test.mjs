import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const PORT = 3056;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // booting
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Timed out waiting for ScamShield server");
}

test("ScamShield AI production server & API smoke suite", async (t) => {
  const server = spawn("pnpm", ["exec", "next", "start", "-p", String(PORT), "-H", "127.0.0.1"], {
    stdio: "ignore",
    detached: false,
  });

  t.after(() => {
    server.kill("SIGTERM");
  });

  await waitForServer();

  await t.test("GET / serves ScamShield AI landing page", async () => {
    const res = await fetch(`${BASE_URL}/`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /ScamShield AI/);
    assert.match(html, /Spot digital scams in seconds\./);
  });

  await t.test("GET /api/health returns ok", async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.ok, true);
  });

  await t.test("POST /api/analyze rejects too-short message with 400", async () => {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    assert.equal(res.status, 400);
  });

  await t.test("POST /api/analyze flags UPI QR PIN scam as CRITICAL_SCAM", async () => {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "upi",
        senderInfo: "OLX Buyer",
        message: "Scan this QR code and enter your UPI PIN to receive ₹2,000 advance right now!",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.verdict, "CRITICAL_SCAM");
    assert.ok(data.riskScore >= 65);
    assert.ok(data.redFlags.length >= 1);
  });

  await t.test("POST /api/analyze classifies genuine prepaid parcel alert as LOOKS_SAFE", async () => {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: "sms",
        senderInfo: "BLUDRT",
        message:
          "Your BlueDart prepaid shipment #BD8841290 is out for delivery. Track in official BlueDart app. No payment is required.",
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.verdict, "LOOKS_SAFE");
    assert.ok(data.riskScore < 32);
  });
});
