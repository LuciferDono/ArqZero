const categories = [
  {
    name: 'Methodology',
    color: '#00D4AA',
    capabilities: [
      { id: 'planning', desc: 'Break down tasks into structured implementation plans with dependencies.' },
      { id: 'tdd', desc: 'Test-driven development — write tests first, then make them pass.' },
      { id: 'debugging', desc: 'Systematic root-cause analysis with bisect and trace strategies.' },
      { id: 'refactoring', desc: 'Restructure code without changing behavior. Extract, inline, rename.' },
      { id: 'code-review', desc: 'Automated review with style, correctness, and security checks.' },
      { id: 'migration', desc: 'Upgrade frameworks, languages, or APIs across the codebase.' },
      { id: 'scaffolding', desc: 'Generate project structure, boilerplate, and config from templates.' },
      { id: 'incident-response', desc: 'Diagnose production issues with logs, metrics, and rollback plans.' },
    ],
  },
  {
    name: 'Architecture',
    color: '#A78BFA',
    capabilities: [
      { id: 'backend-patterns', desc: 'REST, GraphQL, middleware chains, service layers, auth flows.' },
      { id: 'frontend-architecture', desc: 'Component composition, state management, routing, SSR/SSG.' },
      { id: 'database-design', desc: 'Schema modeling, migrations, indexing, query optimization.' },
      { id: 'event-driven', desc: 'Message queues, pub/sub, event sourcing, CQRS patterns.' },
      { id: 'microservices', desc: 'Service decomposition, API gateways, circuit breakers, discovery.' },
      { id: 'data-pipeline', desc: 'ETL workflows, streaming, batch processing, data lakes.' },
      { id: 'cli-design', desc: 'Command parsing, flag handling, interactive prompts, help generation.' },
    ],
  },
  {
    name: 'Domain',
    color: '#F59E0B',
    capabilities: [
      { id: 'typescript', desc: 'Type-safe patterns, generics, declaration files, strict config.' },
      { id: 'node', desc: 'Streams, worker threads, native addons, package management.' },
      { id: 'python', desc: 'Virtual environments, type hints, async/await, packaging.' },
      { id: 'react', desc: 'Hooks, context, suspense, server components, performance.' },
      { id: 'css-styling', desc: 'Tailwind, CSS modules, responsive design, animations.' },
      { id: 'docker', desc: 'Dockerfiles, compose, multi-stage builds, volume management.' },
      { id: 'git-ops', desc: 'Branching strategies, rebasing, cherry-pick, conflict resolution.' },
      { id: 'ci-cd', desc: 'GitHub Actions, pipelines, matrix builds, deployment gates.' },
      { id: 'cloud-infra', desc: 'AWS, GCP, Azure provisioning, IaC with Terraform/Pulumi.' },
      { id: 'documentation', desc: 'API docs, READMEs, architecture decision records, JSDoc.' },
      { id: 'shell-scripting', desc: 'Bash, PowerShell, cross-platform scripts, automation.' },
    ],
  },
  {
    name: 'Guardrail',
    color: '#EF4444',
    capabilities: [
      { id: 'security-review', desc: 'Audit for injection, XSS, CSRF, auth bypass, secrets exposure.' },
      { id: 'performance-audit', desc: 'Profile bottlenecks, memory leaks, bundle size, lazy loading.' },
      { id: 'accessibility-check', desc: 'ARIA roles, keyboard nav, screen reader compat, contrast.' },
      { id: 'error-handling', desc: 'Structured errors, boundaries, retry logic, graceful degradation.' },
      { id: 'input-validation', desc: 'Schema validation, sanitization, type coercion, edge cases.' },
      { id: 'testing-standards', desc: 'Coverage targets, test isolation, mocking strategies, CI gates.' },
    ],
  },
  {
    name: 'Orchestration',
    color: '#06B6D4',
    capabilities: [
      { id: 'parallel-quality', desc: 'Run lint, test, typecheck in parallel via Dispatch.' },
      { id: 'parallel-implementation', desc: 'Split implementation across sub-agents by module.' },
      { id: 'phased-deploy', desc: 'Staged rollout: build, test, deploy, verify in sequence.' },
      { id: 'review-sweep', desc: 'Fan-out code review across multiple files simultaneously.' },
      { id: 'multi-stack', desc: 'Coordinate changes across frontend, backend, and infra.' },
    ],
  },
  {
    name: 'Tool',
    color: '#8B5CF6',
    capabilities: [
      { id: 'file-operations', desc: 'Read, write, edit, glob, and list files and directories.' },
      { id: 'search', desc: 'Regex search with grep, file pattern matching with glob.' },
      { id: 'shell', desc: 'Execute commands, manage processes, read output streams.' },
      { id: 'web-research', desc: 'Search the web and fetch URL content for context.' },
      { id: 'notebook', desc: 'Read and edit Jupyter notebooks with cell-level precision.' },
    ],
  },
];

export default function CapabilitiesPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-white">Capabilities</h1>
      <div
        className="rounded-lg border p-3 mb-8 font-mono text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <span style={{ color: 'var(--text-dim)' }}>$</span>{' '}
        <span className="text-white">arqzero --docs-capabilities</span>
      </div>
      <p className="mb-4 text-sm" style={{ color: 'var(--text-dim)' }}>
        ArqZero has 42 structured engineering capabilities organized into 6 categories. Capabilities
        are injected into the system prompt automatically based on your task.
      </p>

      {/* How it works */}
      <div
        className="rounded-lg border p-5 mb-10"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="text-lg font-bold mb-3 text-white">How Capabilities Work</h2>
        <div className="space-y-3 text-sm" style={{ color: 'var(--text-dim)' }}>
          <div>
            <span style={{ color: 'var(--brand)' }} className="font-bold">1. Keyword Matching</span>
            <p className="mt-1">
              When you send a message, ArqZero scans it for keywords that map to capabilities.
              Saying &quot;write tests for&quot; triggers <code className="text-white">tdd</code>,
              &quot;review this PR&quot; triggers <code className="text-white">code-review</code>.
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--brand)' }} className="font-bold">2. Verification Gates</span>
            <p className="mt-1">
              Each capability defines a verification step. For <code className="text-white">tdd</code>,
              the gate is &quot;all tests pass&quot;. For <code className="text-white">security-review</code>,
              the gate is &quot;no critical findings&quot;. The agent checks these before marking work
              complete.
            </p>
          </div>
          <div>
            <span style={{ color: 'var(--brand)' }} className="font-bold">3. Dependency Chains</span>
            <p className="mt-1">
              Capabilities can depend on others. <code className="text-white">phased-deploy</code> pulls
              in <code className="text-white">ci-cd</code> and <code className="text-white">testing-standards</code>.
              The full chain is resolved and injected automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.map((cat) => (
        <div key={cat.name} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-white">{cat.name}</h2>
            <span
              className="text-xs px-2 py-0.5 rounded font-mono"
              style={{ backgroundColor: cat.color + '18', color: cat.color }}
            >
              {cat.capabilities.length}
            </span>
          </div>
          <div className="space-y-2">
            {cat.capabilities.map((cap) => (
              <div
                key={cap.id}
                className="rounded-lg border px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              >
                <span
                  className="font-mono text-sm font-bold shrink-0 mt-0.5"
                  style={{ color: cat.color }}
                >
                  {cap.id}
                </span>
                <span className="text-sm" style={{ color: 'var(--text-dim)' }}>
                  {cap.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Total */}
      <div
        className="rounded-lg border p-4 text-center font-mono text-sm"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
      >
        {categories.reduce((sum, c) => sum + c.capabilities.length, 0)} capabilities across{' '}
        {categories.length} categories
      </div>
    </div>
  );
}
