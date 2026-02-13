"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { useLayout } from "@/hooks/use-layout";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { sidebarStyle, layoutStyle, setLayoutStyle } = useLayout();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // "full" layout hides the sidebar entirely (offcanvas / hamburger pattern)
  const showSidebar = layoutStyle !== "full";
  // "compact" layout forces the sidebar into collapsed mode
  const forceCollapsed = layoutStyle === "compact";

  const handleSidebarToggle = () => {
    if (layoutStyle === "full") {
      setLayoutStyle("default");
      setMobileSidebarOpen(true);
      return;
    }
    setMobileSidebarOpen((open) => !open);
  };

  return (
    <div
      className={cn(
        "relative flex h-screen overflow-hidden",
        sidebarStyle === "inset" && "bg-muted/30 md:gap-2 md:p-2",
        sidebarStyle === "floating" && "md:gap-3 md:p-3"
      )}
    >
      {showSidebar && (
        <>
          <div className="hidden h-full md:block">
            <Sidebar forceCollapsed={forceCollapsed} />
          </div>
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-[70] md:hidden">
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div className="absolute inset-y-0 left-0">
                <Sidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
              </div>
            </div>
          )}
        </>
      )}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden",
          sidebarStyle === "inset" && "bg-background/90 md:rounded-2xl md:border md:shadow-[0_20px_40px_-24px_oklch(0.22_0.02_258/0.35)] md:backdrop-blur-sm",
          sidebarStyle === "floating" && "bg-background/85 md:rounded-2xl md:border md:shadow-[0_20px_40px_-24px_oklch(0.22_0.02_258/0.35)] md:backdrop-blur-sm"
        )}
      >
        <Header
          showSidebarToggle={showSidebar || layoutStyle === "full"}
          sidebarToggleMobileOnly={layoutStyle !== "full"}
          onSidebarToggle={handleSidebarToggle}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
