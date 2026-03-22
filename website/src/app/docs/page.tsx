import Link from 'next/link';

const sections = [
  {
    title: 'Installation',
    desc: 'Get ArqZero installed and configured in under a minute.',
    href: '/docs/install',
  },
  {
    title: 'Tools',
    desc: 'All 18 built-in tools: Read, Write, Edit, Bash, Glob, Grep, and more.',
    href: '/docs/tools',
  },
  {
    title: 'Capabilities',
    desc: '42 structured engineering capabilities with verification gates.',
    href: '/docs/capabilities',
  },
  {
    title: 'Commands',
    desc: '25+ slash commands for session control, agents, and system management.',
    href: '/docs/commands',
  },
  {
    title: 'Configuration',
    desc: 'Settings hierarchy, environment variables, ARQZERO.md, and plugins.',
    href: '/docs/config',
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
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-white">{s.title}</h2>
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
