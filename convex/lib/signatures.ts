export type Envelope = { timestamp: number; nonce: string; payload: string; signature: string };
const encoder = new TextEncoder();
async function key(secret: string) {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function signEnvelope(payload: unknown, secret: string, now = Date.now()): Promise<Envelope> {
  const envelope = { timestamp: now, nonce: crypto.randomUUID(), payload: JSON.stringify(payload), signature: "" };
  const bytes = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(`${envelope.timestamp}.${envelope.nonce}.${envelope.payload}`));
  envelope.signature = Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2, "0")).join("");
  return envelope;
}
export async function verifyEnvelope(value: unknown, secret: string, now = Date.now()): Promise<Envelope> {
  if (!value || typeof value !== "object") throw new Error("Invalid envelope");
  const e = value as Record<string, unknown>;
  if (typeof e.timestamp !== "number" || !Number.isFinite(e.timestamp) || Math.abs(now - e.timestamp) > 300_000 || typeof e.nonce !== "string" || e.nonce.length < 16 || e.nonce.length > 100 || typeof e.payload !== "string" || e.payload.length > 32_000 || typeof e.signature !== "string" || !/^[a-f0-9]{64}$/.test(e.signature)) throw new Error("Invalid signature or timestamp");
  const bytes = Uint8Array.from(e.signature.match(/../g)!, n => parseInt(n, 16));
  const valid = await crypto.subtle.verify("HMAC", await key(secret), bytes, encoder.encode(`${e.timestamp}.${e.nonce}.${e.payload}`));
  if (!valid) throw new Error("Invalid signature");
  return e as Envelope;
}
