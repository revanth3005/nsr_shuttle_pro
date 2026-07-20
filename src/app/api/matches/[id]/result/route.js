import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { recordResult } from "@/lib/services/match.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

// POST a best-of-3 result. Triggers points + ranking recalculation.
export const POST = handler(async (req, { params }) => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const result = await recordResult(id, await req.json());
  await logAudit({ userId: user.id, userName: user.name, action: "MATCH_RESULT", entity: "Match", details: { id } });
  return ok(result);
});
