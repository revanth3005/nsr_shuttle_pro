import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { teamsForTournament, generateRandomTeams } from "@/lib/services/team.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  return ok(await teamsForTournament(id));
});

// POST = randomly generate doubles teams from the tournament's players.
export const POST = handler(async (_req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const result = await generateRandomTeams(id);
  await logAudit({ userId: user.id, userName: user.name, action: "TEAMS_GENERATE", entity: "Tournament", details: { id, teams: result.teams.length } });
  return ok(result, { status: 201 });
});
