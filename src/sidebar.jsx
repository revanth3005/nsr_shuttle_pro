"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather } from "lucide-react";
import { cn } from "@/lib/utils";
import { navFor } from "./nav";

export function Sidebar({ role, onNavigate }) {
  const pathname = usePathname();
  const items = navFor(role);

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Feather className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <p className="font-bold">ShuttlePro</p>
          <p className="text-[11px] text-muted-foreground">Tournament Manager</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4 text-[11px] text-muted-foreground">
        Data stored in Excel • v1.0
      </div>
    </aside>
  );
}
