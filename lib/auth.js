import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "pma_admin_session";
const SESSION_HOURS = 8;

function signature(value) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createSessionToken(username) {
  const expires = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = username + ":" + expires;
  return { value: expires + "." + signature(payload), expires };
}

export function isAuthenticated(request) {
  try {
    const username = process.env.ADMIN_USERNAME;
    const cookieHeader = request.headers.get("cookie") || "";
    const token = cookieHeader.split(";").map(x => x.trim()).find(x => x.startsWith(COOKIE_NAME + "="))?.slice(COOKIE_NAME.length + 1);
    if (!username || !token) return false;
    const [expiresText, supplied] = decodeURIComponent(token).split(".");
    const expires = Number(expiresText);
    if (!Number.isFinite(expires) || expires <= Date.now() || !supplied) return false;
    const expected = signature(username + ":" + expires);
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const sessionCookieName = COOKIE_NAME;
