import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { adminStats, organizerStats, playerStats } from "@/lib/services/stats.service";

export const runtime = "nodejs";

// Returns the dashboard payload appropriate to the current user's role.
export const GET = handler(async () => {
  const user = await requireUser();
  if (user.role === ROLES.SUPER_ADMIN) return ok({ role: user.role, ...(await adminStats()) });
  if (user.role === ROLES.ORGANIZER) return ok({ role: user.role, ...(await organizerStats(user.id)) });
  return ok({ role: user.role, ...(await playerStats(user.playerId)) });
});
