import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { playoffState, advancePlayoffs } from "@/lib/services/playoff.service";
import { advanceGroupStage } from "@/lib/services/fixture.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

// GET -> league standings + whether the league is complete / playoffs exist.
export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  return ok(await playoffState(id));
});

// POST -> create the next possible playoff stage (Qualifier 1 / Semi / Final).
export const POST = handler(async (_req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  // Group + Knockout builds a bracket from the pool qualifiers; every other
  // league format creates the next Page playoff stage. Only one of the two
  // ever does anything for a given tournament.
  const [group, playoff] = [await advanceGroupStage(id), await advancePlayoffs(id)];
  const result = group.advanced ? group : playoff;
  await logAudit({ userId: user.id, userName: user.name, action: "PLAYOFF_ADVANCE", entity: "Tournament", details: { id, ...result } });
  return ok(result);
});
