'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'dashboard' },
  { href: '/songs', label: 'songs' },
  { href: '/artists', label: 'artists' },
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
          className={`text-[12px] transition-opacity ${
            pathname.startsWith(href)
              ? 'text-text'
              : 'text-text-muted hover:opacity-60'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
