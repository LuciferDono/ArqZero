import Link from 'next/link';

const sidebarLinks = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/install', label: 'Installation' },
  { href: '#', label: 'Tools', disabled: true },
  { href: '#', label: 'Capabilities', disabled: true },
  { href: '#', label: 'Configuration', disabled: true },
];

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
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
              style={{
                color: link.disabled ? 'var(--text-dim)' : 'var(--text)',
                pointerEvents: link.disabled ? 'none' : undefined,
              }}
            >
              {link.label}
              {link.disabled && (
                <span className="ml-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                  soon
                </span>
              )}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 md:p-12 max-w-3xl">{children}</main>
    </div>
  );
}
