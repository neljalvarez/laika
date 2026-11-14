import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAIKA: Mission Red Planet",
  description:
    "One small dog. One enormous mission. A pixel-art strategy game about engineering trade-offs on Mars for ages 7–12. Alternate-history fiction; not affiliated with NASA.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#141C32",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
