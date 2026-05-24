'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'dashboard' },
  { href: '/artists', label: 'artists' },
  { href: '/songs', label: 'songs' },
  { href: '/performances', label: 'performances' },
  { href: '/import', label: 'import' },
  { href: '/export', label: 'export' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    // Horizontal scroll on mobile (6 nav links won't fit at 375px); flex-wrap
    // not used because it splits the underline-indicator across 2 rows weirdly.
    // -mx + px gives bleed-to-edge scroll on mobile, normal padding on md+.
    // Webkit/Firefox scrollbar hiding via arbitrary properties keeps the row
    // clean — OS-level scroll affordances still work on touch.
    <div className="flex items-center gap-4 overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={`text-[12px] pb-[2px] transition-all ${
            pathname.startsWith(href)
              ? 'text-text border-b border-white'
              : 'text-text-muted border-b border-transparent hover:opacity-60'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
