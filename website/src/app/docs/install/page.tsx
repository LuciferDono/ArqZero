import Link from 'next/link';

export default function InstallPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">Installation</h1>

      {/* Install command */}
      <div
        className="rounded-lg border p-4 mb-8 font-mono text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
        <span className="text-white">npm i -g arqzero</span>
      </div>

      {/* Quick Start */}
      <h2 className="text-xl font-bold mb-4 text-white">Quick Start</h2>
      <div
        className="rounded-lg border p-4 mb-8 font-mono text-sm space-y-2"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <span style={{ color: 'var(--text-dim)' }}># Configure your LLM API key</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">arqzero setup</span>
        </div>
        <div className="pt-2">
          <span style={{ color: 'var(--text-dim)' }}># Start coding</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">arqzero</span>
        </div>
      </div>

      {/* Headless mode */}
      <h2 className="text-xl font-bold mb-4 text-white">Headless Mode</h2>
      <p className="mb-4 text-sm" style={{ color: 'var(--text-dim)' }}>
        Run ArqZero without the interactive TUI for scripting and CI/CD:
      </p>
      <div
        className="rounded-lg border p-4 mb-8 font-mono text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
        <span className="text-white">arqzero -p &quot;fix the bug in src/index.ts&quot;</span>
      </div>

      {/* What's next */}
      <h2 className="text-xl font-bold mb-4 text-white">What&apos;s Next</h2>
      <ul className="space-y-2 text-sm" style={{ color: 'var(--text-dim)' }}>
        <li>
          <span style={{ color: 'var(--brand)' }}>+</span>{' '}
          <Link href="/docs/tools" className="text-white hover:underline">Tools reference</Link>
          {' '}&mdash; all 18 built-in tools
        </li>
        <li>
          <span style={{ color: 'var(--brand)' }}>+</span>{' '}
          <Link href="/docs/capabilities" className="text-white hover:underline">Capabilities guide</Link>
          {' '}&mdash; 42 engineering capabilities
        </li>
        <li>
          <span style={{ color: 'var(--brand)' }}>+</span>{' '}
          <Link href="/docs/commands" className="text-white hover:underline">Commands</Link>
          {' '}&mdash; 25+ slash commands
        </li>
        <li>
          <span style={{ color: 'var(--brand)' }}>+</span>{' '}
          <Link href="/docs/config" className="text-white hover:underline">Configuration</Link>
          {' '}&mdash; settings, env vars, ARQZERO.md
        </li>
      </ul>
    </div>
  );
}
