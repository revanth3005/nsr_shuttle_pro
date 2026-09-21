import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { changePassword } from "@/lib/services/auth.service";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export const POST = handler(async (req) => {
  const user = await requireUser();
  const body = schema.parse(await req.json());
  await changePassword(user.id, body);
  return ok({ changed: true });
});
