import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { registrationsForTournament, decorateRegistration } from "@/lib/services/registration.service";

export const runtime = "nodejs";

export const GET = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  const regs = await registrationsForTournament(id);
  return ok(await Promise.all(regs.map(decorateRegistration)));
});
