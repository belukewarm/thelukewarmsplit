export const metadata = {
  title: "lukewarm splitting",
  description: "Split Uber/Target orders fairly — even or proportional — with glassy vibes",
};
import "./globals.css";
import React from "react";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}