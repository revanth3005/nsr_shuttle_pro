import { requireRole } from "@/lib/auth/session";
import { ROLES } from "@/lib/excel/schema";
import { buildReport, reportToBuffer } from "@/lib/services/report.service";

export const runtime = "nodejs";

// GET /api/reports?type=players&format=xlsx  -> downloadable file
export async function GET(req) {
  try {
    await requireRole(ROLES.SUPER_ADMIN, ROLES.ORGANIZER);
    const sp = new URL(req.url).searchParams;
    const type = sp.get("type") || "players";
    const format = sp.get("format") || "xlsx";
    const tournamentId = sp.get("tournamentId") || undefined;

    const report = await buildReport(type, { tournamentId });
    const { buffer, mime, ext } = reportToBuffer(report, format === "csv" ? "csv" : "xlsx");

    return new Response(buffer, {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${report.name}.${ext}"`,
      },
    });
  } catch (err) {
    const status = err?.status || 500;
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
