"use client";

import { usePathname } from "next/navigation";
import { useLayout } from "@/hooks/use-layout";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { ThemeSettings } from "./theme-settings";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/kanban": "Kanban Board",
  "/dashboard/gantt": "Gantt Chart",
  "/dashboard/projects": "Projects",
};

export function Header({ showSidebarToggle }: { showSidebarToggle?: boolean }) {
  const pathname = usePathname();
  const { setLayoutStyle } = useLayout();

  const label =
    routeLabels[pathname] ??
    (pathname.startsWith("/dashboard/projects/") ? "Project" : "Dashboard");

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      <div className="flex items-center gap-3">
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setLayoutStyle("default")}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-lg font-semibold">{label}</h1>
      </div>
      <ThemeSettings />
    </header>
  );
}
