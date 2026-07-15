"use client";

import Link from "next/link";
import {
  Users, Building2, Trophy, Swords, Medal, Clock, ClipboardList, TrendingUp, Award,
} from "lucide-react";
import { useDashboard, useMe } from "@/hooks/useApi";
import { PageHeader, StatCard, Spinner, EmptyState } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge, statusVariant } from "@/components/ui/badge";
import { BarChartCard, PieChartCard, LineChartCard } from "@/components/charts";
import { ROLES } from "@/lib/excel/schema";
import { formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const { data: me } = useMe();
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${me?.name?.split(" ")[0] || "there"} 👋`}
        description="Here's what's happening in your badminton ecosystem."
      />
      {data.role === ROLES.SUPER_ADMIN && <AdminDashboard data={data} />}
      {data.role === ROLES.ORGANIZER && <OrganizerDashboard data={data} />}
      {data.role === ROLES.PLAYER && <PlayerDashboard data={data} />}
    </div>
  );
}

function AdminDashboard({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Players" value={data.totalPlayers} icon={Users} accent="primary" />
        <StatCard label="Total Clubs" value={data.totalClubs} icon={Building2} accent="accent" />
        <StatCard label="Active Tournaments" value={data.activeTournaments} icon={Trophy} accent="warning" />
        <StatCard label="Tournaments Conducted" value={data.conductedTournaments} icon={Award} accent="primary" />
        <StatCard label="Matches Played" value={data.matchesPlayed} icon={Swords} accent="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Players by Points</CardTitle></CardHeader>
          <CardContent>
            {data.topPlayers?.length ? (
              <BarChartCard data={data.topPlayers} xKey="name" yKey="points" />
            ) : (
              <EmptyState title="No players yet" icon={Users} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tournaments by Status</CardTitle></CardHeader>
          <CardContent>
            <PieChartCard data={data.statusBreakdown.filter((s) => s.count > 0)} nameKey="status" valueKey="count" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OrganizerDashboard({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="My Tournaments" value={data.managedTournaments} icon={Trophy} accent="primary" />
        <StatCard label="Tournaments Conducted" value={data.conductedTournaments} icon={Award} accent="primary" />
        <StatCard label="Total Participants" value={data.totalParticipants} icon={ClipboardList} accent="warning" />
        <StatCard label="Upcoming Matches" value={data.upcomingMatches} icon={Clock} accent="accent" />
        <StatCard label="Total Matches" value={data.totalMatches} icon={Swords} accent="success" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>My Tournaments</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.tournaments?.length ? (
              data.tournaments.map((t) => (
                <Link
                  key={t.id}
                  href={`/tournaments/${t.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/5"
                >
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.category} • {t.format}</p>
                  </div>
                  <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                </Link>
              ))
            ) : (
              <EmptyState title="No tournaments yet" icon={Trophy} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tournaments by Status</CardTitle></CardHeader>
          <CardContent>
            <PieChartCard data={data.statusBreakdown.filter((s) => s.count > 0)} nameKey="status" valueKey="count" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlayerDashboard({ data }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Current Ranking" value={data.currentRanking ? `#${data.currentRanking}` : "—"} icon={Medal} accent="warning" />
        <StatCard label="Total Points" value={data.totalPoints} icon={TrendingUp} accent="primary" />
        <StatCard label="Win Rate" value={`${data.winRate}%`} icon={Award} accent="success" hint={`${data.wins}W / ${data.losses}L`} />
        <StatCard label="Titles Won" value={data.titlesWon} icon={Trophy} accent="accent" />
        <StatCard label="Tournaments Played" value={data.tournamentsPlayed} icon={Users} accent="accent" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Performance Trend</CardTitle></CardHeader>
          <CardContent>
            {data.performanceTrend?.length ? (
              <LineChartCard data={data.performanceTrend} xKey="round" yKey="wins" />
            ) : (
              <EmptyState title="No completed matches yet" icon={TrendingUp} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upcoming Matches</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.upcomingMatches?.length ? (
              data.upcomingMatches.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{m.side1Name} vs {m.side2Name}</p>
                    <p className="text-xs text-muted-foreground">{m.round} • {formatDate(m.matchDate) || "TBD"}</p>
                  </div>
                  <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                </div>
              ))
            ) : (
              <EmptyState title="No upcoming matches" icon={Clock} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Match History</CardTitle></CardHeader>
        <CardContent>
          {data.matchHistory?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-4">Match</th>
                    <th className="py-2 pr-4">Round</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.matchHistory.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{m.side1Name} vs {m.side2Name}</td>
                      <td className="py-2 pr-4">{m.round}</td>
                      <td className="py-2 pr-4">{[m.set1, m.set2, m.set3].filter(Boolean).join(", ")}</td>
                      <td className="py-2">
                        <Badge variant={m.won ? "success" : "destructive"}>{m.won ? "Won" : "Lost"}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No match history yet" icon={Swords} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
