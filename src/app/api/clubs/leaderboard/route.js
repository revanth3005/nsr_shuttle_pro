import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { clubLeaderboard } from "@/lib/services/club.service";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireUser();
  return ok(await clubLeaderboard());
});
