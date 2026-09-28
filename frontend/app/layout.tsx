import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import AppProviders from "../components/providers/AppProviders";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartFin AI — Personal Finance Management",
  description: "Professional financial management, expense forecasting, anomaly detection, and health scoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexSerif.variable}`}>
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen font-sans text-sm">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
