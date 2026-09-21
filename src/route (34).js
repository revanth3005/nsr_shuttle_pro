import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { removeRegistration } from "@/lib/services/registration.service";

export const runtime = "nodejs";

export const DELETE = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  return ok({ removed: await removeRegistration(id) });
});
