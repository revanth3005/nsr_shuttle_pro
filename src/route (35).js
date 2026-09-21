import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { listRegistrationsDecorated, register } from "@/lib/services/registration.service";
import { logAudit } from "@/lib/services/audit.service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireUser();
  return ok(await listRegistrationsDecorated());
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const reg = await register(await req.json());
  await logAudit({ userId: user.id, userName: user.name, action: "REGISTER_TOURNAMENT", entity: "Registration", details: { id: reg.id } });
  return ok(reg, { status: 201 });
});
