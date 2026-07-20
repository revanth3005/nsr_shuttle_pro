import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { listForUser, unreadCount } from "@/lib/services/notification.service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const user = await requireUser();
  const [items, unread] = await Promise.all([listForUser(user.id), unreadCount(user.id)]);
  return ok({ items, unread });
});
