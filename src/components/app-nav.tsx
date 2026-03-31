'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'dashboard' },
  { href: '/artists', label: 'artists' },
  { href: '/songs', label: 'songs' },
  { href: '/performances', label: 'performances' },
  { href: '/export', label: 'export' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-4">
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
