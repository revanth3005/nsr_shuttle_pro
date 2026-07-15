import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { listMatches, matchesForTournament, createMatch } from "@/lib/services/match.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (req) => {
  await requireUser();
  const tid = new URL(req.url).searchParams.get("tournamentId");
  return ok(tid ? await matchesForTournament(tid) : await listMatches());
});

export const POST = handler(async (req) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const match = await createMatch(await req.json());
  await logAudit({ userId: user.id, userName: user.name, action: "MATCH_CREATE", entity: "Match", details: { id: match.id } });
  return ok(match, { status: 201 });
});
