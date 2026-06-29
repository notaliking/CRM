import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { MetaPixel } from "@/components/MetaPixel";
import { getMetaConfig } from "@/lib/meta";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Triple Eye CRM | Enterprise Real Estate Command Center",
  description: "Enterprise-grade Real Estate CRM for leads tracking, property inventory management, and agent leaderboard metrics.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getMetaConfig();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-900 text-slate-100 font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Suspense fallback={null}>
          <MetaPixel pixelId={config.pixelId} />
        </Suspense>
      </body>
    </html>
  );
}

