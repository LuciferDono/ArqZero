import TerminalDemo from '@/components/TerminalDemo';

export default function Home() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
      {/* Nav */}
      <nav className="flex items-center justify-between mb-20">
        <span className="text-brand font-bold text-lg">◆ ArqZero</span>
        <div className="flex gap-4 sm:gap-6 text-sm text-text-dim">
          <a href="/pricing" className="hover:text-brand transition-colors py-1">pricing</a>
          <a href="/docs" className="hover:text-brand transition-colors py-1">docs</a>
          <a href="/blog" className="hover:text-brand transition-colors py-1">blog</a>
          <a href="https://github.com/LuciferDono/ArqZero" className="hover:text-brand transition-colors py-1">github</a>
        </div>
      </nav>

      {/* Hero — looks like a terminal prompt */}
      <section className="mb-24 animate-fade-in-up">
        <div className="text-text-dim text-sm mb-4">$ arqzero --about</div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 leading-tight">
          The coding agent that follows<br />
          <span className="text-brand glow">engineering methodology.</span>
        </h1>
        <p className="text-text-dim text-lg mb-8 max-w-2xl">
          Not a chatbot wrapper. ArqZero has 42 structured capabilities —
          TDD protocols, debugging procedures, verification gates that
          won&apos;t let it claim done until tests pass.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/docs/install"
            className="bg-brand text-black font-bold px-6 py-3 text-sm text-center hover:bg-brand-light transition-colors">
            npm i -g arqzero
          </a>
          <a href="/pricing"
            className="border border-border px-6 py-3 text-sm text-center text-text-dim hover:border-brand hover:text-brand transition-colors">
            view pricing →
          </a>
        </div>
      </section>

      {/* Terminal demo */}
      <section className="mb-24">
        <div className="text-text-dim text-sm mb-4">$ arqzero</div>
        <TerminalDemo />
      </section>

      {/* How it works — three "commands" */}
      <section className="mb-24 stagger">
        <div className="text-text-dim text-sm mb-8">$ arqzero --how-it-works</div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-surface border border-border p-5">
            <div className="text-brand text-sm mb-2">01</div>
            <div className="font-bold mb-2">You describe the task</div>
            <div className="text-text-dim text-sm">&quot;Fix the auth bug&quot; or &quot;refactor the API layer&quot; or &quot;add tests for the payment module&quot;</div>
          </div>
          <div className="bg-surface border border-border p-5">
            <div className="text-brand text-sm mb-2">02</div>
            <div className="font-bold mb-2">Capabilities activate</div>
            <div className="text-text-dim text-sm">42 structured methodologies match your task. TDD, debugging, security review — each with multi-step protocols.</div>
          </div>
          <div className="bg-surface border border-border p-5">
            <div className="text-brand text-sm mb-2">03</div>
            <div className="font-bold mb-2">Verification gates enforce</div>
            <div className="text-text-dim text-sm">ArqZero won&apos;t claim done until tests pass. Mandatory completion checks. No hallucinated success.</div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mb-24 stagger">
        <div className="text-text-dim text-sm mb-8">$ arqzero --features</div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            ['42 Capabilities', 'TDD, debugging, code review, planning, migration — each with 8-10 step imperative protocols.'],
            ['Verification Gates', 'Mandatory completion checks. Run tests, check coverage, validate security before claiming done.'],
            ['Any LLM Provider', 'OpenAI, Anthropic, Fireworks, Ollama, any OpenAI-compatible endpoint. Your keys, your choice.'],
            ['18 Built-in Tools', 'Read, Write, Edit, Bash, Glob, Grep, WebSearch, MultiEdit, Dispatch, and more.'],
            ['Subagent Dispatch', 'Up to 7 parallel agents for complex tasks. Auto-routing picks the right model per sub-task.'],
            ['Cross-Session Memory', 'Learns across sessions. Remembers your project, your patterns, your preferences.'],
          ].map(([title, desc]) => (
            <div key={title} className="border border-border p-5 hover:border-brand/30 transition-colors">
              <div className="text-brand text-sm mb-1">●</div>
              <div className="font-bold mb-1 text-sm">{title}</div>
              <div className="text-text-dim text-xs leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mb-24">
        <div className="text-text-dim text-sm mb-8">$ arqzero --compare</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 text-text-dim font-normal">Feature</th>
                <th className="text-center py-3 text-brand font-bold">ArqZero</th>
                <th className="text-center py-3 text-text-dim font-normal">Claude Code</th>
                <th className="text-center py-3 text-text-dim font-normal">Cursor</th>
              </tr>
            </thead>
            <tbody className="text-text-dim">
              {[
                ['Structured methodologies', '42', 'No', 'No'],
                ['Verification gates', 'Yes', 'No', 'No'],
                ['Any LLM provider', 'Yes', 'Claude only', 'OpenAI/Claude'],
                ['Open-core', 'Yes', 'No', 'No'],
                ['Price', '$12/mo + BYOK', '$20-200/mo', '$20/mo'],
                ['Subagents', '7 parallel', 'Yes', 'No'],
                ['Terminal-native', 'Yes', 'Yes', 'No (IDE)'],
              ].map(([feature, arq, claude, cursor]) => (
                <tr key={feature} className="border-b border-border/50">
                  <td className="py-2">{feature}</td>
                  <td className="py-2 text-center text-brand">{arq}</td>
                  <td className="py-2 text-center">{claude}</td>
                  <td className="py-2 text-center">{cursor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-24 text-center">
        <div className="text-text-dim text-sm mb-6">$ arqzero --install</div>
        <div className="bg-surface border border-brand/20 inline-block px-8 py-4 mb-6">
          <code className="text-brand text-lg">npm i -g arqzero</code>
        </div>
        <p className="text-text-dim text-sm">Free tier. No account required. 30 seconds to start.</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border pt-8 pb-16 flex flex-col sm:flex-row justify-between items-center gap-4 text-text-dim text-xs">
        <span>◆ ArqZero v2.0.0</span>
        <div className="flex gap-4 sm:gap-6">
          <a href="/pricing" className="hover:text-brand transition-colors py-1">pricing</a>
          <a href="/docs" className="hover:text-brand transition-colors py-1">docs</a>
          <a href="/blog" className="hover:text-brand transition-colors py-1">blog</a>
          <a href="https://github.com/LuciferDono/ArqZero" className="hover:text-brand transition-colors py-1">github</a>
        </div>
      </footer>
    </main>
  );
}
