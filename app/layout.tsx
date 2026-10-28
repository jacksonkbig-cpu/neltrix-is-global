import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import AIChatWidget from "@/components/support/AIChatWidget";
import "./globals.css";

// Middleware generates a per-request CSP nonce. Dynamic rendering is required so
// Next.js can attach that nonce to framework hydration and inline bootstrap scripts.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "NELTRIX I.S. Global | International Shipping",
  description: "International shipping, freight and delivery solutions. Global shipping, simplified.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<AIChatWidget /><SpeedInsights /></body></html>;
}
