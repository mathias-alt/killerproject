"use client";

import { useState, useEffect } from "react";
import { LayoutContext, type SidebarStyle, type LayoutStyle } from "@/hooks/use-layout";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarStyle, setSidebarStyleState] = useState<SidebarStyle>("inset");
  const [layoutStyle, setLayoutStyleState] = useState<LayoutStyle>("compact");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("layout-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sidebarStyle) setSidebarStyleState(parsed.sidebarStyle);
        if (parsed.layoutStyle) setLayoutStyleState(parsed.layoutStyle);
        if (parsed.sidebarCollapsed != null) setSidebarCollapsed(parsed.sidebarCollapsed);
      } catch {}
    }
  }, []);

  function persist(key: string, value: unknown) {
    const saved = JSON.parse(localStorage.getItem("layout-settings") ?? "{}");
    saved[key] = value;
    localStorage.setItem("layout-settings", JSON.stringify(saved));
  }

  function setSidebarStyle(style: SidebarStyle) {
    setSidebarStyleState(style);
    persist("sidebarStyle", style);
  }

  function setLayoutStyle(style: LayoutStyle) {
    setLayoutStyleState(style);
    persist("layoutStyle", style);
  }

  function setCollapsed(collapsed: boolean) {
    setSidebarCollapsed(collapsed);
    persist("sidebarCollapsed", collapsed);
  }

  return (
    <LayoutContext.Provider
      value={{
        sidebarStyle,
        setSidebarStyle,
        layoutStyle,
        setLayoutStyle,
        sidebarCollapsed,
        setSidebarCollapsed: setCollapsed,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}
