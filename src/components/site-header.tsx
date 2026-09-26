"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { product } from "@/lib/factory";

const links = [
  { href: "/", label: "Control" },
  { href: "/demos/factory", label: "Factory run" },
  { href: "/demos/change-impact", label: "Change impact" },
  { href: "/demos/sme-review", label: "SME review" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="site-bar">
        <Link className="wordmark" href="/">
          PSVF
        </Link>
        <p className="rec">
          <span className="tally" aria-hidden="true" />
          Synthetic demo
        </p>
      </div>
      <nav aria-label="Factory">
        <ul>
          {links.map((link) => {
            const current = pathname === link.href;
            return (
              <li key={link.href}>
                <Link href={link.href} aria-current={current ? "page" : undefined}>
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="marking">
        {product.marking}. {product.disclaimer}
      </p>
    </header>
  );
}
