import { handler, ok } from "@/lib/api";
import { requestPasswordReset } from "@/lib/services/auth.service";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({ email: z.string().email() });

export const POST = handler(async (req) => {
  const { email } = schema.parse(await req.json());
  const result = await requestPasswordReset(email);
  // The token is returned here for demo/no-mail-server purposes only.
  return ok({
    message: "If an account exists, a reset token has been generated.",
    ...result,
  });
});
