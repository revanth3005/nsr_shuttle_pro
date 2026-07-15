"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Trophy, Users, Swords } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { usePublicStats } from "@/hooks/useApi";

function PlatformStats() {
  const { data } = usePublicStats();
  if (!data) return null;

  const items = [
    { icon: Trophy, label: "Tournaments Conducted", value: data.tournamentsConducted },
    { icon: Users, label: "Players", value: data.totalPlayers },
    { icon: Swords, label: "Matches Played", value: data.matchesPlayed },
  ];

  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label, value }) => (
        <div key={label} className="rounded-lg border bg-card/50 p-3 text-center">
          <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
          <p className="text-lg font-bold leading-none">{value}</p>
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/login", form);
      toast("Welcome back!", "success");
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Sign in to ShuttlePro"
      subtitle="Badminton Tournament Management"
      footer={
        <>
          {/* New here?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link> */}
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <PlatformStats />

      {/* <div className="mt-6 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Demo accounts</p>
        <p>admin@shuttle.pro / admin123</p>
        <p>organizer@shuttle.pro / organizer123</p>
        <p>player@shuttle.pro / player123</p>
      </div> */}
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
