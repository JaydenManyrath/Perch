import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "@/styles/mascot-keyframes.css";
import { PilotNavLogger } from "@/components/pilot/PilotNavLogger";

// Nunito is bundled in the repo (SIL Open Font License, see app/fonts) so builds never
// depend on reaching Google Fonts; some networks and antivirus filters break that fetch.
const nunito = localFont({
  src: "./fonts/nunito-latin-wght-normal.woff2",
  weight: "200 1000",
  display: "swap",
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Perch - land in a new city",
  description:
    "The social network interns use to land in a new city: find your flock, perch on a sublease, get familiar before you arrive.",
};

export const viewport: Viewport = {
  themeColor: "#F2F9FE",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="font-sans text-body text-ink-strong bg-sky-50">
        <PilotNavLogger />
        {children}
      </body>
    </html>
  );
}
