"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarStyle, layoutStyle } = useLayout();

  // "full" layout hides the sidebar entirely (offcanvas / hamburger pattern)
  const showSidebar = layoutStyle !== "full";
  // "compact" layout forces the sidebar into collapsed mode
  const forceCollapsed = layoutStyle === "compact";

  return (
    <div
      className={cn(
        "flex h-screen",
        sidebarStyle === "inset" && "bg-muted/40 p-2 gap-2",
        sidebarStyle === "floating" && "p-2 gap-2"
      )}
    >
      {showSidebar && <Sidebar forceCollapsed={forceCollapsed} />}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden",
          sidebarStyle === "inset" && "rounded-xl border bg-background shadow-sm",
          sidebarStyle === "floating" && "rounded-xl bg-background"
        )}
      >
        <Header showSidebarToggle={layoutStyle === "full"} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
