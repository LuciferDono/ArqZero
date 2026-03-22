import Link from 'next/link';

const sections = [
  {
    title: 'Installation',
    desc: 'Get ArqZero installed and configured in under a minute.',
    href: '/docs/install',
    ready: true,
  },
  {
    title: 'Tools',
    desc: 'All 18 built-in tools: Read, Write, Edit, Bash, Glob, Grep, and more.',
    href: '#',
    ready: false,
  },
  {
    title: 'Capabilities',
    desc: '42 structured engineering capabilities with verification gates.',
    href: '#',
    ready: false,
  },
  {
    title: 'Configuration',
    desc: 'Settings, environment variables, plugins, and custom commands.',
    href: '#',
    ready: false,
  },
];

export default function DocsIndex() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-white">Documentation</h1>
      <p className="mb-10" style={{ color: 'var(--text-dim)' }}>
        Everything you need to get productive with ArqZero.
      </p>

      <div className="space-y-4">
        {sections.map((s) => (
          <Link
            key={s.title}
            href={s.href}
            className="block rounded-xl border p-6 transition-colors hover:border-[var(--brand)]/30"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              pointerEvents: s.ready ? undefined : 'none',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-white">{s.title}</h2>
              {!s.ready && (
                <span
                  className="text-xs px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--border)', color: 'var(--text-dim)' }}
                >
                  coming soon
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              {s.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
