"use client";

import { useState } from "react";
import Link from "next/link";
import { Search as SearchIcon, Users, Building2, UsersRound, Trophy } from "lucide-react";
import { api } from "@/lib/client";
import { PageHeader, EmptyState } from "@/components/shared";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { key: "players", label: "Players", icon: Users, href: "/players" },
  { key: "clubs", label: "Clubs", icon: Building2, href: "/clubs" },
  { key: "teams", label: "Teams", icon: UsersRound, href: "/teams" },
  { key: "tournaments", label: "Tournaments", icon: Trophy, href: "/tournaments" },
];

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run(e) {
    e?.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    try {
      setResults(await api.get(`/api/search?q=${encodeURIComponent(q)}`));
    } finally {
      setLoading(false);
    }
  }

  const total = results ? Object.values(results).reduce((a, arr) => a + arr.length, 0) : 0;

  return (
    <div>
      <PageHeader title="Global Search" description="Search across players, clubs, teams and tournaments." />
      <form onSubmit={run} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Type a name, city, club…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Searching…" : "Search"}</Button>
      </form>

      {results && total === 0 && <EmptyState title="No matches found" description={`Nothing matched "${q}".`} icon={SearchIcon} />}

      {results && total > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {SECTIONS.map((s) => {
            const items = results[s.key] || [];
            if (!items.length) return null;
            const Icon = s.icon;
            return (
              <Card key={s.key}>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" /> {s.label} ({items.length})</CardTitle></CardHeader>
                <CardContent className="space-y-1">
                  {items.map((it) => (
                    <Link key={it.id} href={s.key === "tournaments" ? `/tournaments/${it.id}` : s.href} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent/5">
                      <span className="font-medium">{it.label}</span>
                      <span className="text-xs text-muted-foreground">{it.sub}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
