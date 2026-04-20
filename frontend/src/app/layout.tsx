import Header from "@/components/Header";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "./providers";

const avenirNext = localFont({
  src: [
    {
      path: "./fonts/AvenirNext-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/AvenirNext-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/AvenirNextLTPro-Demi.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-avenir-next",
});

export const metadata: Metadata = {
  title: "Party Registration",
  description: "Party Registration",
  icons: {
    icon: "/Home1CarolinaBlue.png",
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
        className={`${avenirNext.variable} font-[family-name:var(--font-avenir-next)] antialiased h-screen overflow-hidden flex flex-col`}
      >
        <Providers>
          <Header />
          <div className="flex-1 overflow-hidden min-h-0">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
