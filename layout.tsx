import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NELTRIX I.S. Global | International Shipping",
  description: "International shipping, freight and delivery solutions. Global shipping, simplified.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
