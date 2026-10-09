import { createSessionToken, sessionCookieName } from "../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request) {
  const { ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD || !SESSION_SECRET || SESSION_SECRET.length < 32) {
    return Response.json({ error: "Administrator authentication is not configured. Contact PMA IT." }, { status: 503 });
  }

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.username !== ADMIN_USERNAME || body.password !== ADMIN_PASSWORD) {
    return Response.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const { value, expires } = createSessionToken(ADMIN_USERNAME);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookieName + "=" + encodeURIComponent(value) + "; HttpOnly; Path=/; SameSite=Strict; Expires=" + new Date(expires).toUTCString() + secure
    }
  });
}

export async function DELETE() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": sessionCookieName + "=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0"
    }
  });
}
