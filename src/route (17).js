import { handler, ok } from "@/lib/api";
import { register } from "@/lib/services/auth.service";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.string().optional(),
  playerFields: z.record(z.any()).optional(),
});

export const POST = handler(async (req) => {
  const body = schema.parse(await req.json());
  const user = await register(body);
  return ok(user, { status: 201 });
});
