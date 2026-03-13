import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Sidebar from "./components/Sidebar";

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

const themeScript = `
(function(){
  try {
    var theme = localStorage.getItem('theme');
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else if (theme === 'light') document.documentElement.classList.remove('dark');
  } catch(e){}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-50`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#333',
              color: '#fff',
              borderRadius: '10px',
            },
          }}
        />
        <Sidebar />
        <main
          className="min-h-screen w-full bg-slate-50 px-4 pb-4 pt-16 dark:bg-slate-900 sm:px-6 sm:pb-6 lg:ml-[240px] lg:w-[calc(100vw-240px)] lg:p-8 lg:pt-8"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
