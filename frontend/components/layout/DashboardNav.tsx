"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search, Bell, User, Settings, Bookmark } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  id: number;
  icon: React.ReactNode;
  label: string;
  href: string;
}

const items: NavItem[] = [
  { id: 0, icon: <Home size={20} />, label: "Dashboard", href: "/dashboard" },
  { id: 1, icon: <Search size={20} />, label: "Jobs", href: "/dashboard/jobs" },
  { id: 2, icon: <Bookmark size={20} />, label: "Resumes", href: "/dashboard/resumes" },
  { id: 3, icon: <Bell size={20} />, label: "Interviews", href: "/dashboard/interviews" },
  { id: 4, icon: <User size={20} />, label: "Profile", href: "/dashboard/profile" },
  { id: 5, icon: <Settings size={20} />, label: "Settings", href: "/dashboard/settings" },
];

export const DashboardNav = () => {
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Find active index based on pathname
  const activeIndex = items.findIndex((item) => {
    if (item.href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(item.href);
  });

  const currentActive = activeIndex !== -1 ? activeIndex : 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <motion.div
        layout
        className="relative flex items-center justify-center gap-2 bg-black/40 backdrop-blur-2xl rounded-full p-2 shadow-xl border border-white/10 overflow-hidden"
      >
        {items.map((item, index) => {
          const isActive = index === currentActive;
          const isHovered = index === hoveredIndex;

          return (
            <Link href={item.href} key={item.id}>
              <motion.div
                layout
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`relative flex items-center justify-center h-12 px-4 rounded-full cursor-pointer transition-colors duration-300 ${
                  isActive
                    ? "text-white"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {/* Active Background Indicator */}
                {isActive && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 bg-white/10 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Hover Background Indicator */}
                {isHovered && !isActive && (
                  <motion.div
                    layoutId="hover-bg"
                    className="absolute inset-0 bg-white/5 rounded-full -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}

                <motion.div layout className="flex items-center justify-center">
                  {item.icon}
                </motion.div>

                <AnimatePresence mode="popLayout">
                  {isHovered && (
                    <motion.span
                      layout
                      initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                      animate={{ opacity: 1, width: "auto", marginLeft: 8 }}
                      exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
};
