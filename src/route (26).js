import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { markRead } from "@/lib/services/notification.service";

export const runtime = "nodejs";

export const POST = handler(async (_req, { params }) => {
  await requireUser();
  const { id } = await params;
  return ok(await markRead(id));
});
