"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, RefreshCw, Trash2 } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  function handleClearAndReset() {
    // Clear potentially corrupted localStorage
    try {
      localStorage.removeItem("layout-settings");
    } catch {}
    reset();
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            The dashboard encountered an error. This is usually temporary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md font-mono break-all">
            {error.message}
          </p>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleClearAndReset} className="flex-1">
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cache &amp; Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
