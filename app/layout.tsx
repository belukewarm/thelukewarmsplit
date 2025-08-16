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
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 -left-24 w-[520px] h-[520px] rounded-full blur-3xl bg-gradient-to-br from-[rgba(var(--accent-from),0.35)] to-[rgba(var(--accent-to),0.25)]" />
          <div className="absolute bottom-[-120px] right-[-120px] w-[600px] h-[600px] rounded-full blur-3xl bg-gradient-to-tr from-[rgba(var(--accent-to),0.28)] to-[rgba(var(--accent-from),0.3)]" />
        </div>
        <div className="max-w-[1200px] mx-auto px-5 py-7">{children}</div>
      </body>
    </html>
  );
}
