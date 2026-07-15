import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth/session";
import { searchPlayers } from "@/lib/services/player.service";
import { searchClubs } from "@/lib/services/club.service";
import { searchTournaments } from "@/lib/services/tournament.service";
import { listTeamsWithNames } from "@/lib/services/team.service";
import { fullName } from "@/lib/utils";

export const runtime = "nodejs";

// Global search across players, clubs, teams and tournaments.
export const GET = handler(async (req) => {
  await requireUser();
  const q = (new URL(req.url).searchParams.get("q") || "").toLowerCase().trim();
  if (!q) return ok({ players: [], clubs: [], teams: [], tournaments: [] });

  const [allTeams, players, clubs, tournaments] = await Promise.all([
    listTeamsWithNames(),
    searchPlayers(q),
    searchClubs(q),
    searchTournaments(q),
  ]);
  const teams = allTeams.filter((t) =>
    [t.name, t.player1Name, t.player2Name].some((v) => String(v || "").toLowerCase().includes(q))
  );

  return ok({
    players: players.map((p) => ({ id: p.id, label: fullName(p), sub: p.club || p.city })),
    clubs: clubs.map((c) => ({ id: c.id, label: c.name, sub: `${c.city}, ${c.state}` })),
    teams: teams.map((t) => ({ id: t.id, label: t.name, sub: `${t.player1Name} / ${t.player2Name}` })),
    tournaments: tournaments.map((t) => ({ id: t.id, label: t.name, sub: t.status })),
  });
});
