import { handler, ok, fail } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { getTournament, updateTournament, removeTournament } from "@/lib/services/tournament.service";
import { notifyMany } from "@/lib/services/notification.service";
import { listUsers } from "@/lib/services/auth.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const t = await getTournament(id);
  if (!t) return fail("Tournament not found", 404);
  return ok(t);
});

export const PATCH = handler(async (req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const before = await getTournament(id);
  const updated = await updateTournament(id, await req.json());
  if (!updated) return fail("Tournament not found", 404);

  // Announce when a tournament opens for registration.
  if (before && before.status !== "Registration Open" && updated.status === "Registration Open") {
    const allUsers = await listUsers();
    const playerUserIds = allUsers.filter((u) => u.role === ROLES.PLAYER).map((u) => u.id);
    await notifyMany(playerUserIds, "Tournament Announcements", "Registration Open", `Registration is now open for "${updated.name}".`);
  }
  await logAudit({ userId: user.id, userName: user.name, action: "TOURNAMENT_UPDATE", entity: "Tournament", details: { id } });
  return ok(updated);
});

export const DELETE = handler(async (_req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const removed = await removeTournament(id);
  await logAudit({ userId: user.id, userName: user.name, action: "TOURNAMENT_DELETE", entity: "Tournament", details: { id } });
  return ok({ removed });
});
