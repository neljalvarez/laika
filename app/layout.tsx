import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TEXT_SIZE_BOOT } from "@/lib/prefsKey";

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Applies the saved text size before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: TEXT_SIZE_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
