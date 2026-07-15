import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { listPlayersWithStats, createPlayer, searchPlayers } from "@/lib/services/player.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (req) => {
  await requireUser();
  const q = new URL(req.url).searchParams.get("q");
  if (q) return ok(await searchPlayers(q));
  return ok(await listPlayersWithStats());
});

export const POST = handler(async (req) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const body = await req.json();
  const player = await createPlayer(body);
  await logAudit({ userId: user.id, userName: user.name, action: "PLAYER_CREATE", entity: "Player", details: { id: player.id } });
  return ok(player, { status: 201 });
});
