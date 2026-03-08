"use client";

import React, { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText, 
  Target, 
  Video, 
  GraduationCap, 
  Settings, 
  LogOut,
  Shield
} from "lucide-react";

const mainLinks = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Resumes & ATS", href: "/dashboard/resumes", icon: FileText },
  { name: "Tailor to JD", href: "/dashboard/jobs", icon: Target },
  { name: "Interview Coach", href: "/dashboard/interviews", icon: Video },
  { name: "Skill Gap & Roadmap", href: "/dashboard/learning", icon: GraduationCap },
];

const bottomLinks = [
  { name: "Profile", href: "/dashboard/profile", icon: Settings },
];

export const Sidebar = () => {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState({
    full_name: "User",
    email: "",
    profile_pic_url: null as string | null,
    role: "user",
  });

  // Load real user from localStorage (set during login/signup)
  useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        try { setCurrentUser(JSON.parse(stored)); } catch {}
      }
    };
    load();
    // Re-sync when profile is updated (storage event from same tab won't fire, so poll on focus)
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const initials = useMemo(() => {
    return (currentUser.full_name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";
  }, [currentUser.full_name]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <aside className="w-64 h-screen border-r border-[var(--border)] bg-[var(--surface)] flex flex-col flex-shrink-0 sticky top-0">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">Job <span className="text-[var(--accent-2)]">Genie</span></span>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/dashboard/profile" className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors group">
          {/* Avatar */}
          {currentUser.profile_pic_url ? (
            <img
              src={currentUser.profile_pic_url}
              alt={currentUser.full_name}
              className="w-10 h-10 rounded-full object-cover ring-1 ring-[var(--border)] flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-sm font-bold text-[var(--muted)] flex-shrink-0 group-hover:border-indigo-200 transition-colors">
              {initials}
            </div>
          )}
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)] leading-tight truncate">{currentUser.full_name}</p>
            <p className="text-xs text-[var(--muted)] leading-tight mt-0.5 truncate">{currentUser.email}</p>
          </div>
        </Link>
      </div>


      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Menu</p>
        </div>
        {mainLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--accent-2)]/10 text-[var(--accent-2)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[var(--accent-2)]" : "text-[var(--muted)]"}`} />
              {link.name}
              {isActive && <div className="ml-auto w-1.5 h-4 bg-[var(--accent-2)] rounded-full" />}
            </Link>
          );
        })}

        {/* Admin Link - Only for Admins */}
        {currentUser.role === "admin" && (
          <div className="pt-4 mt-4 border-t border-[var(--border)]">
            <p className="px-3 mb-2 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Administration</p>
            <Link
              href="/dashboard/admin"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === "/dashboard/admin"
                  ? "bg-red-500/10 text-red-600"
                  : "text-[var(--muted)] hover:bg-red-50 hover:text-red-600"
              }`}
            >
              <Shield className={`w-4 h-4 ${pathname === "/dashboard/admin" ? "text-red-600" : "text-[var(--muted)]"}`} />
              Admin Portal
              {pathname === "/dashboard/admin" && <div className="ml-auto w-1.5 h-4 bg-red-600 rounded-full" />}
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom Navigation + Logout */}
      <div className="p-3 border-t border-[var(--border)] space-y-1">
        {bottomLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-[var(--accent-2)]/10 text-[var(--accent-2)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="w-4 h-4 text-[var(--muted)]" />
              {link.name}
            </Link>
          );
        })}

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </aside>
  );
};
