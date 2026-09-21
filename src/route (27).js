import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { markAllRead } from "@/lib/services/notification.service";

export const runtime = "nodejs";

export const POST = handler(async () => {
  const user = await requireUser();
  await markAllRead(user.id);
  return ok({ done: true });
});
