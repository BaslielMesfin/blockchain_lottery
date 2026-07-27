"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Lotto", href: "/", icon: "confirmation_number" },
    { name: "Rules", href: "/rules", icon: "menu_book" },
    { name: "History", href: "/history", icon: "emoji_events" },
    { name: "Terms", href: "/terms", icon: "description" },
  ];

  return (
    <nav className="md:hidden bg-surface-container fixed bottom-0 w-full z-50 border-t-2 border-dashed border-outline-variant shadow-2xl flex justify-around items-center px-4 py-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center p-2 transition-transform ${
              isActive
                ? "bg-primary-container text-on-primary-container shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] translate-y-0.5"
                : "text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
            <span className="font-label-mono text-[10px] mt-0.5">{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
