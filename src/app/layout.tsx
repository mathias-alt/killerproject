import type { Metadata } from "next";
import { Geist_Mono, Outfit, DM_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LayoutProvider } from "@/components/providers/layout-provider";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KillerProject",
  description: "Project management with Gantt charts and Kanban boards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${outfit.variable} ${dmSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <LayoutProvider>
            {children}
          </LayoutProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
