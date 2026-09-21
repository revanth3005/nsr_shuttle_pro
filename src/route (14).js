import { cookies } from "next/headers";
import { handler, ok } from "@/lib/api";
import { login } from "@/lib/services/auth.service";
import { TOKEN_COOKIE } from "@/lib/auth/jwt";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const POST = handler(async (req) => {
  const { email, password } = schema.parse(await req.json());
  const { token, user } = await login({ email, password });
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return ok(user);
});
