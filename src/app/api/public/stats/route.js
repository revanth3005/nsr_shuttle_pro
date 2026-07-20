import { handler, ok } from "@/lib/api";
import { publicStats } from "@/lib/services/stats.service";

export const runtime = "nodejs";

// Public, unauthenticated aggregate counts (tournaments conducted, total
// players, etc.) shown on the login page — intentionally no auth check here,
// and publicStats() only ever returns non-sensitive totals.
export const GET = handler(async () => ok(await publicStats()));
