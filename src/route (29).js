import { handler, ok, fail } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { getPlayerWithStats, updatePlayer, removePlayer } from "@/lib/services/player.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const player = await getPlayerWithStats(id);
  if (!player) return fail("Player not found", 404);
  return ok(player);
});

export const PATCH = handler(async (req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const updated = await updatePlayer(id, await req.json());
  if (!updated) return fail("Player not found", 404);
  await logAudit({ userId: user.id, userName: user.name, action: "PLAYER_UPDATE", entity: "Player", details: { id } });
  return ok(updated);
});

export const DELETE = handler(async (_req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN);
  const { id } = await params;
  const removed = await removePlayer(id);
  await logAudit({ userId: user.id, userName: user.name, action: "PLAYER_DELETE", entity: "Player", details: { id } });
  return ok({ removed });
});
