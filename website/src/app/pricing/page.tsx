export default function Pricing() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <nav className="flex items-center justify-between mb-16">
        <a href="/" className="text-brand font-bold text-lg">◆ ArqZero</a>
        <div className="flex gap-6 text-sm text-text-dim">
          <a href="/pricing" className="text-brand">pricing</a>
          <a href="/docs" className="hover:text-brand transition-colors">docs</a>
          <a href="/blog" className="hover:text-brand transition-colors">blog</a>
        </div>
      </nav>

      <div className="text-text-dim text-sm mb-8">$ arqzero --pricing</div>

      <div className="grid gap-6 md:grid-cols-3 mb-16 stagger">
        {/* Free */}
        <div className="border border-border p-6">
          <div className="text-text-dim text-xs mb-1">FREE</div>
          <div className="text-2xl font-bold mb-1">$0</div>
          <div className="text-text-dim text-xs mb-6">no account needed</div>
          <ul className="text-sm space-y-2 text-text-dim mb-6">
            <li><span className="text-[#3AAF60]">✓</span> 9 tools</li>
            <li><span className="text-[#3AAF60]">✓</span> 6 commands</li>
            <li><span className="text-[#3AAF60]">✓</span> 10 capabilities</li>
            <li><span className="text-[#3AAF60]">✓</span> 50 msgs/day</li>
            <li><span className="text-[#3AAF60]">✓</span> Headless mode</li>
          </ul>
          <a href="/docs/install" className="block text-center border border-border py-2 text-sm hover:border-brand hover:text-brand transition-colors">
            npm i -g arqzero
          </a>
        </div>

        {/* Pro — highlighted */}
        <div className="border border-brand p-6 relative">
          <div className="absolute -top-3 left-4 bg-brand text-black text-xs px-2 py-0.5 font-bold">RECOMMENDED</div>
          <div className="text-brand text-xs mb-1">PRO</div>
          <div className="text-2xl font-bold mb-1">$12<span className="text-sm font-normal text-text-dim">/mo</span></div>
          <div className="text-text-dim text-xs mb-6">+ your own API key</div>
          <ul className="text-sm space-y-2 mb-6">
            <li><span className="text-brand">✓</span> All 18 tools</li>
            <li><span className="text-brand">✓</span> All 25+ commands</li>
            <li><span className="text-brand">✓</span> All 42 capabilities</li>
            <li><span className="text-brand">✓</span> Verification gates</li>
            <li><span className="text-brand">✓</span> 7 parallel subagents</li>
            <li><span className="text-brand">✓</span> Cross-session memory</li>
            <li><span className="text-brand">✓</span> Unlimited messages</li>
            <li><span className="text-brand">✓</span> Session resume</li>
            <li><span className="text-brand">✓</span> Plugins + MCP</li>
          </ul>
          <a href="/login" className="block text-center bg-brand text-black py-2 text-sm font-bold hover:bg-brand-light transition-colors">
            Start Pro →
          </a>
        </div>

        {/* Team */}
        <div className="border border-border p-6">
          <div className="text-text-dim text-xs mb-1">TEAM</div>
          <div className="text-2xl font-bold mb-1">$30<span className="text-sm font-normal text-text-dim">/user/mo</span></div>
          <div className="text-text-dim text-xs mb-6">everything in Pro, plus</div>
          <ul className="text-sm space-y-2 text-text-dim mb-6">
            <li><span className="text-[#4A8FD4]">✓</span> Shared team memory</li>
            <li><span className="text-[#4A8FD4]">✓</span> Team settings sync</li>
            <li><span className="text-[#4A8FD4]">✓</span> Usage dashboard</li>
            <li><span className="text-[#4A8FD4]">✓</span> Priority support</li>
          </ul>
          <a href="mailto:team@arqzero.dev" className="block text-center border border-border py-2 text-sm hover:border-brand hover:text-brand transition-colors">
            Contact us
          </a>
        </div>
      </div>

      <footer className="border-t border-border pt-8 text-center text-text-dim text-xs">
        <a href="/" className="hover:text-brand transition-colors">◆ ArqZero</a>
      </footer>
    </main>
  );
}
