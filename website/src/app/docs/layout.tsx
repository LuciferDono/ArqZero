'use client';

import { useState } from 'react';
import Link from 'next/link';

const sidebarLinks = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/install', label: 'Installation' },
  { href: '/docs/tools', label: 'Tools' },
  { href: '/docs/capabilities', label: 'Capabilities' },
  { href: '/docs/commands', label: 'Commands' },
  { href: '/docs/config', label: 'Configuration' },
  { href: '/blog', label: 'Blog' },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile header */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Link href="/" className="text-lg font-bold">
          Arq<span style={{ color: 'var(--brand)' }}>Zero</span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="px-3 py-2 text-sm border rounded"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          aria-label="Toggle navigation menu"
        >
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <aside
          className="md:hidden border-b p-6"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <nav className="space-y-2">
            {sidebarLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                style={{ color: 'var(--text)' }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
      )}

      {/* Desktop sidebar */}
      <aside
        className="w-64 shrink-0 border-r p-6 hidden md:block"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Link href="/" className="text-lg font-bold mb-8 block">
          Arq<span style={{ color: 'var(--brand)' }}>Zero</span>
        </Link>
        <nav className="space-y-2">
          {sidebarLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ color: 'var(--text)' }}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 px-4 py-6 md:p-12 max-w-3xl">{children}</main>
    </div>
  );
}
