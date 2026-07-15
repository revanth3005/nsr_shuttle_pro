import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { playerStats } from "@/lib/services/stats.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  return ok(await playerStats(id));
});
