import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "@/db";

export const MEMBER_COOKIE = "readora_member";

// Sessions are signed with SESSION_SECRET (or, if that isn't set, the database URL, which is already secret).
function secret() {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || "readora-dev";
}

/* PINs are stored as "scrypt$salt$hash". */
export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, 32).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPin(pin: string, stored: string | null) {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(pin, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function newPin() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** The cookie value: member id plus a signature that changes when their PIN is reset. */
export function sessionValue(memberId: number, pinHash: string) {
  const signature = createHmac("sha256", secret()).update(`${memberId}:${pinHash}`).digest("hex");
  return `${memberId}.${signature}`;
}

export type SignedInMember = { id: number; name: string };

/** The member signed in on this browser, or null. Resetting a PIN signs them out everywhere. */
export async function currentMember(): Promise<SignedInMember | null> {
  const value = (await cookies()).get(MEMBER_COOKIE)?.value;
  if (!value) return null;
  const [idText, signature] = value.split(".");
  const id = Number(idText);
  if (!Number.isInteger(id) || id <= 0 || !signature) return null;

  const [member] = await sql<{ id: number; name: string; pin_hash: string | null }[]>`
    select id, name, pin_hash from members where id = ${id}
  `;
  if (!member?.pin_hash) return null;
  const expected = sessionValue(member.id, member.pin_hash).split(".")[1];
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id: member.id, name: member.name };
}

/** Phone numbers are matched on their last 10 digits, so "0803…" and "+234 803…" are the same. */
export function phoneKey(phone: string) {
  return phone.replace(/\D/g, "").slice(-10);
}
