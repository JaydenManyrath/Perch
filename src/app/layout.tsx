import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Perch",
  description: "The social network interns use to land in a new city.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
