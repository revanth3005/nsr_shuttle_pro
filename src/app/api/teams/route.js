import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { listTeamsWithNames, createTeam } from "@/lib/services/team.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireUser();
  return ok(await listTeamsWithNames());
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const team = await createTeam(await req.json());
  await logAudit({ userId: user.id, userName: user.name, action: "TEAM_CREATE", entity: "Team", details: { id: team.id } });
  return ok(team, { status: 201 });
});
