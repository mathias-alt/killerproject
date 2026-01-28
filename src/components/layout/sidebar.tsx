"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProjects } from "@/hooks/use-projects";
import { useLayout } from "@/hooks/use-layout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Columns3,
  GanttChart,
  FolderOpen,
  LogOut,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Zap,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/kanban", label: "Kanban Board", icon: Columns3 },
  { href: "/dashboard/gantt", label: "Gantt Chart", icon: GanttChart },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { projects } = useProjects();
  const supabase = createClient();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const { sidebarCollapsed, setSidebarCollapsed, sidebarStyle } = useLayout();

  const collapsed = sidebarCollapsed;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-full flex-col border-r bg-background transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          sidebarStyle === "floating" && "m-2 rounded-xl border shadow-lg",
          sidebarStyle === "inset" && "m-2 rounded-xl bg-muted/30"
        )}
      >
        {/* Logo */}
        <div className={cn("flex h-14 items-center gap-2 px-4 font-bold text-lg", collapsed && "justify-center px-0")}>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && <Link href="/dashboard">KillerProject</Link>}
        </div>
        <Separator />

        <ScrollArea className="flex-1 py-2">
          {/* Main navigation */}
          <div className={cn("space-y-1", collapsed ? "px-1" : "px-2")}>
            {!collapsed && (
              <div className="mb-2 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Overview
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-accent text-accent-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && item.label}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return link;
            })}
          </div>

          <Separator className="my-3" />

          {/* Projects section */}
          <div className={cn(collapsed ? "px-1" : "px-2")}>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/dashboard/projects"
                    className={cn(
                      "flex items-center justify-center rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent",
                      pathname === "/dashboard/projects" && "bg-accent text-accent-foreground"
                    )}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Projects</TooltipContent>
              </Tooltip>
            ) : (
              <>
                <button
                  onClick={() => setProjectsOpen(!projectsOpen)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
                >
                  Projects
                  <ChevronDown
                    className={cn("h-3.5 w-3.5 transition-transform", !projectsOpen && "-rotate-90")}
                  />
                </button>
                {projectsOpen && (
                  <div className="mt-1 space-y-1">
                    <Link
                      href="/dashboard/projects"
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                        pathname === "/dashboard/projects" && "bg-accent text-accent-foreground"
                      )}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      All Projects
                    </Link>
                    {projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/dashboard/projects/${project.id}`}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                          pathname === `/dashboard/projects/${project.id}` && "bg-accent text-accent-foreground"
                        )}
                      >
                        <div
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>

        <Separator />
        <div className="p-2 space-y-1">
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={() => setSidebarCollapsed(false)}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarCollapsed(true)}
              >
                <ChevronsLeft className="h-4 w-4" />
                Collapse
              </Button>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
