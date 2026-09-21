import { handler, ok } from "@/lib/api";
import { resetPassword } from "@/lib/services/auth.service";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export const POST = handler(async (req) => {
  const body = schema.parse(await req.json());
  await resetPassword(body);
  return ok({ reset: true });
});
