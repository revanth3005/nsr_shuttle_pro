import { handler, ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { getTeam, decorateTeam, updateTeam, removeTeam } from "@/lib/services/team.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const team = await getTeam(id);
  if (!team) return fail("Team not found", 404);
  return ok(await decorateTeam(team));
});

export const PATCH = handler(async (req, { params }) => {
  await requireUser();
  const { id } = await params;
  const updated = await updateTeam(id, await req.json());
  if (!updated) return fail("Team not found", 404);
  return ok(updated);
});

export const DELETE = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  return ok({ removed: await removeTeam(id) });
});
