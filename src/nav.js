import {
  LayoutDashboard, Users, Building2, Trophy, UsersRound,
  Swords, BarChart3, Medal, Bell, FileText, Settings, ScrollText, Search,
} from "lucide-react";
import { ROLES } from "@/lib/excel/schema";

// Navigation items with the roles allowed to see each one.
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: "all" },
  { href: "/tournaments", label: "Tournaments", icon: Trophy, roles: "all" },
  { href: "/players", label: "Players", icon: Users, roles: "all" },
  { href: "/clubs", label: "Clubs", icon: Building2, roles: "all" },
  { href: "/rankings", label: "Rankings", icon: Medal, roles: "all" },
  { href: "/leaderboards", label: "Leaderboards", icon: BarChart3, roles: "all" },
  { href: "/search", label: "Search", icon: Search, roles: "all" },
  { href: "/reports", label: "Reports", icon: FileText, roles: [ROLES.SUPER_ADMIN, ROLES.ORGANIZER] },
  { href: "/notifications", label: "Notifications", icon: Bell, roles: "all" },
  { href: "/audit", label: "Audit Log", icon: ScrollText, roles: [ROLES.SUPER_ADMIN] },
  { href: "/settings", label: "Settings", icon: Settings, roles: "all" },
];

export function navFor(role) {
  return NAV_ITEMS.filter((i) => i.roles === "all" || i.roles.includes(role));
}
