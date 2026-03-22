export interface Capability {
  name: string;
  description: string;
  triggers: string[];
  category: 'process' | 'domain' | 'tool';
  systemPromptAddition?: string;
  suggestedTools?: string[];
}

export const CAPABILITIES: Capability[] = [
  // Process capabilities (loaded first)
  {
    name: 'planning',
    description: 'Break complex tasks into steps before implementation',
    triggers: ['plan', 'design', 'architect', 'strategy', 'roadmap', 'blueprint'],
    category: 'process',
    systemPromptAddition:
      'Before implementing, create a step-by-step plan. Present the plan for user approval before writing code.',
  },
  {
    name: 'debugging',
    description: 'Systematic bug investigation',
    triggers: ['bug', 'fix', 'error', 'broken', 'crash', 'fail', 'debug', 'issue'],
    category: 'process',
    systemPromptAddition:
      'Debug systematically: reproduce \u2192 hypothesize \u2192 test \u2192 fix. Do not guess. Read error messages and stack traces carefully.',
  },
  {
    name: 'testing',
    description: 'Test-driven development',
    triggers: ['test', 'tdd', 'coverage', 'spec', 'assert', 'expect'],
    category: 'process',
    systemPromptAddition:
      'Write tests FIRST, then implementation. Aim for meaningful coverage of edge cases.',
  },
  {
    name: 'code-review',
    description: 'Review code for quality, security, and maintainability',
    triggers: ['review', 'audit', 'check', 'quality', 'lint', 'smell'],
    category: 'process',
    systemPromptAddition:
      'Review code for: bugs, security issues, performance, readability, and adherence to project conventions.',
  },
  {
    name: 'refactoring',
    description: 'Improve code structure without changing behavior',
    triggers: ['refactor', 'clean', 'simplify', 'restructure', 'deduplicate', 'extract'],
    category: 'process',
    systemPromptAddition:
      'Refactor incrementally. Ensure tests pass after each change. Do not change behavior.',
  },

  // Domain capabilities
  {
    name: 'frontend',
    description: 'Frontend/UI development',
    triggers: ['react', 'component', 'ui', 'css', 'html', 'style', 'layout', 'render', 'jsx', 'tsx', 'frontend'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Glob', 'Grep'],
  },
  {
    name: 'backend',
    description: 'Backend/API development',
    triggers: ['api', 'server', 'endpoint', 'route', 'middleware', 'controller', 'service', 'backend'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash', 'Grep'],
  },
  {
    name: 'database',
    description: 'Database operations and queries',
    triggers: ['database', 'db', 'sql', 'query', 'migration', 'schema', 'table', 'postgres', 'mysql', 'sqlite', 'mongo'],
    category: 'domain',
    systemPromptAddition:
      'For database work: always use parameterized queries (never string interpolation). Consider indexes for frequently queried columns.',
  },
  {
    name: 'security',
    description: 'Security review and hardening',
    triggers: [
      'security', 'auth', 'authentication', 'authorization', 'token', 'jwt',
      'secret', 'vulnerability', 'injection', 'xss', 'csrf',
    ],
    category: 'domain',
    systemPromptAddition:
      'Security-critical work. Check for: injection, XSS, CSRF, secret exposure, insecure defaults, missing validation.',
  },
  {
    name: 'deployment',
    description: 'Deployment and CI/CD',
    triggers: ['deploy', 'ci', 'cd', 'pipeline', 'docker', 'container', 'kubernetes', 'k8s', 'build', 'release'],
    category: 'domain',
    suggestedTools: ['Bash', 'Read', 'Edit'],
  },
  {
    name: 'git',
    description: 'Git operations',
    triggers: ['git', 'commit', 'branch', 'merge', 'rebase', 'pr', 'pull request', 'push', 'stash'],
    category: 'domain',
    suggestedTools: ['Bash'],
  },
  {
    name: 'documentation',
    description: 'Writing documentation',
    triggers: ['doc', 'docs', 'readme', 'document', 'comment', 'jsdoc', 'api doc'],
    category: 'domain',
    suggestedTools: ['Read', 'Write', 'Edit'],
  },
  {
    name: 'performance',
    description: 'Performance optimization',
    triggers: ['performance', 'optimize', 'fast', 'slow', 'bottleneck', 'profile', 'benchmark', 'memory', 'cache'],
    category: 'domain',
    systemPromptAddition:
      'Profile before optimizing. Measure before and after. Focus on the actual bottleneck, not premature optimization.',
  },

  // Tool capabilities
  {
    name: 'file-operations',
    description: 'File reading, writing, editing',
    triggers: ['file', 'read', 'write', 'edit', 'create', 'delete', 'rename', 'move', 'copy'],
    category: 'tool',
    suggestedTools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'LS'],
  },
  {
    name: 'search',
    description: 'Code and file search',
    triggers: ['find', 'search', 'grep', 'locate', 'where', 'which'],
    category: 'tool',
    suggestedTools: ['Glob', 'Grep', 'Read'],
  },
  {
    name: 'shell',
    description: 'Shell command execution',
    triggers: ['run', 'execute', 'command', 'terminal', 'shell', 'npm', 'yarn', 'pip', 'cargo'],
    category: 'tool',
    suggestedTools: ['Bash'],
  },
  {
    name: 'web-research',
    description: 'Web search and content fetching',
    triggers: ['search web', 'look up', 'fetch', 'download', 'url', 'website', 'documentation'],
    category: 'tool',
    suggestedTools: ['WebSearch', 'WebFetch'],
  },
];
