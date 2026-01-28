"use client";

import { useTheme } from "next-themes";
import { useLayout, type SidebarStyle, type LayoutStyle } from "@/hooks/use-layout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Settings, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function OptionCard({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "relative flex h-20 w-28 items-center justify-center rounded-lg border-2 transition-colors",
          selected ? "border-primary" : "border-muted hover:border-muted-foreground/30"
        )}
      >
        {children}
        {selected && (
          <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </div>
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// Mini layout previews
function SystemPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md">
      <div className="w-6 bg-muted/80 border-r" />
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-muted/40 border-b" />
        <div className="flex-1 p-1 space-y-1">
          <div className="h-2 w-10 rounded bg-muted/60" />
          <div className="h-4 w-full rounded bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

function LightPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md bg-white">
      <div className="w-6 bg-gray-100 border-r border-gray-200" />
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-gray-50 border-b border-gray-200" />
        <div className="flex-1 p-1 space-y-1">
          <div className="h-2 w-10 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

function DarkPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md bg-slate-900">
      <div className="w-6 bg-slate-800 border-r border-slate-700" />
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-slate-800/50 border-b border-slate-700" />
        <div className="flex-1 p-1 space-y-1">
          <div className="h-2 w-10 rounded bg-slate-700" />
          <div className="h-4 w-full rounded bg-slate-800" />
        </div>
      </div>
    </div>
  );
}

function InsetPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md bg-muted/30">
      <div className="w-6 bg-muted/80 border-r m-1 rounded" />
      <div className="flex-1 flex flex-col m-1">
        <div className="h-3 bg-muted/40 border-b rounded-t" />
        <div className="flex-1 bg-background rounded-b p-1">
          <div className="h-2 w-10 rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}

function FloatingPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md">
      <div className="w-6 bg-muted/80 m-1 rounded-lg shadow-sm" />
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-muted/40 border-b" />
        <div className="flex-1 p-1">
          <div className="h-2 w-10 rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}

function SidebarPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md">
      <div className="w-6 bg-muted/80 border-r" />
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-muted/40 border-b" />
        <div className="flex-1 p-1">
          <div className="h-2 w-10 rounded bg-muted/60" />
        </div>
      </div>
    </div>
  );
}

function DefaultLayoutPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md">
      <div className="w-7 bg-muted/80 border-r" />
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-muted/40 border-b" />
        <div className="flex-1 p-1 space-y-1">
          <div className="h-2 w-8 rounded bg-muted/60" />
          <div className="h-3 w-full rounded bg-muted/30" />
        </div>
      </div>
    </div>
  );
}

function CompactLayoutPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md">
      <div className="w-5 bg-muted/80 border-r" />
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-muted/40 border-b" />
        <div className="flex-1 p-0.5 space-y-0.5">
          <div className="h-2 w-8 rounded bg-muted/60" />
          <div className="h-3 w-full rounded bg-muted/30" />
          <div className="h-3 w-full rounded bg-muted/20" />
        </div>
      </div>
    </div>
  );
}

function FullLayoutPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-md">
      <div className="flex-1 flex flex-col">
        <div className="h-3 bg-muted/40 border-b" />
        <div className="flex flex-1">
          <div className="w-4 bg-muted/40 border-r" />
          <div className="flex-1 p-1 space-y-1">
            <div className="h-2 w-10 rounded bg-muted/60" />
            <div className="h-4 w-full rounded bg-muted/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const { sidebarStyle, setSidebarStyle, layoutStyle, setLayoutStyle } = useLayout();

  function handleReset() {
    setTheme("light");
    setSidebarStyle("inset");
    setLayoutStyle("compact");
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-80 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Theme Settings</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Adjust the appearance and layout to suit your preferences.
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Theme */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-primary">Theme</h3>
              <button onClick={() => setTheme("system")} className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-3">
              <OptionCard selected={theme === "system"} onClick={() => setTheme("system")} label="System">
                <SystemPreview />
              </OptionCard>
              <OptionCard selected={theme === "light"} onClick={() => setTheme("light")} label="Light">
                <LightPreview />
              </OptionCard>
              <OptionCard selected={theme === "dark"} onClick={() => setTheme("dark")} label="Dark">
                <DarkPreview />
              </OptionCard>
            </div>
          </div>

          <Separator />

          {/* Sidebar Style */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">Sidebar</h3>
            <div className="flex gap-3">
              <OptionCard selected={sidebarStyle === "inset"} onClick={() => setSidebarStyle("inset")} label="Inset">
                <InsetPreview />
              </OptionCard>
              <OptionCard selected={sidebarStyle === "floating"} onClick={() => setSidebarStyle("floating")} label="Floating">
                <FloatingPreview />
              </OptionCard>
              <OptionCard selected={sidebarStyle === "sidebar"} onClick={() => setSidebarStyle("sidebar")} label="Sidebar">
                <SidebarPreview />
              </OptionCard>
            </div>
          </div>

          <Separator />

          {/* Layout */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-primary">Layout</h3>
              <button onClick={() => setLayoutStyle("compact")} className="text-muted-foreground hover:text-foreground">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-3">
              <OptionCard selected={layoutStyle === "default"} onClick={() => setLayoutStyle("default")} label="Default">
                <DefaultLayoutPreview />
              </OptionCard>
              <OptionCard selected={layoutStyle === "compact"} onClick={() => setLayoutStyle("compact")} label="Compact">
                <CompactLayoutPreview />
              </OptionCard>
              <OptionCard selected={layoutStyle === "full"} onClick={() => setLayoutStyle("full")} label="Full layout">
                <FullLayoutPreview />
              </OptionCard>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button variant="destructive" className="w-full" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
