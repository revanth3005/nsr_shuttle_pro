import { handler, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const user = await getCurrentUser();
  return ok(user);
});
