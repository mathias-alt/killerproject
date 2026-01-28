"use client";

import { usePathname } from "next/navigation";
import { ThemeSettings } from "./theme-settings";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/kanban": "Kanban Board",
  "/dashboard/gantt": "Gantt Chart",
  "/dashboard/projects": "Projects",
};

export function Header() {
  const pathname = usePathname();

  const label =
    routeLabels[pathname] ??
    (pathname.startsWith("/dashboard/projects/") ? "Project" : "Dashboard");

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <h1 className="text-lg font-semibold">{label}</h1>
      <ThemeSettings />
    </header>
  );
}
