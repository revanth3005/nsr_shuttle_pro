import { handler, ok } from "@/lib/api";
import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { listAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireRole(ROLES.SUPER_ADMIN);
  return ok(await listAudit());
});
