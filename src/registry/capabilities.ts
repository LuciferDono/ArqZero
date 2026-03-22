export type CapabilityCategory =
  | 'methodology'
  | 'architecture'
  | 'domain'
  | 'guardrail'
  | 'orchestration'
  | 'tool';

export interface DispatchHint {
  when: string;
  tasks: string[];
  maxConcurrent?: number;
}

export interface VerificationGate {
  steps: string[];
  failAction: 'retry' | 'report';
}

export interface Capability {
  name: string;
  description: string;
  triggers: string[];
  category: CapabilityCategory;
  systemPromptAddition?: string;
  suggestedTools?: string[];
  requires?: string[];
  recommends?: string[];
  dispatchHint?: DispatchHint;
  verificationGate?: VerificationGate;
  phase?: number;
}

// ---------------------------------------------------------------------------
// METHODOLOGY (8) — multi-step imperative protocols
// ---------------------------------------------------------------------------

const METHODOLOGY: Capability[] = [
  {
    name: 'planning',
    description: 'Break complex tasks into an explicit plan before implementation',
    triggers: ['plan', 'design', 'architect', 'strategy', 'roadmap', 'blueprint', 'decompose'],
    category: 'methodology',
    phase: 10,
    systemPromptAddition: [
      '1. Restate the goal in one sentence so there is no ambiguity.',
      '2. List hard constraints (language, runtime, repo conventions).',
      '3. Identify unknowns — read code, search docs, or ask the user.',
      '4. Decompose the goal into ordered, independently testable sub-tasks.',
      '5. For each sub-task, name the files to touch and the tool to use.',
      '6. Estimate risk per sub-task (low / medium / high) and flag anything that needs user sign-off.',
      '7. Present the full plan as a numbered checklist and WAIT for user approval before writing any code.',
      '8. After approval, execute sub-tasks in order, checking each off as it passes its verification step.',
    ].join('\n'),
  },
  {
    name: 'tdd',
    description: 'Test-driven development: red-green-refactor cycle',
    triggers: ['tdd', 'test-driven', 'test first', 'red green'],
    category: 'methodology',
    phase: 20,
    requires: ['testing-standards'],
    systemPromptAddition: [
      '1. Identify the smallest unit of behavior to implement next.',
      '2. Write a failing test that asserts the expected behavior (RED).',
      '3. Run the test suite and confirm the new test fails for the right reason.',
      '4. Write the minimum production code to make the test pass (GREEN).',
      '5. Run the test suite and confirm all tests pass.',
      '6. Refactor the production code for clarity while keeping tests green (REFACTOR).',
      '7. Run the full suite again after refactoring.',
      '8. Repeat from step 1 for the next behavior.',
      '9. Never write production code without a corresponding failing test first.',
      '10. Keep each cycle under 5 minutes of wall-clock time to maintain momentum.',
    ].join('\n'),
  },
  {
    name: 'debugging',
    description: 'Systematic bug investigation and resolution',
    triggers: ['bug', 'fix', 'error', 'broken', 'crash', 'fail', 'debug', 'issue', 'stack trace', 'exception'],
    category: 'methodology',
    phase: 20,
    systemPromptAddition: [
      '1. Reproduce the bug — get a reliable repro case before anything else.',
      '2. Read the full error message and stack trace; identify the exact file and line.',
      '3. Form a hypothesis about the root cause (not the symptom).',
      '4. Add logging or a minimal test to confirm the hypothesis.',
      '5. If the hypothesis is wrong, return to step 3 with new evidence.',
      '6. Implement the smallest fix that addresses the root cause.',
      '7. Run the repro case and confirm the bug is gone.',
      '8. Run the full test suite to confirm no regressions.',
      '9. Remove any temporary logging added during investigation.',
      '10. If the bug could recur, add a regression test.',
    ].join('\n'),
  },
  {
    name: 'refactoring',
    description: 'Improve code structure without changing behavior',
    triggers: ['refactor', 'clean', 'simplify', 'restructure', 'deduplicate', 'extract'],
    category: 'methodology',
    phase: 30,
    requires: ['testing-standards'],
    systemPromptAddition: [
      '1. Ensure the existing test suite passes before touching any code.',
      '2. Identify the specific code smell or structural problem to address.',
      '3. Plan the refactoring as a sequence of small, reversible steps.',
      '4. Execute one step at a time — move, rename, extract, inline, or simplify.',
      '5. Run the test suite after EVERY step; revert immediately if anything fails.',
      '6. Do NOT change observable behavior — same inputs must produce same outputs.',
      '7. After all steps are done, run the full suite one final time.',
      '8. Review the diff: if it is larger than expected, break it into smaller commits.',
    ].join('\n'),
  },
  {
    name: 'code-review',
    description: 'Review code for quality, security, and maintainability',
    triggers: ['review', 'audit', 'check quality', 'lint', 'smell', 'pr review'],
    category: 'methodology',
    phase: 40,
    systemPromptAddition: [
      '1. Read the entire diff or file set before commenting.',
      '2. Check correctness: does the logic match the stated intent? Are edge cases handled?',
      '3. Check conventions: naming, formatting, import order, file organization.',
      '4. Check security: injection, auth bypass, secret exposure, unsafe deserialization.',
      '5. Check performance: unnecessary allocations, O(n^2) loops, missing indexes.',
      '6. Check testing: are new code paths covered? Are assertions meaningful?',
      '7. Check error handling: are all async operations wrapped? Are errors descriptive?',
      '8. Summarize findings by severity (critical / high / medium / low / nit).',
      '9. For each finding, suggest a concrete fix — do not just describe the problem.',
    ].join('\n'),
  },
  {
    name: 'migration',
    description: 'Migrate or upgrade codebases across versions safely',
    triggers: ['migrate', 'upgrade', 'version bump', 'breaking change', 'deprecat'],
    category: 'methodology',
    phase: 30,
    requires: ['testing-standards'],
    systemPromptAddition: [
      '1. Read the migration guide or changelog for the target version.',
      '2. List every breaking change that applies to this codebase.',
      '3. Run the existing test suite and record the baseline pass/fail count.',
      '4. Update dependencies to the target version.',
      '5. Fix compilation or type errors introduced by the update.',
      '6. Address each breaking change in a separate, atomic step.',
      '7. Run the test suite after each step and fix any regressions immediately.',
      '8. Search for deprecated API usage and replace with the recommended alternative.',
      '9. Run the full suite one final time and compare pass count to the baseline.',
      '10. Document any behavioral changes that are intentional.',
    ].join('\n'),
  },
  {
    name: 'scaffolding',
    description: 'Bootstrap new projects or modules from scratch',
    triggers: ['scaffold', 'init', 'setup', 'bootstrap', 'new project', 'create project', 'starter'],
    category: 'methodology',
    phase: 10,
    systemPromptAddition: [
      '1. Confirm the target language, runtime, and framework with the user.',
      '2. Create the directory structure following the ecosystem convention.',
      '3. Initialize the package manifest (package.json, Cargo.toml, etc.).',
      '4. Add essential config files: tsconfig, eslint, prettier, .gitignore.',
      '5. Create a minimal entry point that compiles and runs.',
      '6. Add a sample test file and verify the test runner works.',
      '7. Initialize git and create the first commit.',
      '8. Print a summary of the scaffolded structure for the user to review.',
    ].join('\n'),
  },
  {
    name: 'incident-response',
    description: 'Triage and resolve production incidents quickly',
    triggers: ['incident', 'outage', 'down', 'emergency', 'hotfix', 'rollback', 'revert'],
    category: 'methodology',
    phase: 10,
    requires: ['debugging'],
    systemPromptAddition: [
      '1. Assess severity: is the service completely down, degraded, or is this a data issue?',
      '2. Check logs, error rates, and monitoring dashboards for the blast radius.',
      '3. Determine if an immediate rollback is safer than a forward fix.',
      '4. If rolling back: identify the last known good version and execute the rollback.',
      '5. If fixing forward: isolate the root cause using the debugging protocol.',
      '6. Implement the minimal fix — no refactoring, no feature work, just stop the bleeding.',
      '7. Test the fix against the original failure mode.',
      '8. Deploy the fix and monitor for at least 10 minutes.',
      '9. Write a brief incident summary: timeline, root cause, fix, follow-up items.',
    ].join('\n'),
  },
];

// ---------------------------------------------------------------------------
// ARCHITECTURE (7) — structural patterns and system design
// ---------------------------------------------------------------------------

const ARCHITECTURE: Capability[] = [
  {
    name: 'backend-patterns',
    description: 'API and server-side architecture patterns',
    triggers: [
      'api', 'server', 'endpoint', 'route', 'middleware', 'controller',
      'service layer', 'rest', 'graphql',
    ],
    category: 'architecture',
    recommends: ['security-review', 'error-handling'],
    suggestedTools: ['Read', 'Edit', 'Bash', 'Grep'],
    systemPromptAddition:
      'Follow layered architecture: routes -> controllers -> services -> data access. Keep business logic out of route handlers.',
  },
  {
    name: 'frontend-architecture',
    description: 'Frontend and UI component architecture',
    triggers: [
      'react', 'component', 'ui', 'css', 'layout', 'render', 'jsx', 'tsx',
      'frontend', 'state management', 'hooks',
    ],
    category: 'architecture',
    recommends: ['accessibility-check'],
    suggestedTools: ['Read', 'Edit', 'Glob', 'Grep'],
    systemPromptAddition:
      'Prefer small, composable components. Lift state only when necessary. Co-locate styles and tests with components.',
  },
  {
    name: 'database-design',
    description: 'Database schema, query, and migration patterns',
    triggers: [
      'database', 'db', 'sql', 'query', 'migration', 'schema', 'table',
      'postgres', 'mysql', 'sqlite', 'mongo', 'orm', 'index',
    ],
    category: 'architecture',
    recommends: ['performance-audit', 'input-validation'],
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Always use parameterized queries. Add indexes for frequently queried columns. Design for data integrity with constraints and foreign keys.',
  },
  {
    name: 'event-driven',
    description: 'Event-driven and message-based architecture',
    triggers: [
      'event', 'queue', 'pubsub', 'message broker', 'kafka', 'rabbitmq',
      'webhook', 'async processing',
    ],
    category: 'architecture',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Design for at-least-once delivery. Make handlers idempotent. Include dead-letter queues for failed messages.',
  },
  {
    name: 'microservices',
    description: 'Microservice decomposition and service mesh patterns',
    triggers: [
      'microservice', 'service mesh', 'api gateway', 'distributed',
      'container orchestration',
    ],
    category: 'architecture',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Define clear service boundaries around business domains. Use async communication between services where possible. Design for independent deployability.',
  },
  {
    name: 'data-pipeline',
    description: 'ETL, batch, and stream processing pipelines',
    triggers: [
      'pipeline', 'etl', 'data flow', 'transform', 'batch',
      'stream processing',
    ],
    category: 'architecture',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Make pipeline stages idempotent and restartable. Log progress at each stage. Validate data at ingestion boundaries.',
  },
  {
    name: 'cli-design',
    description: 'Command-line interface and TUI design patterns',
    triggers: ['cli', 'command line', 'argument parsing', 'terminal', 'tui', 'interactive prompt'],
    category: 'architecture',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Follow POSIX conventions for flags and exit codes. Provide --help for every command. Make output parseable when piped.',
  },
];

// ---------------------------------------------------------------------------
// DOMAIN (11) — language/ecosystem expertise
// ---------------------------------------------------------------------------

const DOMAIN: Capability[] = [
  {
    name: 'typescript',
    description: 'TypeScript language expertise',
    triggers: ['typescript', 'ts', 'tsconfig', 'type error', 'generics', 'type inference'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash', 'Grep'],
    systemPromptAddition:
      'Use strict TypeScript — avoid `any`. Prefer interfaces over type aliases for object shapes.',
  },
  {
    name: 'node',
    description: 'Node.js runtime and ecosystem',
    triggers: ['node', 'nodejs', 'npm', 'package.json', 'esm', 'commonjs', 'require', 'import'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Respect the module system (ESM vs CJS). Use .js extensions for ESM imports.',
  },
  {
    name: 'python',
    description: 'Python language and ecosystem',
    triggers: ['python', 'py', 'pip', 'venv', 'django', 'flask', 'fastapi', 'pytest'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition: 'Follow PEP 8. Use type hints. Prefer virtual environments.',
  },
  {
    name: 'react',
    description: 'React framework patterns',
    triggers: ['react', 'useState', 'useEffect', 'jsx', 'next.js', 'nextjs', 'remix'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Glob', 'Grep'],
    systemPromptAddition:
      'Prefer function components with hooks. Memoize only when profiling shows a need.',
  },
  {
    name: 'css-styling',
    description: 'CSS, preprocessors, and styling systems',
    triggers: ['css', 'scss', 'sass', 'tailwind', 'styled-components', 'css modules', 'style'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Grep'],
    systemPromptAddition:
      "Use the project's existing styling approach. Prefer design tokens over hard-coded values.",
  },
  {
    name: 'docker',
    description: 'Docker containers and orchestration',
    triggers: ['docker', 'dockerfile', 'container', 'docker-compose', 'image', 'volume', 'kubernetes', 'k8s'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition: 'Use multi-stage builds. Pin base image versions. Run as non-root.',
  },
  {
    name: 'git-ops',
    description: 'Git version control operations',
    triggers: ['git', 'commit', 'branch', 'merge', 'rebase', 'pr', 'pull request', 'push', 'stash', 'cherry-pick'],
    category: 'domain',
    suggestedTools: ['Bash'],
    systemPromptAddition: 'Write descriptive commit messages. Prefer small, focused commits.',
  },
  {
    name: 'ci-cd',
    description: 'Continuous integration and deployment',
    triggers: ['ci', 'cd', 'github actions', 'workflow', 'build pipeline', 'deploy', 'release'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Pin action versions. Cache dependencies. Fail fast on lint and type errors.',
  },
  {
    name: 'cloud-infra',
    description: 'Cloud infrastructure and services',
    triggers: ['aws', 'gcp', 'azure', 'terraform', 'cloudformation', 'lambda', 's3', 'ec2', 'cloud'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition: 'Use infrastructure-as-code. Apply least-privilege IAM policies.',
  },
  {
    name: 'documentation',
    description: 'Technical writing and documentation',
    triggers: ['doc', 'docs', 'readme', 'document', 'comment', 'jsdoc', 'api doc'],
    category: 'domain',
    suggestedTools: ['Read', 'Write', 'Edit'],
    systemPromptAddition:
      'Write for the reader who has no context. Include examples for non-obvious APIs.',
  },
  {
    name: 'shell-scripting',
    description: 'Shell scripts and command-line automation',
    triggers: ['bash', 'shell', 'script', 'zsh', 'sh', 'awk', 'sed', 'cron', 'makefile'],
    category: 'domain',
    suggestedTools: ['Read', 'Edit', 'Bash'],
    systemPromptAddition:
      'Use `set -euo pipefail`. Quote all variables. Prefer functions over inline logic.',
  },
];

// ---------------------------------------------------------------------------
// GUARDRAIL (6) — quality gates with verification
// ---------------------------------------------------------------------------

const GUARDRAIL: Capability[] = [
  {
    name: 'security-review',
    description: 'OWASP-aligned security review and hardening',
    triggers: [
      'security', 'auth', 'authentication', 'authorization', 'token', 'jwt',
      'secret', 'vulnerability', 'injection', 'xss', 'csrf', 'owasp',
    ],
    category: 'guardrail',
    systemPromptAddition: [
      '1. Check for injection vulnerabilities (SQL, command, template).',
      '2. Verify all user input is validated and sanitized.',
      '3. Confirm authentication and authorization on every protected route.',
      '4. Ensure secrets are not hard-coded or committed to version control.',
      '5. Check for insecure defaults (open CORS, debug mode, verbose errors).',
      '6. Verify HTTPS is enforced and cookies are secure/httpOnly/sameSite.',
      '7. Run `npm audit` or equivalent dependency vulnerability scan.',
    ].join('\n'),
    verificationGate: {
      steps: [
        'Run npm audit (or equivalent) and review findings',
        'Grep for hard-coded secrets, API keys, and passwords',
        'Confirm all findings are addressed or documented as accepted risk',
      ],
      failAction: 'report',
    },
  },
  {
    name: 'performance-audit',
    description: 'Profile and optimize application performance',
    triggers: [
      'performance', 'optimize', 'fast', 'slow', 'bottleneck', 'profile',
      'benchmark', 'memory', 'cache', 'latency',
    ],
    category: 'guardrail',
    systemPromptAddition: [
      '1. Profile the application to identify the actual bottleneck.',
      '2. Record baseline metrics before making any changes.',
      '3. Optimize the hottest code path first.',
      '4. Measure after each change to confirm improvement.',
      '5. Stop when the performance target is met — do not over-optimize.',
    ].join('\n'),
    verificationGate: {
      steps: [
        'Profile before optimization and record baseline metric',
        'Profile after optimization and record new metric',
        'Compare delta and confirm improvement meets target',
      ],
      failAction: 'report',
    },
  },
  {
    name: 'accessibility-check',
    description: 'Ensure UI meets WCAG accessibility standards',
    triggers: [
      'accessibility', 'a11y', 'aria', 'screen reader', 'wcag',
      'keyboard navigation', 'contrast',
    ],
    category: 'guardrail',
    systemPromptAddition: [
      '1. Verify all interactive elements have accessible names (aria-label or visible text).',
      '2. Check color contrast ratios meet WCAG AA (4.5:1 for normal text).',
      '3. Confirm all functionality is reachable via keyboard alone.',
      '4. Ensure focus order is logical and visible.',
      '5. Verify images have alt text and decorative images are aria-hidden.',
    ].join('\n'),
    verificationGate: {
      steps: [
        'Check all interactive elements have ARIA labels or accessible names',
        'Verify color contrast meets WCAG AA ratios',
        'Confirm full keyboard navigation works without a mouse',
      ],
      failAction: 'report',
    },
  },
  {
    name: 'error-handling',
    description: 'Ensure comprehensive error handling across the codebase',
    triggers: [
      'error handling', 'try catch', 'exception', 'error boundary',
      'graceful degradation', 'fault tolerance',
    ],
    category: 'guardrail',
    systemPromptAddition: [
      '1. Identify all async operations and confirm each has error handling.',
      '2. Ensure caught errors are logged with context (what was attempted, with what input).',
      '3. Verify errors are propagated or translated appropriately — never silently swallowed.',
      '4. Check that user-facing error messages are helpful but do not leak internals.',
      '5. Confirm error paths are tested, not just happy paths.',
    ].join('\n'),
    verificationGate: {
      steps: [
        'Check all async operations have try/catch or .catch()',
        'Test error paths with intentional failures',
      ],
      failAction: 'retry',
    },
  },
  {
    name: 'input-validation',
    description: 'Validate and sanitize all external input',
    triggers: [
      'validation', 'sanitize', 'input validation', 'schema validation',
      'zod', 'joi', 'yup',
    ],
    category: 'guardrail',
    systemPromptAddition: [
      '1. Identify every entry point where external data enters the system.',
      '2. Define a schema for each input (type, range, format, required fields).',
      '3. Validate at the boundary — before the data reaches business logic.',
      '4. Return descriptive error messages that tell the caller what was wrong.',
      '5. Test with malformed, missing, and adversarial input.',
    ].join('\n'),
    verificationGate: {
      steps: [
        'Test each input endpoint with malformed data',
        'Confirm descriptive validation error messages are returned',
      ],
      failAction: 'retry',
    },
  },
  {
    name: 'testing-standards',
    description: 'Enforce test quality and coverage standards',
    triggers: [
      'test', 'coverage', 'spec', 'assert', 'expect', 'test suite',
      'unit test', 'integration test',
    ],
    category: 'guardrail',
    systemPromptAddition: [
      '1. Every public function must have at least one test.',
      '2. Tests must cover happy path, edge cases, and error conditions.',
      '3. No skipped tests — fix or remove them.',
      '4. Assertions must be specific (not just `assert.ok(result)`).',
      '5. Run the full suite and confirm all tests pass.',
    ].join('\n'),
    verificationGate: {
      steps: [
        'Run the full test suite',
        'Confirm no tests are skipped',
        'Report total pass / fail / skip count',
      ],
      failAction: 'retry',
    },
  },
];

// ---------------------------------------------------------------------------
// ORCHESTRATION (5) — multi-agent dispatch patterns
// ---------------------------------------------------------------------------

const ORCHESTRATION: Capability[] = [
  {
    name: 'parallel-quality',
    description: 'Run lint, typecheck, and test in parallel',
    triggers: ['quality check', 'lint and test', 'full check', 'pre-commit'],
    category: 'orchestration',
    dispatchHint: {
      when: 'User requests a comprehensive quality check',
      tasks: ['Run linter', 'Run type checker', 'Run test suite'],
      maxConcurrent: 3,
    },
  },
  {
    name: 'parallel-implementation',
    description: 'Fan out implementation across files, fan in verification',
    triggers: ['implement all', 'batch implement', 'parallel implement', 'fan out'],
    category: 'orchestration',
    dispatchHint: {
      when: 'Multiple independent files need similar changes',
      tasks: ['Implement changes per file in parallel', 'Run full test suite to verify'],
      maxConcurrent: 5,
    },
  },
  {
    name: 'phased-deploy',
    description: 'Multi-phase deployment with pre-checks and smoke tests',
    triggers: ['deploy pipeline', 'staged deploy', 'phased deploy', 'canary deploy'],
    category: 'orchestration',
    requires: ['testing-standards', 'security-review'],
    dispatchHint: {
      when: 'Deploying to production with safety checks',
      tasks: ['Run pre-deploy checks (lint, test, audit)', 'Execute deployment', 'Run smoke tests'],
      maxConcurrent: 1,
    },
  },
  {
    name: 'review-sweep',
    description: 'Dispatch one review agent per file in a changeset',
    triggers: ['review all', 'sweep review', 'review sweep', 'batch review'],
    category: 'orchestration',
    dispatchHint: {
      when: 'A large changeset needs file-by-file review',
      tasks: ['Dispatch one review agent per changed file'],
      maxConcurrent: 7,
    },
  },
  {
    name: 'multi-stack',
    description: 'Parallel frontend and backend development',
    triggers: ['full stack', 'frontend and backend', 'multi-stack', 'parallel stack'],
    category: 'orchestration',
    dispatchHint: {
      when: 'Feature requires coordinated frontend and backend work',
      tasks: ['Implement backend API changes', 'Implement frontend UI changes', 'Integration test'],
      maxConcurrent: 2,
    },
  },
];

// ---------------------------------------------------------------------------
// TOOL (5) — tool-centric capabilities
// ---------------------------------------------------------------------------

const TOOL: Capability[] = [
  {
    name: 'file-operations',
    description: 'File reading, writing, editing, and navigation',
    triggers: ['file', 'read', 'write', 'edit', 'create', 'delete', 'rename', 'move', 'copy'],
    category: 'tool',
    suggestedTools: ['Read', 'Write', 'Edit', 'MultiEdit', 'Glob', 'LS'],
  },
  {
    name: 'search',
    description: 'Code and file search across the project',
    triggers: ['find', 'search', 'grep', 'locate', 'where', 'which'],
    category: 'tool',
    suggestedTools: ['Glob', 'Grep', 'Read'],
  },
  {
    name: 'shell',
    description: 'Shell command execution and process management',
    triggers: ['run', 'execute', 'command', 'terminal', 'npm', 'yarn', 'pip', 'cargo'],
    category: 'tool',
    suggestedTools: ['Bash', 'BashOutput', 'KillShell'],
  },
  {
    name: 'web-research',
    description: 'Web search and content fetching',
    triggers: ['search web', 'look up', 'fetch url', 'download', 'url', 'website'],
    category: 'tool',
    suggestedTools: ['WebSearch', 'WebFetch'],
  },
  {
    name: 'notebook',
    description: 'Jupyter notebook reading and editing',
    triggers: ['notebook', 'jupyter', 'ipynb', 'cell'],
    category: 'tool',
    suggestedTools: ['NotebookRead', 'NotebookEdit'],
  },
];

// ---------------------------------------------------------------------------
// Combined registry — 42 capabilities
// ---------------------------------------------------------------------------

export const CAPABILITIES: Capability[] = [
  ...METHODOLOGY,
  ...ARCHITECTURE,
  ...DOMAIN,
  ...GUARDRAIL,
  ...ORCHESTRATION,
  ...TOOL,
];
