"use client";

import { SettingsProvider } from "@/lib/SettingsContext";
import { SessionProvider } from "next-auth/react";
import { PWAProvider } from "@/lib/PWAContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PWAProvider>
        <SettingsProvider>{children}</SettingsProvider>
      </PWAProvider>
    </SessionProvider>
  );
}
