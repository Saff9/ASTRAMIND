"use client";

import { SettingsProvider } from "@/lib/SettingsContext";
import { PWAProvider } from "@/lib/PWAContext";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <PWAProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </PWAProvider>
  );
}
