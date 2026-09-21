import { handler, ok } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { getPointsConfig, updatePointsConfig } from "@/lib/services/points.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireUser();
  return ok(await getPointsConfig());
});

export const PUT = handler(async (req) => {
  const user = await requireRole(ROLES.SUPER_ADMIN);
  const updates = await req.json(); // { key: value, ... }
  const rows = await updatePointsConfig(updates);
  await logAudit({ userId: user.id, userName: user.name, action: "POINTS_CONFIG_UPDATE", entity: "Points_Config", details: updates });
  return ok(rows);
});
