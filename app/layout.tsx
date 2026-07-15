import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import "@/styles/mascot-keyframes.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Perch — land in a new city",
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
        {children}
      </body>
    </html>
  );
}
