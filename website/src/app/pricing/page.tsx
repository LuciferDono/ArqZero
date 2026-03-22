import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '9 tools (Read, Write, Edit, Bash, Glob, Grep, LS, WebSearch, WebFetch)',
      '6 slash commands',
      '10 capabilities',
      '50 messages/day',
      'No account required',
    ],
    cta: 'Install Free',
    ctaHref: '/docs/install',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/mo',
    features: [
      'All 18 tools',
      'All 25+ slash commands',
      'All 42 capabilities + verification gates',
      'Unlimited messages',
      'Subagent dispatch (7 parallel)',
      'Cross-session memory',
      'Session resume, checkpoints, plugins',
    ],
    cta: 'Start Pro',
    ctaHref: '/login',
    highlight: true,
  },
  {
    name: 'Team',
    price: '$30',
    period: '/user/mo',
    features: [
      'Everything in Pro',
      'Shared team memory',
      'Team settings sync',
      'Usage dashboard',
    ],
    cta: 'Contact Us',
    ctaHref: 'mailto:team@arqzero.dev',
    highlight: false,
  },
];

const comparisonFeatures = [
  { feature: 'Tools', free: '9', pro: '18', team: '18' },
  { feature: 'Slash commands', free: '6', pro: '25+', team: '25+' },
  { feature: 'Capabilities', free: '10', pro: '42', team: '42' },
  { feature: 'Verification gates', free: 'No', pro: 'Yes', team: 'Yes' },
  { feature: 'Messages/day', free: '50', pro: 'Unlimited', team: 'Unlimited' },
  { feature: 'Subagents', free: 'No', pro: '7 parallel', team: '7 parallel' },
  { feature: 'Cross-session memory', free: 'No', pro: 'Yes', team: 'Yes' },
  { feature: 'Plugins', free: 'No', pro: 'Yes', team: 'Yes' },
  { feature: 'Team features', free: 'No', pro: 'No', team: 'Yes' },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4">
          Simple, transparent <span style={{ color: 'var(--brand)' }}>pricing</span>
        </h1>
        <p className="text-center mb-16" style={{ color: 'var(--text-dim)' }}>
          No hidden fees. No per-token charges. Bring your own LLM keys.
        </p>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl border p-8 flex flex-col"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: plan.highlight ? 'var(--brand)' : 'var(--border)',
                boxShadow: plan.highlight ? '0 0 30px rgba(0, 212, 170, 0.1)' : undefined,
              }}
            >
              <h2 className="text-xl font-bold text-white mb-2">{plan.name}</h2>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  {plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span style={{ color: 'var(--brand)' }} className="mt-0.5 shrink-0">
                      +
                    </span>
                    <span style={{ color: 'var(--text)' }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className="block text-center px-6 py-3 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: plan.highlight ? 'var(--brand)' : 'transparent',
                  color: plan.highlight ? 'black' : 'var(--text)',
                  border: plan.highlight ? 'none' : '1px solid var(--border)',
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Feature comparison */}
        <h2 className="text-2xl font-bold text-center mb-8">Feature comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Feature
                </th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Free
                </th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--brand)' }}>
                  Pro
                </th>
                <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-dim)' }}>
                  Team
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((row) => (
                <tr key={row.feature} className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <td className="py-3 px-4 text-white">{row.feature}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-dim)' }}>{row.free}</td>
                  <td className="py-3 px-4 font-semibold" style={{ color: 'var(--brand)' }}>{row.pro}</td>
                  <td className="py-3 px-4" style={{ color: 'var(--text-dim)' }}>{row.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Back link */}
        <div className="text-center mt-16">
          <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--brand)' }}>
            &larr; Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
