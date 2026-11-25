import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { PlatformProvider } from "@/services/platform-store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KhetLink | Local farm trade, made fair",
  description: "Transparent local demand matching for farmers and bulk buyers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PlatformProvider>{children}</PlatformProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
