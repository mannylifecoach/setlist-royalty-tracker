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
          // touch-manipulation: kills the 300ms tap delay + double-tap zoom
          // on iOS Safari for these links. active:opacity for explicit tap
          // feedback so users see something happened. Tailwind's hover:
          // variant is already gated by `(hover: hover)` in v4, but the
          // explicit active: variant fires on touch + is the right signal.
          className={`text-[12px] pb-[2px] transition-all touch-manipulation ${
            pathname.startsWith(href)
              ? 'text-text border-b border-white'
              : 'text-text-muted border-b border-transparent hover:opacity-60 active:opacity-60'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
