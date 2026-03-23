export default function ConfigPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-white">Configuration</h1>
      <div
        className="rounded-lg border p-3 mb-8 font-mono text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
        <span className="text-white">arqzero --docs-config</span>
      </div>
      <p className="mb-8 text-sm" style={{ color: 'var(--text-dim)' }}>
        ArqZero configuration follows a layered hierarchy. Each layer overrides the previous one.
      </p>

      {/* Hierarchy */}
      <div
        className="rounded-lg border p-5 mb-10"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-bold mb-4 text-white">Settings Hierarchy</h2>
        <div className="font-mono text-sm space-y-2">
          {[
            { level: '1', label: 'User config', path: '~/.arqzero/config.json', color: 'var(--text-dim)' },
            { level: '2', label: 'Project settings', path: '.arqzero/settings.json', color: 'var(--text-dim)' },
            { level: '3', label: 'Environment vars', path: 'ARQZERO_*', color: '#F59E0B' },
            { level: '4', label: 'CLI arguments', path: '--model, --auto-approve', color: '#00D4AA' },
          ].map((item) => (
            <div key={item.level} className="flex items-center gap-3 flex-wrap">
              <span
                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'var(--border)', color: 'var(--text)' }}
              >
                {item.level}
              </span>
              <span className="text-white w-28 sm:w-36 shrink-0">{item.label}</span>
              <span style={{ color: item.color }}>{item.path}</span>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--text-dim)' }}>
          Higher numbers override lower. CLI args always win.
        </p>
      </div>

      {/* config.json */}
      <h2 className="text-xl font-bold mb-4 text-white">~/.arqzero/config.json</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        Global user configuration. Created by <code className="text-white">/setup</code> or manually.
      </p>
      <div
        className="rounded-lg border p-4 mb-10 font-mono text-sm overflow-x-auto"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <pre className="text-white">{`{
  "provider": "fireworks",
  "fireworksApiKey": "fw_...",
  "model": "accounts/fireworks/models/glm-4p7",
  "permissions": {
    "allow": ["Read", "Glob", "Grep", "LS"],
    "deny": []
  },
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"]
    }
  }
}`}</pre>
      </div>

      {/* ARQZERO.md */}
      <h2 className="text-xl font-bold mb-4 text-white">ARQZERO.md</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        Project-level instructions file. Place it in your project root. ArqZero reads it at the start
        of every session and injects its contents into the system prompt.
      </p>
      <div
        className="rounded-lg border p-4 mb-10 font-mono text-sm overflow-x-auto"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <pre style={{ color: 'var(--text-dim)' }}>{`# ARQZERO.md — project root`}</pre>
        <pre className="text-white">{`
This is a Next.js 15 app with TypeScript.
Use pnpm, not npm.
Test with: pnpm vitest
Never modify files in /generated/.
`}</pre>
      </div>

      {/* settings.json */}
      <h2 className="text-xl font-bold mb-4 text-white">.arqzero/settings.json</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        Project-level settings override user config for this repository only.
      </p>
      <div
        className="rounded-lg border p-4 mb-10 font-mono text-sm overflow-x-auto"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <pre className="text-white">{`{
  "model": "accounts/fireworks/models/llama-v3p3-70b",
  "permissions": {
    "allow": ["Bash"],
    "deny": ["WebFetch"]
  },
  "verbose": true
}`}</pre>
      </div>

      {/* Environment Variables */}
      <h2 className="text-xl font-bold mb-4 text-white">Environment Variables</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        All environment variables use the <code className="text-white">ARQZERO_</code> prefix.
      </p>
      <div
        className="rounded-lg border overflow-hidden mb-10 overflow-x-auto"
        style={{ borderColor: 'var(--border)' }}
      >
        <table className="w-full text-sm min-w-[400px]">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface)' }}>
              <th className="text-left px-4 py-3 font-mono text-white">Variable</th>
              <th className="text-left px-4 py-3" style={{ color: 'var(--text-dim)' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'ARQZERO_API_KEY', desc: 'Fireworks API key (overrides config)' },
              { name: 'ARQZERO_MODEL', desc: 'Model identifier' },
              { name: 'ARQZERO_PROVIDER', desc: 'API provider (fireworks)' },
              { name: 'ARQZERO_VERBOSE', desc: 'Enable verbose logging (1/0)' },
              { name: 'ARQZERO_AUTO_APPROVE', desc: 'Skip permission prompts (1/0)' },
              { name: 'ARQZERO_MAX_TOKENS', desc: 'Maximum response tokens' },
              { name: 'ARQZERO_THEME', desc: 'TUI theme (dark)' },
              { name: 'ARQZERO_REDUCED_MOTION', desc: 'Disable animations (1/0)' },
            ].map((v) => (
              <tr
                key={v.name}
                className="border-t"
                style={{ borderColor: 'var(--border)' }}
              >
                <td className="px-4 py-3 font-mono" style={{ color: '#F59E0B' }}>
                  {v.name}
                </td>
                <td className="px-4 py-3" style={{ color: 'var(--text-dim)' }}>
                  {v.desc}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CLI Arguments */}
      <h2 className="text-xl font-bold mb-4 text-white">CLI Arguments</h2>
      <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
        Highest priority. Override everything else.
      </p>
      <div
        className="rounded-lg border p-4 mb-4 font-mono text-sm space-y-2"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">arqzero --model llama-70b --auto-approve</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">arqzero -p &quot;fix tests&quot; --verbose</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">arqzero -c --resume</span>
          <span style={{ color: 'var(--text-dim)' }}> # resume last session</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">arqzero --worktree feature-branch</span>
          <span style={{ color: 'var(--text-dim)' }}> # isolated git worktree</span>
        </div>
      </div>
    </div>
  );
}
