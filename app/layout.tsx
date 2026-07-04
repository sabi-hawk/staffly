import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Softonoma — Employee Portal",
  description: "Softonoma HR & workforce management portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* global navigation progress bar — instant feedback on every route/filter change */}
        <NextTopLoader color="#2563eb" height={3} showSpinner={false} shadow="0 0 8px #2563eb" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
