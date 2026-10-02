"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const LINKS = [
  { href: "/planner", label: "Planner" },
  { href: "/rsvp", label: "RSVP" },
  { href: "/guestbook", label: "Guestbook" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8"
    >
      <Link href="/" className="group flex items-baseline gap-2">
        <span className="font-script text-[1.7rem] sm:text-3xl leading-none text-rosegold-deep transition-colors group-hover:text-cocoa">Cynthia&rsquo;s</span>
        <span className="caps hidden text-[0.65rem] text-cocoa-soft sm:inline">Wedding Plans</span>
      </Link>
      <nav className="flex gap-1 sm:gap-2">
        {LINKS.map((l) => {
          const active = path?.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className="relative px-2 py-1.5 text-[0.62rem] sm:text-[0.7rem] caps tracking-[0.16em] sm:tracking-[0.28em] text-cocoa-soft transition-colors hover:text-cocoa sm:px-3">
              {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full border hairline bg-white/50" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
              <span className="relative">{l.label}</span>
            </Link>
          );
        })}
      </nav>
    </motion.header>
  );
}
