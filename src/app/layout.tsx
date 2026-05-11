import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kandi Maker",
  description: "Design digital kandi bracelets with 2D editing and 3D preview.",
};

/** Keeps pinch/zoom gestures on the canvas (OrbitControls) instead of scaling the whole page UI. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
