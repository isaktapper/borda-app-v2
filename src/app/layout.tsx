import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { PostHogProvider } from "@/lib/posthog";
import { TourProvider } from "@/lib/tour/tour-provider";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const uxum = localFont({
  src: [
    {
      path: "../../public/fonts/uxumlight.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/uxumregular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/uxumbold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-uxum",
});

export const metadata: Metadata = {
  title: "Borda",
  description: "Customer onboarding platform",
  icons: {
    icon: [
      {
        url: "/borda_favicon_light.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/borda_favicon_dark.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${uxum.variable} ${jetBrainsMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <PostHogProvider>
          <TourProvider>
            {children}
          </TourProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
