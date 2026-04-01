import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthSessionProvider } from "@/components/auth/AuthSessionProvider";
import { LegacyServiceWorkerCleanup } from "@/components/auth/LegacyServiceWorkerCleanup";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Put On My Tab",
  description: "A modern finance workspace for shared expenses and tabs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        spaceGrotesk.variable,
        "font-sans",
        manrope.variable,
      )}
    >
      <body className="min-h-full min-h-screen app-bg text-slate-900">
        <LegacyServiceWorkerCleanup />
        <AuthSessionProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </AuthSessionProvider>
      </body>
    </html>
  );
}
