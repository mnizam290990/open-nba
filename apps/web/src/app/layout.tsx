import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "openNBA — Next Best Action for Pharma MRs",
    template: "%s | openNBA",
  },
  description:
    "AI-powered Next Best Action platform that helps Medical Representatives re-engage HCPs at the right time with the right context.",
  keywords: ["pharma", "NBA", "MR", "HCP", "next best action", "AI", "agent"],
  authors: [{ name: "Nagarro" }],
  creator: "Nagarro",
  publisher: "Nagarro",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "openNBA — Next Best Action for Pharma MRs",
    description:
      "AI-powered Next Best Action platform that helps Medical Representatives re-engage HCPs at the right time with the right context.",
    siteName: "openNBA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "openNBA — Powered by Nagarro",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "openNBA — Next Best Action for Pharma MRs",
    description:
      "AI-powered Next Best Action platform that helps Medical Representatives re-engage HCPs at the right time with the right context.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
