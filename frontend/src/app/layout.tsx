import type { Metadata } from "next";
import {
  Syne, DM_Sans, JetBrains_Mono,
  Fira_Code, Playfair_Display, Rajdhani, Pacifico, Space_Mono
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppProviders from "@/components/AppProviders";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["400","500","600","700","800"], display: "optional", preload: false });
const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"], weight: ["300","400","500","600"], display: "optional", preload: false });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400","500"], display: "optional", preload: false });
const firaCode = Fira_Code({ variable: "--font-fira", subsets: ["latin"], weight: ["400","500","600"], display: "optional", preload: false });
const playfairDisplay = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400","500","600","700","800"], display: "optional", preload: false });
const rajdhani = Rajdhani({ variable: "--font-rajdhani", subsets: ["latin"], weight: ["300","400","500","600","700"], display: "optional", preload: false });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: ["400"], display: "optional", preload: false });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400","700"], display: "optional", preload: false });

export const metadata: Metadata = {
  title: "ASTRAMIND — AI, your way",
  description: "Route your prompts to 10+ AI providers. Fast, smart, always on.",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontClasses = [
    syne.variable, dmSans.variable, jetbrainsMono.variable,
    firaCode.variable, playfairDisplay.variable, rajdhani.variable,
    pacifico.variable, spaceMono.variable,
  ].join(" ");

  return (
    <html lang="en" style={{ height: "100%" }} suppressHydrationWarning>
        <body
          className={fontClasses}
          style={{ minHeight: "100%", WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}
          suppressHydrationWarning
        >
          <Script id="register-sw" strategy="afterInteractive">
            {`
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `}
          </Script>
          <AppProviders>
            {children}
          </AppProviders>
        </body>
      </html>
  );
}