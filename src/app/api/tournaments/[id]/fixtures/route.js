import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { generateFixtures } from "@/lib/services/fixture.service";
import { matchesForTournament } from "@/lib/services/match.service";
import { notifyMany } from "@/lib/services/notification.service";
import { listUsers } from "@/lib/services/auth.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  return ok(await matchesForTournament(id));
});

export const POST = handler(async (_req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const matches = await generateFixtures(id);
  const allUsers = await listUsers();
  const playerUserIds = allUsers.filter((u) => u.role === ROLES.PLAYER).map((u) => u.id);
  await notifyMany(playerUserIds, "Match Schedule Created", "Fixtures Published", "New match fixtures have been generated.");
  await logAudit({ userId: user.id, userName: user.name, action: "FIXTURES_GENERATE", entity: "Tournament", details: { id, matches: matches.length } });
  return ok(matches, { status: 201 });
});
