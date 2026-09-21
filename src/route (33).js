import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { getRankings, recalculateRankings } from "@/lib/services/ranking.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async (req) => {
  await requireUser();
  const sp = new URL(req.url).searchParams;
  const scope = sp.get("scope") || "Overall";
  const scopeValue = sp.get("scopeValue") || undefined;
  return ok(await getRankings(scope, scopeValue));
});

// Force a recalculation (admin/organizer only).
export const POST = handler(async () => {
  const user = await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const rows = await recalculateRankings();
  await logAudit({ userId: user.id, userName: user.name, action: "RANKINGS_RECALC", entity: "Rankings", details: { rows: rows.length } });
  return ok({ recalculated: rows.length });
});
