import { AppProviders } from "@/components/providers/AppProviders";
import { MainNav } from "@/components/layout/MainNav";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "optional",
});

export const metadata: Metadata = {
  title: "Check4D Live — Malaysian 4D Lottery Data Terminal",
  description:
    "Real-time Malaysian 4D lottery results and analytics. Data terminal for Magnum, Damacai, Toto, Sabah, Sarawak, Cambodia & Singapore Pools.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://check4dlive.com"
  ),
  openGraph: {
    title: "Check4D Live",
    description: "Malaysian 4D lottery data terminal — live results & analytics",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {/* ADSENSE_SLOT_TOP — layout-level placeholder */}
        <AppProviders>
          <MainNav />
          <main className="sm:pt-14">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
