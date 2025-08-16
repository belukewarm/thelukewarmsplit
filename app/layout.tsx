import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lukewarm Split",
  description: "Split Uber Eats / grocery orders fairly — items by person, fees split evenly."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="max-w-[1100px] mx-auto px-5 py-7">{children}</div>
      </body>
    </html>
  );
}
