import { handler, ok, fail } from "@/lib/api";
import { requireUser, requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { getMatch, updateMatch, removeMatch } from "@/lib/services/match.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const m = await getMatch(id);
  if (!m) return fail("Match not found", 404);
  return ok(m);
});

export const PATCH = handler(async (req, { params }) => {
  await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  const updated = await updateMatch(id, await req.json());
  if (!updated) return fail("Match not found", 404);
  return ok(updated);
});

export const DELETE = handler(async (_req, { params }) => {
  await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
  const { id } = await params;
  return ok({ removed: await removeMatch(id) });
});
