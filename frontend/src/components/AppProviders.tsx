"use client";

import { SettingsProvider } from "@/lib/SettingsContext";
import { SessionProvider } from "next-auth/react";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>{children}</SettingsProvider>
    </SessionProvider>
  );
}
