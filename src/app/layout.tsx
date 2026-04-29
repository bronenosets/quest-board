import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { ConfettiHost } from "@/components/confetti";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quest Board",
  description: "A gamified family quest tracker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quest Board",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c4dff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <ConfettiHost />
        </Providers>
      </body>
    </html>
  );
}
