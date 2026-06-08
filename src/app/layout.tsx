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
  title: {
    default: "Check4D Intelligence Terminal — Malaysia 4D Analytics",
    template: "%s | Check4D",
  },
  description:
    "Malaysia's most comprehensive 4D lottery intelligence platform. 40 years of historical data across Magnum, Damacai, Toto, Cash Sweep, Sabah 88, Sandakan 4D & Singapore Pools. Real-time results, number analytics and pattern analysis.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://check4dterminal.com"
  ),
  keywords: [
    "4D lottery Malaysia",
    "Magnum 4D",
    "Damacai",
    "Sports Toto",
    "4D results",
    "4D history",
    "lucky number",
    "nombor 4D",
    "4D analytics",
    "Check4D",
  ],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "Check4D Intelligence Terminal",
    description: "40 years of Malaysia 4D lottery data. Real-time results & number analytics.",
    type: "website",
    locale: "en_MY",
    siteName: "Check4D",
    url: "https://check4dterminal.com",
  },
  twitter: {
    card: "summary",
    title: "Check4D Intelligence Terminal",
    description: "40 years of Malaysia 4D lottery data.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: "https://check4dterminal.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-MY" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {/* ADSENSE_SLOT_TOP — layout-level placeholder */}
        <AppProviders>
          <MainNav />
          <main className="lg:pl-48">{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
