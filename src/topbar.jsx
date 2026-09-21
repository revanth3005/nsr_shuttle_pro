"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNotifications } from "@/hooks/useApi";
import { api } from "@/lib/client";

export function Topbar({ user, onMenu }) {
  const router = useRouter();
  const { data } = useNotifications();
  const unread = data?.unread || 0;

  async function logout() {
    await api.post("/api/auth/logout");
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card/60 px-4 backdrop-blur sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden sm:block">
        <Badge variant="accent">{user?.role}</Badge>
      </div>

      <div className="flex flex-1 items-center justify-end gap-1">
        <Link href="/notifications">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>
        </Link>
        <ThemeToggle />
        <div className="mx-1 hidden items-center gap-2 rounded-lg border px-3 py-1.5 sm:flex">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{user?.name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
