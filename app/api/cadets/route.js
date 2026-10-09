import { prisma } from "../../../lib/prisma";
import { isAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "Sign in required." }, { status: 401 });
}

function serialise(cadet) {
  return {
    id: cadet.id,
    roll: cadet.roll,
    name: cadet.name,
    company: cadet.company,
    platoon: cadet.platoon,
    term: cadet.term,
    courses: Array.isArray(cadet.courses) ? cadet.courses : [],
    marks: cadet.marks && typeof cadet.marks === "object" && !Array.isArray(cadet.marks) ? cadet.marks : {},
    status: cadet.status
  };
}

export async function GET(request) {
  if (!isAuthenticated(request)) return unauthorized();
  try {
    const cadets = await prisma.cadet.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ cadets: cadets.map(serialise) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/cadets failed:", error);
    return Response.json({ error: "Database query failed. Check DATABASE_URL and database availability." }, { status: 500 });
  }
}

export async function PUT(request) {
  if (!isAuthenticated(request)) return unauthorized();
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!Array.isArray(body.cadets)) return Response.json({ error: "Expected a cadets array." }, { status: 400 });
  if (body.cadets.length > 10000) return Response.json({ error: "The request contains too many cadets." }, { status: 413 });

  const incoming = body.cadets;
  const rolls = new Set();
  for (const c of incoming) {
    if (!c || !String(c.roll || "").trim() || !String(c.name || "").trim()) {
      return Response.json({ error: "Every cadet must have a roll number and name." }, { status: 400 });
    }
    const roll = String(c.roll).trim().toLowerCase();
    if (rolls.has(roll)) return Response.json({ error: "Duplicate roll number: " + c.roll }, { status: 409 });
    rolls.add(roll);
  }

  try {
    await prisma.$transaction(async tx => {
      const ids = [];
      for (const c of incoming) {
        const id = String(c.id || "").trim();
        const data = {
          roll: String(c.roll).trim(),
          name: String(c.name).trim(),
          company: String(c.company || "Khalid"),
          platoon: String(c.platoon || "1st"),
          term: c.term == null ? null : String(c.term),
          courses: Array.isArray(c.courses) ? c.courses : [],
          marks: c.marks && typeof c.marks === "object" && !Array.isArray(c.marks) ? c.marks : {},
          status: c.status ? String(c.status) : null
        };
        if (id) {
          await tx.cadet.upsert({ where: { id }, create: { id, ...data }, update: data });
          ids.push(id);
        } else {
          const created = await tx.cadet.create({ data });
          ids.push(created.id);
        }
      }
      await tx.cadet.deleteMany({ where: ids.length ? { id: { notIn: ids } } : {} });
    });
    const cadets = await prisma.cadet.findMany({ orderBy: { createdAt: "desc" } });
    return Response.json({ ok: true, cadets: cadets.map(serialise) });
  } catch (error) {
    console.error("PUT /api/cadets failed:", error);
    if (error?.code === "P2002") return Response.json({ error: "A cadet with that roll number already exists in the database." }, { status: 409 });
    return Response.json({ error: "Could not save cadets to the database. Check server logs and database configuration." }, { status: 500 });
  }
}
