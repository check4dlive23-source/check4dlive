import type { Metadata } from "next";
import { Noto_Sans_SC, Rajdhani } from "next/font/google";
import "./globals.css";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-sc",
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
        className={`${rajdhani.variable} ${notoSansSC.variable} font-sans antialiased`}
      >
        {/* ADSENSE_SLOT_TOP — layout-level placeholder */}
        {children}
      </body>
    </html>
  );
}
