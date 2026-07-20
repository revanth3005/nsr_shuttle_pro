import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { playoffState, advancePlayoffs } from "@/lib/services/playoff.service";
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
  const result = await advancePlayoffs(id);
  await logAudit({ userId: user.id, userName: user.name, action: "PLAYOFF_ADVANCE", entity: "Tournament", details: { id, ...result } });
  return ok(result);
});
