import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { listClubs, createClub, searchClubs } from "@/lib/services/club.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (req) => {
  await requireUser();
  const q = new URL(req.url).searchParams.get("q");
  return ok(q ? await searchClubs(q) : await listClubs());
});

export const POST = handler(async (req) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const club = await createClub(await req.json());
  await logAudit({ userId: user.id, userName: user.name, action: "CLUB_CREATE", entity: "Club", details: { id: club.id } });
  return ok(club, { status: 201 });
});
