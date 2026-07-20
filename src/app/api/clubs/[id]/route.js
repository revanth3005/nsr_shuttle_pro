import { handler, ok, fail } from "@/lib/api";
import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { getClub, updateClub, removeClub } from "@/lib/services/club.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  const { id } = await params;
  const club = await getClub(id);
  if (!club) return fail("Club not found", 404);
  return ok(club);
});

export const PATCH = handler(async (req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const updated = await updateClub(id, await req.json());
  if (!updated) return fail("Club not found", 404);
  await logAudit({ userId: user.id, userName: user.name, action: "CLUB_UPDATE", entity: "Club", details: { id } });
  return ok(updated);
});

export const DELETE = handler(async (_req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN);
  const { id } = await params;
  const removed = await removeClub(id);
  await logAudit({ userId: user.id, userName: user.name, action: "CLUB_DELETE", entity: "Club", details: { id } });
  return ok({ removed });
});
