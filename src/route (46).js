import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { listTournaments, createTournament, searchTournaments } from "@/lib/services/tournament.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (req) => {
  await requireUser();
  const q = new URL(req.url).searchParams.get("q");
  return ok(q ? await searchTournaments(q) : await listTournaments());
});

export const POST = handler(async (req) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const t = await createTournament(await req.json(), user);
  await logAudit({ userId: user.id, userName: user.name, action: "TOURNAMENT_CREATE", entity: "Tournament", details: { id: t.id, name: t.name } });
  return ok(t, { status: 201 });
});
