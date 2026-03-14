import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import Sidebar from "./components/Sidebar";
import { ThemeProvider } from "./components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Media OS - Dashboard",
  description: "Social media management system dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 transition-colors duration-200 dark:bg-gray-950 dark:text-gray-100`}
      >
        <AuthProvider>
          <ThemeProvider>
            <Toaster position="top-right" />
            <Sidebar />
            <main
              className="min-h-screen w-full bg-gray-50 px-4 pb-4 pt-16 transition-colors duration-200 dark:bg-gray-950 sm:px-6 sm:pb-6 lg:ml-[240px] lg:w-[calc(100vw-240px)] lg:p-8 lg:pt-8"
            >
              {children}
            </main>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
