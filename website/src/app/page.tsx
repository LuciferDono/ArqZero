import Link from 'next/link';

function Hero() {
  return (
    <section className="pt-24 pb-16 px-6 text-center">
      <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
        Arq<span style={{ color: 'var(--brand)' }}>Zero</span>
      </h1>
      <p className="text-xl md:text-2xl max-w-2xl mx-auto mb-4" style={{ color: 'var(--text)' }}>
        The only coding agent that enforces engineering methodology
      </p>
      <p className="text-base max-w-xl mx-auto mb-10" style={{ color: 'var(--text-dim)' }}>
        Bring your own AI. Your keys. Your models. Your terminal.
      </p>
      <div className="flex gap-4 justify-center flex-wrap">
        <Link
          href="/docs/install"
          className="px-6 py-3 rounded-lg font-semibold text-black transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          Get Started
        </Link>
        <Link
          href="/pricing"
          className="px-6 py-3 rounded-lg font-semibold border transition-colors hover:bg-white/5"
          style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
        >
          View Pricing
        </Link>
      </div>
    </section>
  );
}

function TerminalDemo() {
  const lines = [
    { type: 'input', text: '> fix the auth bug in login' },
    { type: 'meta', text: 'Engaging debugging + security' },
    { type: 'tool', text: '● Read src/auth/login.ts', time: '0.2s' },
    { type: 'tool', text: '● Grep "token" → 12 matches', time: '0.3s' },
    { type: 'tool', text: '● Edit src/auth/login.ts', time: '0.1s' },
    { type: 'diff-add', text: '  ⎿ + const token = await verifyJWT(req);' },
    { type: 'diff-del', text: '  ⎿ - const token = req.headers.auth;' },
    { type: 'tool', text: '● Bash npm test', time: '1.4s' },
    { type: 'result', text: '  ⎿ 42 passing, 0 failing' },
    { type: 'output', text: 'All tests pass. Auth now validates JWT properly.' },
  ];

  return (
    <section className="pb-20 px-6">
      <div
        className="max-w-3xl mx-auto rounded-xl overflow-hidden border"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="w-3 h-3 rounded-full bg-red-500/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <span className="w-3 h-3 rounded-full bg-green-500/80" />
          <span className="ml-3 text-xs" style={{ color: 'var(--text-dim)' }}>arqzero</span>
        </div>
        {/* Terminal body */}
        <div className="p-5 text-sm leading-relaxed space-y-1 font-mono">
          {lines.map((line, i) => (
            <div key={i} className="flex justify-between">
              <span
                className={
                  line.type === 'input' ? 'font-bold text-white' :
                  line.type === 'meta' ? 'italic' :
                  line.type === 'diff-add' ? '' :
                  line.type === 'diff-del' ? '' :
                  line.type === 'result' ? '' :
                  line.type === 'output' ? 'mt-2' : ''
                }
                style={{
                  color:
                    line.type === 'input' ? '#ffffff' :
                    line.type === 'meta' ? 'var(--text-dim)' :
                    line.type === 'tool' ? 'var(--brand)' :
                    line.type === 'diff-add' ? '#4ade80' :
                    line.type === 'diff-del' ? '#f87171' :
                    line.type === 'result' ? 'var(--text-dim)' :
                    'var(--text)',
                }}
              >
                {line.text}
              </span>
              {line.time && (
                <span className="ml-4 shrink-0" style={{ color: 'var(--text-dim)' }}>
                  {line.time}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    title: '42 Structured Capabilities',
    desc: 'TDD, debugging, code review with real multi-step protocols. Not just prompts — enforced methodology.',
  },
  {
    title: 'Verification Gates',
    desc: "Won't claim done until tests pass. Every capability has built-in verification steps.",
  },
  {
    title: 'Any LLM Provider',
    desc: 'OpenAI, Anthropic, Fireworks, Ollama, any OpenAI-compatible endpoint. Your keys, your choice.',
  },
  {
    title: '18 Built-in Tools',
    desc: 'Read, Write, Edit, Bash, Glob, Grep, WebSearch, and more. Full filesystem and shell access.',
  },
  {
    title: 'Subagent Dispatch',
    desc: 'Up to 7 parallel agents for complex tasks. Divide and conquer with structured coordination.',
  },
  {
    title: 'Cross-Session Memory',
    desc: 'Learns across sessions, remembers your project patterns, preferences, and architecture decisions.',
  },
];

function Features() {
  return (
    <section className="pb-20 px-6">
      <h2 className="text-3xl font-bold text-center mb-12">
        Built for <span style={{ color: 'var(--brand)' }}>real engineering</span>
      </h2>
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-xl border p-6 transition-colors hover:border-[var(--brand)]/30"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

const comparisonRows = [
  { feature: 'Methodologies', arq: '42 structured', claude: 'None', cursor: 'None', cont: 'None' },
  { feature: 'Verification gates', arq: 'Yes', claude: 'No', cursor: 'No', cont: 'No' },
  { feature: 'Any LLM', arq: 'Yes', claude: 'Claude only', cursor: 'Limited', cont: 'Yes' },
  { feature: 'Price', arq: '$12/mo', claude: '$20/mo + API', cursor: '$20/mo', cont: 'Free' },
  { feature: 'Open-core', arq: 'Yes', claude: 'No', cursor: 'No', cont: 'Yes' },
  { feature: 'Subagents', arq: '7 parallel', claude: '1', cursor: 'No', cont: 'No' },
];

function Comparison() {
  return (
    <section className="pb-20 px-6">
      <h2 className="text-3xl font-bold text-center mb-12">
        How ArqZero <span style={{ color: 'var(--brand)' }}>compares</span>
      </h2>
      <div className="max-w-4xl mx-auto overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-dim)' }}>Feature</th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--brand)' }}>ArqZero</th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-dim)' }}>Claude Code</th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-dim)' }}>Cursor</th>
              <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-dim)' }}>Continue</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row) => (
              <tr key={row.feature} className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="py-3 px-4 text-white">{row.feature}</td>
                <td className="py-3 px-4 font-semibold" style={{ color: 'var(--brand)' }}>{row.arq}</td>
                <td className="py-3 px-4" style={{ color: 'var(--text-dim)' }}>{row.claude}</td>
                <td className="py-3 px-4" style={{ color: 'var(--text-dim)' }}>{row.cursor}</td>
                <td className="py-3 px-4" style={{ color: 'var(--text-dim)' }}>{row.cont}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CTAFooter() {
  return (
    <section className="py-20 px-6 text-center border-t" style={{ borderColor: 'var(--border)' }}>
      <h2 className="text-3xl font-bold mb-4">
        Get started in <span style={{ color: 'var(--brand)' }}>30 seconds</span>
      </h2>
      <div
        className="inline-block rounded-lg px-6 py-3 mb-8 font-mono text-sm border"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
        <span className="text-white">npm i -g arqzero</span>
      </div>
      <div>
        <Link
          href="/pricing"
          className="px-6 py-3 rounded-lg font-semibold text-black transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--brand)' }}
        >
          View Pricing
        </Link>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <TerminalDemo />
      <Features />
      <Comparison />
      <CTAFooter />
    </main>
  );
}
