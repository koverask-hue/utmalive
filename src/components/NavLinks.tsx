"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLinks({ isStreamer }: { isStreamer: boolean }) {
  const path = usePathname();
  const links = [{ href: "/", label: "Streams" }, ...(isStreamer ? [{ href: "/studio", label: "Studio" }] : [])];
  return (
    <>
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/streams") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={`navlink ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </>
  );
}
