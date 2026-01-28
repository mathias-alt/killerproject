"use client";

import { createContext, useContext } from "react";

export type SidebarStyle = "inset" | "floating" | "sidebar";
export type LayoutStyle = "default" | "compact" | "full";

export interface LayoutState {
  sidebarStyle: SidebarStyle;
  setSidebarStyle: (style: SidebarStyle) => void;
  layoutStyle: LayoutStyle;
  setLayoutStyle: (style: LayoutStyle) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const LayoutContext = createContext<LayoutState>({
  sidebarStyle: "inset",
  setSidebarStyle: () => {},
  layoutStyle: "compact",
  setLayoutStyle: () => {},
  sidebarCollapsed: false,
  setSidebarCollapsed: () => {},
});

export function useLayout() {
  return useContext(LayoutContext);
}
