"use client";

import { useMemo } from "react";
import { Trophy, Building2 } from "lucide-react";
import { useRankings, useClubLeaderboard } from "@/hooks/useApi";
import { PageHeader, Spinner, EmptyState } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataGrid } from "@/components/data-grid";
import { BarChartCard } from "@/components/charts";

export default function LeaderboardsPage() {
  return (
    <div>
      <PageHeader title="Leaderboards" description="Top players and clubs at a glance." />
      <Tabs defaultValue="players">
        <TabsList>
          <TabsTrigger value="players">Player Leaderboard</TabsTrigger>
          <TabsTrigger value="clubs">Club Leaderboard</TabsTrigger>
        </TabsList>
        <TabsContent value="players"><PlayerBoard /></TabsContent>
        <TabsContent value="clubs"><ClubBoard /></TabsContent>
      </Tabs>
    </div>
  );
}

function PlayerBoard() {
  const { data: rows, isLoading } = useRankings("Overall");
  const columns = useMemo(
    () => [
      { field: "rank", headerName: "Rank", width: 90 },
      { field: "playerName", headerName: "Name", minWidth: 170 },
      { field: "club", minWidth: 130 },
      { field: "matchesPlayed", headerName: "Played", width: 100 },
      { field: "wins", width: 90 },
      { field: "winPercentage", headerName: "Win %", width: 100, valueFormatter: (p) => `${p.value ?? 0}%` },
      { field: "points", headerName: "Points", width: 110 },
    ],
    []
  );
  if (isLoading) return <Spinner />;
  if (!rows?.length) return <EmptyState title="No players ranked yet" icon={Trophy} />;
  const chart = rows.slice(0, 8).map((r) => ({ name: r.playerName, points: r.points }));
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Top 8 by Points</CardTitle></CardHeader><CardContent><BarChartCard data={chart} xKey="name" yKey="points" /></CardContent></Card>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
}

function ClubBoard() {
  const { data: rows, isLoading } = useClubLeaderboard();
  const columns = useMemo(
    () => [
      { field: "rank", headerName: "Rank", width: 90 },
      { field: "club", headerName: "Club", minWidth: 180 },
      { field: "players", headerName: "Players", width: 110 },
      { field: "matchesPlayed", headerName: "Played", width: 110 },
      { field: "wins", width: 90 },
      { field: "winPercentage", headerName: "Win %", width: 100, valueFormatter: (p) => `${p.value ?? 0}%` },
      { field: "points", headerName: "Points", width: 110 },
    ],
    []
  );
  if (isLoading) return <Spinner />;
  if (!rows?.length) return <EmptyState title="No clubs ranked yet" icon={Building2} />;
  const chart = rows.slice(0, 8).map((r) => ({ name: r.club, points: r.points }));
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle>Top Clubs by Points</CardTitle></CardHeader><CardContent><BarChartCard data={chart} xKey="name" yKey="points" color="#0ea5e9" /></CardContent></Card>
      <DataGrid rows={rows} columns={columns} />
    </div>
  );
}
