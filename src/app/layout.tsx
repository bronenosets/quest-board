import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { ConfettiHost } from "@/components/confetti";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quest Board",
  description: "A gamified family quest tracker",
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
