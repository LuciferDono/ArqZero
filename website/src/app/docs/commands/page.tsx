const commandGroups = [
  {
    title: 'Basic',
    desc: 'Available to all users.',
    color: '#00D4AA',
    commands: [
      { name: '/help', desc: 'Show all available commands and usage.' },
      { name: '/clear', desc: 'Clear the conversation and start fresh.' },
      { name: '/config', desc: 'View current configuration values.' },
      { name: '/quit', desc: 'Exit ArqZero.' },
      { name: '/status', desc: 'Show session info: model, tokens, cost.' },
      { name: '/model', desc: 'Switch the active LLM model.' },
    ],
  },
  {
    title: 'Session',
    desc: 'Manage conversation state and history.',
    color: '#A78BFA',
    commands: [
      { name: '/compress', desc: 'Compact the conversation to reduce token usage.' },
      { name: '/memory', desc: 'View and manage cross-session memory.' },
      { name: '/undo', desc: 'Rewind to the last checkpoint before a file edit.' },
      { name: '/context', desc: 'Show what context is loaded in the current session.' },
      { name: '/cost', desc: 'Display token usage and estimated cost.' },
      { name: '/export', desc: 'Export the conversation transcript.' },
    ],
  },
  {
    title: 'Agent Control',
    desc: 'Direct the agent behavior and capabilities.',
    color: '#F59E0B',
    commands: [
      { name: '/think', desc: 'Force extended reasoning before the next response.' },
      { name: '/agents', desc: 'List active sub-agents and their status.' },
      { name: '/loop', desc: 'Run the agent in a loop until a condition is met.' },
      { name: '/vim', desc: 'Toggle vim-style keybindings in the TUI.' },
      { name: '/permissions', desc: 'View and modify tool permission levels.' },
      { name: '/tools', desc: 'List all available tools and their status.' },
    ],
  },
  {
    title: 'System',
    desc: 'Setup, plugins, and administration.',
    color: '#06B6D4',
    commands: [
      { name: '/setup', desc: 'Interactive first-run configuration wizard.' },
      { name: '/check', desc: 'Run health checks on config, API keys, and tools.' },
      { name: '/reload-plugins', desc: 'Hot-reload all plugins without restarting.' },
      { name: '/plugin', desc: 'Install, remove, or list plugins.' },
      { name: '/login', desc: 'Authenticate with a provider account.' },
      { name: '/logout', desc: 'Clear stored authentication credentials.' },
      { name: '/upgrade', desc: 'Check for and install ArqZero updates.' },
      { name: '/skill', desc: 'List or invoke registered skills.' },
    ],
  },
];

export default function CommandsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-white">Commands</h1>
      <div
        className="rounded-lg border p-3 mb-8 font-mono text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
        <span className="text-white">arqzero --docs-commands</span>
      </div>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-dim)' }}>
        Type any command in the ArqZero TUI input. All commands start with{' '}
        <code className="text-white">/</code>. Tab completion is supported.
      </p>

      {/* Quick reference */}
      <div
        className="rounded-lg border p-4 mb-10 font-mono text-sm space-y-1"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">/help</span>
          <span style={{ color: 'var(--text-dim)' }}> ............. list all commands</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">/tools</span>
          <span style={{ color: 'var(--text-dim)' }}> ............ list available tools</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">/undo</span>
          <span style={{ color: 'var(--text-dim)' }}> ............. revert last file change</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
          <span className="text-white">/think</span>
          <span style={{ color: 'var(--text-dim)' }}> ............ deep reasoning mode</span>
        </div>
      </div>

      {/* Command groups */}
      {commandGroups.map((group) => (
        <div key={group.title} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-bold text-white">{group.title}</h2>
            <span
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{ backgroundColor: group.color + '18', color: group.color }}
            >
              {group.commands.length}
            </span>
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
            {group.desc}
          </p>
          <div className="space-y-1">
            {group.commands.map((cmd) => (
              <div
                key={cmd.name}
                className="rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <span className="font-mono text-sm font-bold shrink-0" style={{ color: group.color }}>
                  {cmd.name}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  {cmd.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Custom commands */}
      <div
        className="rounded-lg border p-5 mb-4"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-bold mb-3 text-white">Custom Commands</h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>
          Create your own slash commands by adding Markdown files to{' '}
          <code className="text-white">.arqzero/commands/</code> in your project directory.
        </p>
        <div
          className="rounded p-4 font-mono text-sm space-y-1"
          style={{ backgroundColor: 'var(--bg, #0a0a0a)' }}
        >
          <div style={{ color: 'var(--text-dim)' }}># .arqzero/commands/deploy.md</div>
          <div className="text-white">Run the deployment pipeline for $ARGUMENTS.</div>
          <div className="text-white">1. Build the project</div>
          <div className="text-white">2. Run all tests</div>
          <div className="text-white">3. Deploy to the specified environment</div>
        </div>
        <p className="text-sm mt-3" style={{ color: 'var(--text-dim)' }}>
          Then use it: <code className="text-white">/deploy staging</code>
        </p>
      </div>
    </div>
  );
}
