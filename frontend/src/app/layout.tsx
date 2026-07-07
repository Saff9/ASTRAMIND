import type { Metadata } from "next";
import {
  Syne, DM_Sans, JetBrains_Mono,
  Fira_Code, Playfair_Display, Rajdhani, Pacifico, Space_Mono
} from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import InstallPrompt from "@/components/common/InstallPrompt";
import UpdateBanner from "@/components/common/UpdateBanner";

const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "optional", preload: false });
const dmSans = DM_Sans({ variable: "--font-dm", subsets: ["latin"], weight: ["300", "400", "500", "600"], display: "optional", preload: false });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"], display: "optional", preload: false });
const firaCode = Fira_Code({ variable: "--font-fira", subsets: ["latin"], weight: ["400", "500", "600"], display: "optional", preload: false });
const playfairDisplay = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], display: "optional", preload: false });
const rajdhani = Rajdhani({ variable: "--font-rajdhani", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], display: "optional", preload: false });
const pacifico = Pacifico({ variable: "--font-pacifico", subsets: ["latin"], weight: ["400"], display: "optional", preload: false });
const spaceMono = Space_Mono({ variable: "--font-space-mono", subsets: ["latin"], weight: ["400", "700"], display: "optional", preload: false });

export const metadata: Metadata = {
  title: "ASTRAMIND — Your Socratic Programming Professor",
  description: "Learn programming (Python, C++, Java, JS/TS, Git) with Prof. Astra. An interactive, Socratic coding professor that builds critical thinking, quizzes your understanding, and finds the best resources.",
  keywords: ["AI Programming Professor", "Learn Python", "Learn C++", "Learn Java", "Socratic Coding Tutor", "AI Programming Mentor", "ASTRAMIND", "Prof. Astra"],
  authors: [{ name: "ASTRAMIND Team" }],
  openGraph: {
    title: "ASTRAMIND — Socratic AI Programming Professor",
    description: "Learn Python, C++, Java, JS/TS, Git and more with Prof. Astra. Interactive Socratic lessons, real-time code execution guidance, resources, and custom quizzes.",
    url: "https://astramind-lake.vercel.app/",
    siteName: "ASTRAMIND",
    images: [
      {
        url: "https://astramind-lake.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "ASTRAMIND Programming Professor Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ASTRAMIND — Interactive Socratic Programming Professor",
    description: "Learn Python, C++, Java, JS/TS, Git and more with Prof. Astra. Socratic lessons, quizzes, and live resource finding.",
    images: ["https://astramind-lake.vercel.app/og-image.png"],
    creator: "@astramind_ai",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ASTRAMIND",
  "operatingSystem": "Web",
  "applicationCategory": "EducationalApplication",
  "description": "An interactive, Socratic AI Programming Professor named Prof. Astra, teaching Python, C/C++, Java, JavaScript, TypeScript, and software engineering concepts.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
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
        <Script id="json-ld" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(jsonLd)}
        </Script>
        <AppProviders>
          <UpdateBanner />
          {children}
          <InstallPrompt />
        </AppProviders>
      </body>
    </html>
  );
}