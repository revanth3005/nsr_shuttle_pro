"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/client";
import { useToast } from "@/components/ui/toast";
import { ROLES, SKILL_LEVELS } from "@/lib/excel/schema";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: ROLES.PLAYER,
    city: "", state: "", club: "", skillLevel: "Beginner", gender: "Male",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { name, email, password, role, ...playerFields } = form;
      await api.post("/api/auth/register", { name, email, password, role, playerFields });
      await api.post("/api/auth/login", { email, password });
      toast("Account created!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const isPlayer = form.role === ROLES.PLAYER;

  return (
    <AuthCard
      title="Create your account"
      subtitle="Join the tournament ecosystem"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Full name</Label>
            <Input required value={form.name} onChange={set("name")} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={form.role} onChange={set("role")}>
              {Object.values(ROLES).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <Label>Password</Label>
          <Input type="password" required minLength={6} value={form.password} onChange={set("password")} placeholder="At least 6 characters" />
        </div>

        {isPlayer && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={form.gender} onChange={set("gender")}>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Skill level</Label>
              <Select value={form.skillLevel} onChange={set("skillLevel")}>
                {SKILL_LEVELS.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={set("city")} />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input value={form.state} onChange={set("state")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Club (optional)</Label>
              <Input value={form.club} onChange={set("club")} />
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating..." : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
