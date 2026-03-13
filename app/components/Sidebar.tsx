"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/clients", label: "Clients", icon: "users" },
  { href: "/content", label: "All Content", icon: "fileText" },
  { href: "/campaigns", label: "All Campaigns", icon: "megaphone" },
  { href: "/analytics", label: "Analytics", icon: "barChart" },
  { href: "/tasks", label: "Tasks", icon: "checkSquare" },
  { href: "/assets", label: "Global Assets", icon: "image" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  users: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  fileText: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  megaphone: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  barChart: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  checkSquare: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  image: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  settings: (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [globalAgencyName, setGlobalAgencyName] = useState("Social Media OS");
  const [globalLogo, setGlobalLogo] = useState("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const loadSettings = () => {
        setGlobalAgencyName(localStorage.getItem("agencyName") || "Social Media OS");
        setGlobalLogo(localStorage.getItem("agencyLogo") || "");
        setLogoError(false);
      };
      loadSettings();
      window.addEventListener("agency-settings-updated", loadSettings);
      return () => window.removeEventListener("agency-settings-updated", loadSettings);
    }
  }, []);

  useEffect(() => {
    setLogoError(false);
  }, [globalLogo]);

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Hamburger - mobile only */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-[60] flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-white shadow-lg transition-colors hover:bg-slate-800 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Backdrop - mobile only when open */}
      {isOpen && (
        <div
          role="presentation"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar - overlay on mobile when open, always visible on lg */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-[240px] flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:flex`}
      >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-800 px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {globalLogo && !logoError ? (
              <img
                key={globalLogo}
                src={globalLogo}
                alt={globalAgencyName}
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={() => setLogoError(true)}
                className="h-8 w-auto max-w-[120px] shrink-0 object-contain"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700/80 text-slate-300">
                <span className="text-sm font-bold">{globalAgencyName.charAt(0).toUpperCase() || "B"}</span>
              </div>
            )}
            <span className="truncate text-xl font-semibold text-white">{globalAgencyName}</span>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="-mr-2 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 rounded-lg py-2.5 pr-3 pl-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-l-2 border-l-indigo-500 bg-slate-800 pl-[10px] text-white"
                    : "border-l-2 border-l-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {icons[item.icon]}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
    </>
  );
}
