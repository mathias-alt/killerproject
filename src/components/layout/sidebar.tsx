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
  Clock,
  Lightbulb,
  User,
  CheckCircle2,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/kanban", label: "Kanban Board", icon: Columns3 },
  { href: "/dashboard/gantt", label: "Gantt Chart", icon: GanttChart },
  { href: "/dashboard/time-entries", label: "Time Entries", icon: Clock },
  { href: "/dashboard/completed-tasks", label: "Completed", icon: CheckCircle2 },
  { href: "/dashboard/ideas", label: "Ideas", icon: Lightbulb },
];

export function Sidebar({
  forceCollapsed,
  mobile = false,
  onNavigate,
}: {
  forceCollapsed?: boolean;
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { projects } = useProjects();
  const supabase = createClient();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const { sidebarCollapsed, setSidebarCollapsed, sidebarStyle, setLayoutStyle } = useLayout();

  const collapsed = mobile ? false : forceCollapsed || sidebarCollapsed;

  async function handleSignOut() {
    await supabase.auth.signOut();
    onNavigate?.();
    router.push("/login");
    router.refresh();
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-full flex-col transition-all duration-300",
          mobile ? "h-screen w-[min(22rem,86vw)] border-r border-sidebar-border/70 bg-sidebar/95 shadow-2xl backdrop-blur-md" : collapsed ? "w-16" : "w-72",
          // Sidebar style: plain border (default)
          !mobile && sidebarStyle === "sidebar" && "border-r border-sidebar-border/70 bg-sidebar/80 backdrop-blur-sm",
          // Floating style: detached with shadow and border
          !mobile && sidebarStyle === "floating" && "rounded-2xl border border-sidebar-border/70 bg-sidebar/85 shadow-[0_20px_36px_-24px_oklch(0.22_0.02_258/0.4)] backdrop-blur-sm",
          // Inset style: subtle background, rounded
          !mobile && sidebarStyle === "inset" && "rounded-2xl border border-sidebar-border/50 bg-sidebar/75 backdrop-blur-sm"
        )}
      >
        {/* Logo */}
        <div className={cn("flex h-16 items-center gap-2 px-4", collapsed && "justify-center px-0")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs shadow-[0_10px_20px_-12px_oklch(0.54_0.16_253/0.9)] shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <Link href="/dashboard" className="block truncate text-[15px] font-semibold tracking-tight">
                KillerProject
              </Link>
              <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Control Center</p>
            </div>
          )}
          {mobile && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8 rounded-lg"
              onClick={onNavigate}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/70 hover:text-accent-foreground",
                    isActive && "bg-primary/12 text-foreground ring-1 ring-primary/20",
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
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-center rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/70",
                      pathname === "/dashboard/projects" && "bg-primary/12 text-foreground ring-1 ring-primary/20"
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
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground"
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
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/70",
                        pathname === "/dashboard/projects" && "bg-primary/12 text-foreground ring-1 ring-primary/20"
                      )}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      All Projects
                    </Link>
                    {projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/dashboard/projects/${project.id}`}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent/70",
                          pathname === `/dashboard/projects/${project.id}` && "bg-primary/12 text-foreground ring-1 ring-primary/20"
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
                  <Link
                    href="/dashboard/profile"
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center justify-center rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent/70",
                      pathname === "/dashboard/profile" && "bg-primary/12 text-foreground ring-1 ring-primary/20"
                    )}
                  >
                    <User className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Profile</TooltipContent>
              </Tooltip>
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
              {!mobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={() => { setSidebarCollapsed(false); setLayoutStyle("default"); }}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <>
              <Link
                href="/dashboard/profile"
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground",
                  pathname === "/dashboard/profile" && "bg-primary/12 text-foreground ring-1 ring-primary/20"
                )}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
              {!mobile && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => { setSidebarCollapsed(true); setLayoutStyle("compact"); }}
                >
                  <ChevronsLeft className="h-4 w-4" />
                  Collapse
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
