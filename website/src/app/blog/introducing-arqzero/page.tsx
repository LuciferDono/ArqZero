import Link from 'next/link';

export default function IntroducingArqZero() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
      <nav className="flex items-center justify-between mb-16">
        <Link href="/" className="text-brand font-bold text-lg">◆ ArqZero</Link>
        <Link href="/blog" className="text-sm text-text-dim hover:text-brand transition-colors py-1">← blog</Link>
      </nav>

      <article>
        <div className="text-text-dim text-sm mb-2">2026-03-23</div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Introducing ArqZero</h1>

        <div className="space-y-6 text-text leading-relaxed">
          <p>
            We built ArqZero because every AI coding tool we used had the same problem:
            they generate code without following engineering methodology. Ask Claude Code to
            "add authentication" and it writes code. It doesn&apos;t plan first. It doesn&apos;t write
            tests first. It doesn&apos;t verify its work before claiming done.
          </p>

          <p>
            ArqZero is different. It has <strong className="text-brand">42 structured capabilities</strong> —
            real multi-step engineering protocols for TDD, debugging, code review, migration,
            incident response, and more. Each capability is 8-10 imperative steps that the
            agent follows precisely.
          </p>

          <h2 className="text-xl font-bold mt-10 mb-4">Verification gates</h2>
          <p>
            The feature we&apos;re most proud of: verification gates. When ArqZero activates a
            capability that has a verification gate (testing, security review, refactoring),
            it <strong>cannot claim the task is done</strong> until it completes the
            verification steps. Run the tests. Check the coverage. Confirm no regressions.
          </p>
          <p>
            No other coding agent has this. Claude Code, Cursor, Continue — they all rely
            on the model&apos;s judgment about when work is complete. ArqZero enforces it
            structurally.
          </p>

          <h2 className="text-xl font-bold mt-10 mb-4">Bring your own AI</h2>
          <p>
            ArqZero works with <strong>any</strong> OpenAI-compatible LLM provider. Fireworks,
            OpenAI, Anthropic (via proxy), Together, Groq, or local Ollama. Your API key,
            your choice, your data stays on your machine.
          </p>
          <p>
            We ship with two built-in models: <strong>Enso</strong> (GLM-4.7, 400B, our default)
            and <strong>PRIMUS</strong> (GLM-5, latest). Auto-routing upgrades to PRIMUS for
            architecture and planning tasks. Subagents run on Enso to save cost.
          </p>

          <h2 className="text-xl font-bold mt-10 mb-4">Free to start</h2>
          <p>
            Install and start using ArqZero in 30 seconds. No account required.
          </p>
          <div className="bg-surface border border-border p-4 my-4">
            <code className="text-brand">npm i -g arqzero</code>
          </div>
          <p>
            The free tier includes 9 tools, 10 capabilities, and 50 messages per day.
            Pro ($12/mo) unlocks all 18 tools, all 42 capabilities with verification gates,
            subagent dispatch, cross-session memory, and unlimited messages.
          </p>

          <h2 className="text-xl font-bold mt-10 mb-4">What&apos;s next</h2>
          <p>
            We&apos;re shipping the Anthropic native adapter next (direct Claude API, not just
            OpenAI-compatible), followed by a VS Code extension, and team features for
            shared memory and settings. The core is open-source — audit the code, verify
            our no-telemetry claim, build on top of it.
          </p>
          <p className="text-text-dim mt-8">
            — prana, creator of ArqZero
          </p>
        </div>
      </article>
    </main>
  );
}
