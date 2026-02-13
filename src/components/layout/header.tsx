"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useLayout } from "@/hooks/use-layout";
import { Button } from "@/components/ui/button";
import { Menu, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const ThemeSettings = dynamic(() => import("./theme-settings").then((m) => m.ThemeSettings), {
  ssr: false,
});

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/kanban": "Kanban Board",
  "/dashboard/gantt": "Gantt Chart",
  "/dashboard/projects": "Projects",
  "/dashboard/completed-tasks": "Completed Tasks",
  "/dashboard/ideas": "Ideas",
  "/dashboard/profile": "Profile",
  "/dashboard/time-entries": "Time Entries",
};

export function Header({
  showSidebarToggle,
  sidebarToggleMobileOnly,
  onSidebarToggle,
}: {
  showSidebarToggle?: boolean;
  sidebarToggleMobileOnly?: boolean;
  onSidebarToggle?: () => void;
}) {
  const pathname = usePathname();
  const { setLayoutStyle } = useLayout();
  const { resolvedTheme, setTheme } = useTheme();

  const label =
    routeLabels[pathname] ??
    (pathname.startsWith("/dashboard/projects/") ? "Project" : "Dashboard");
  const isDark = resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-background/80 px-3 backdrop-blur-md supports-[backdrop-filter]:bg-background/65 md:h-16 md:gap-4 md:px-6">
      <div className="flex items-center gap-3">
        {showSidebarToggle && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-8 w-8 rounded-lg", sidebarToggleMobileOnly && "md:hidden")}
            onClick={onSidebarToggle ?? (() => setLayoutStyle("default"))}
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        <div>
          <p className="hidden text-[11px] uppercase tracking-[0.18em] text-muted-foreground sm:block">Workspace</p>
          <h1 className="text-base font-semibold leading-none md:text-lg">{label}</h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          aria-label="Toggle theme"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <div className="hidden md:block">
          <ThemeSettings />
        </div>
      </div>
    </header>
  );
}
