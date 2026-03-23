const tools = [
  {
    name: 'Read',
    level: 'safe',
    desc: 'Read files with line numbers. Supports images, PDFs, and Jupyter notebooks.',
    example: `Read({ file_path: "/src/index.ts", offset: 10, limit: 50 })`,
  },
  {
    name: 'Write',
    level: 'ask',
    desc: 'Create or overwrite files. Requires reading the file first if it exists.',
    example: `Write({ file_path: "/src/new.ts", content: "export const x = 1;" })`,
  },
  {
    name: 'Edit',
    level: 'ask',
    desc: 'Exact string replacement in files. Fails if old_string is not unique.',
    example: `Edit({ file_path: "/src/index.ts", old_string: "foo", new_string: "bar" })`,
  },
  {
    name: 'MultiEdit',
    level: 'pro',
    desc: 'Apply multiple edits to a single file in one operation.',
    example: `MultiEdit({ file_path: "/src/index.ts", edits: [{ old: "a", new: "b" }, { old: "c", new: "d" }] })`,
  },
  {
    name: 'Bash',
    level: 'ask',
    desc: 'Execute shell commands. Working directory persists between calls.',
    example: `Bash({ command: "npm test", timeout: 30000 })`,
  },
  {
    name: 'BashOutput',
    level: 'pro',
    desc: 'Read stdout/stderr from running background processes.',
    example: `BashOutput({ pid: 12345 })`,
  },
  {
    name: 'KillShell',
    level: 'pro',
    desc: 'Terminate running shell processes by PID.',
    example: `KillShell({ pid: 12345 })`,
  },
  {
    name: 'Glob',
    level: 'safe',
    desc: 'Find files by glob pattern. Returns paths sorted by modification time.',
    example: `Glob({ pattern: "src/**/*.ts" })`,
  },
  {
    name: 'Grep',
    level: 'safe',
    desc: 'Search file contents with regex. Supports context lines and multiline.',
    example: `Grep({ pattern: "export function", glob: "*.ts", output_mode: "content" })`,
  },
  {
    name: 'LS',
    level: 'safe',
    desc: 'List directory contents with file sizes and types.',
    example: `LS({ path: "/src/tools" })`,
  },
  {
    name: 'WebSearch',
    level: 'ask',
    desc: 'Search the web and return summarized results.',
    example: `WebSearch({ query: "node.js stream backpressure" })`,
  },
  {
    name: 'WebFetch',
    level: 'ask',
    desc: 'Fetch content from a URL. Returns text, HTML, or JSON.',
    example: `WebFetch({ url: "https://api.example.com/data" })`,
  },
  {
    name: 'Dispatch',
    level: 'pro',
    desc: 'Launch up to 7 parallel sub-agents for concurrent work.',
    example: `Dispatch({ tasks: [{ description: "fix tests" }, { description: "update docs" }] })`,
  },
  {
    name: 'Prompt',
    level: 'safe',
    desc: 'Ask the user a clarifying question before proceeding.',
    example: `Prompt({ question: "Which database driver should I use?" })`,
  },
  {
    name: 'TodoWrite',
    level: 'pro',
    desc: 'Create and manage persistent task lists across sessions.',
    example: `TodoWrite({ action: "add", text: "Implement auth middleware" })`,
  },
  {
    name: 'TodoRead',
    level: 'pro',
    desc: 'Read current task list with status and priority.',
    example: `TodoRead({})`,
  },
  {
    name: 'NotebookRead',
    level: 'pro',
    desc: 'Read Jupyter notebook cells with outputs and visualizations.',
    example: `NotebookRead({ file_path: "/notebooks/analysis.ipynb" })`,
  },
  {
    name: 'NotebookEdit',
    level: 'pro',
    desc: 'Edit Jupyter notebook cells — insert, replace, or delete.',
    example: `NotebookEdit({ file_path: "/notebooks/analysis.ipynb", cell_index: 3, source: "print('hello')" })`,
  },
];

const levelColor: Record<string, string> = {
  safe: '#00D4AA',
  ask: '#F59E0B',
  pro: '#A78BFA',
};

const levelLabel: Record<string, string> = {
  safe: 'safe',
  ask: 'ask',
  pro: 'pro',
};

export default function ToolsPage() {
  const safe = tools.filter((t) => t.level === 'safe');
  const ask = tools.filter((t) => t.level === 'ask');
  const pro = tools.filter((t) => t.level === 'pro');

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-white">Tools</h1>
      <div
        className="rounded-lg border p-3 mb-8 font-mono text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
        <span className="text-white">arqzero --docs-tools</span>
      </div>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-dim)' }}>
        ArqZero ships 18 built-in tools. Each has a permission level that determines when user
        approval is required.
      </p>

      {/* Permission legend */}
      <div
        className="rounded-lg border p-4 mb-10 flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold font-mono" style={{ color: levelColor.safe }}>safe</span>
          <span style={{ color: 'var(--text-dim)' }}>Runs without asking</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold font-mono" style={{ color: levelColor.ask }}>ask</span>
          <span style={{ color: 'var(--text-dim)' }}>Requires user approval</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold font-mono" style={{ color: levelColor.pro }}>pro</span>
          <span style={{ color: 'var(--text-dim)' }}>Advanced, auto-approved in pro mode</span>
        </div>
      </div>

      {/* Tool groups */}
      {[
        { title: 'Safe Tools', items: safe },
        { title: 'Ask Tools', items: ask },
        { title: 'Pro Tools', items: pro },
      ].map((group) => (
        <div key={group.title} className="mb-10">
          <h2 className="text-xl font-bold mb-4 text-white">{group.title}</h2>
          <div className="space-y-4">
            {group.items.map((tool) => (
              <div
                key={tool.name}
                className="rounded-lg border p-4"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white font-bold">{tool.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-mono"
                    style={{
                      backgroundColor: levelColor[tool.level] + '18',
                      color: levelColor[tool.level],
                    }}
                  >
                    {levelLabel[tool.level]}
                  </span>
                </div>
                <p className="text-sm mb-3" style={{ color: 'var(--text-dim)' }}>
                  {tool.desc}
                </p>
                <div
                  className="rounded p-3 font-mono text-xs overflow-x-auto"
                  style={{ backgroundColor: 'var(--bg, #0a0a0a)' }}
                >
                  <span style={{ color: 'var(--text-dim)' }}>{'>'}</span>{' '}
                  <span style={{ color: 'var(--brand)' }}>{tool.example}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
