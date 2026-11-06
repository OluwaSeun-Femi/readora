import { createHmac, timingSafeEqual } from "node:crypto";

// The admin cookie holds a value derived from ADMIN_PASSCODE, never the passcode itself.
export const ADMIN_COOKIE = "readora_admin";

export function adminToken(passcode: string) {
  return createHmac("sha256", passcode).update("readora-admin-v1").digest("hex");
}

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
