import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminToken, safeEqual } from "./admin-token";

/** The admin area is locked only when ADMIN_PASSCODE is set. */
export function adminLocked() {
  return Boolean(process.env.ADMIN_PASSCODE);
}

export async function isAdmin() {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return true;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value && safeEqual(value, adminToken(passcode)));
}
