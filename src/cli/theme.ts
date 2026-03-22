// src/cli/theme.ts

// ─── Color System ───────────────────────────────────────────────
// Single source of truth. Do not add colors outside this system.

export const COLORS = {
  // Brand — maximum 2 uses per screen: prompt symbol + one active state
  brand:           '#00D4AA',
  brandDeep:       '#00A886',
  brandLight:      '#4EECD0',
  brandSubtle:     '#00D4AA18',

  // Semantic — only when meaning is carried
  success:         '#3AAF60',
  error:           '#D04545',
  warning:         '#C47F00',
  info:            '#4A8FD4',

  // Tools — load-bearing cognition, do not change
  toolFile:        '#4A7CF0',  // Read, Write, Edit, Glob, Grep — blue
  toolBash:        '#D42E8A',  // Bash — magenta

  // Diff — desaturated for long reading
  diffLineAdd:     '#2E9E50',
  diffWordAdd:     '#48BC66',
  diffLineRemove:  '#B03A3A',
  diffWordRemove:  '#D05858',

  // Context meter
  ctxHealthy:      '#3AAF60',
  ctxCaution:      '#C47F00',
  ctxCritical:     '#C83030',
  ctxTrack:        '#0d1520',

  // Chrome — warm neutral, invisible structure
  bg:              '#1a1a1a',
  username:        '#6B7280',
  structural:      '#374151',
  badgeBg:         '#1f1f1f',

  // Text levels — warm greys, not cold blue
  textPrimary:     '#D4D4D4',
  textSecondary:   '#6B7280',
  textDim:         '#374151',
  textInvisible:   '#2a2a2a',

  // Permission
  permYes:         '#3AAF60',
  permAlways:      '#4A8FD4',
  permNo:          '#D04545',
} as const;

// Legacy THEME mapping for components that still reference THEME.*
export const THEME = {
  // Symbols (unchanged)
  dot: process.platform === 'darwin' ? '\u23FA' : '\u25CF',
  branch: '\u23BF',
  diamond: '\u25C6',
  arrow: '\u25B8',
  pipe: '\u250A',
  prompt: '\u203A',
  successDot: '\u25CF',
  failureMark: '\u00D7',

  // Colors — mapped from COLORS
  primary:       COLORS.brand,
  primaryShimmer: COLORS.brandLight,
  text:          COLORS.textPrimary,
  dim:           COLORS.textSecondary,
  success:       COLORS.success,
  error:         COLORS.error,
  warning:       COLORS.warning,
  info:          COLORS.info,
  toolBorder:    COLORS.toolFile,
  bashBorder:    COLORS.toolBash,
  diffAdded:     COLORS.diffLineAdd,
  diffRemoved:   COLORS.diffLineRemove,

  // App
  appName: 'ArqZero',
  promptPrefix: '\u25C6 arq \u203A',
  version: '2.0.0',
} as const;

// ArqZero's own whimsical verbs
export const SPINNER_VERBS = [
  'Architecting', 'Assembling', 'Blueprinting', 'Bootstrapping', 'Brewing',
  'Building', 'Calibrating', 'Calculating', 'Cascading', 'Channeling',
  'Churning', 'Compiling', 'Computing', 'Configuring', 'Constructing',
  'Converging', 'Crafting', 'Crunching', 'Debugging', 'Decoding',
  'Deploying', 'Designing', 'Dispatching', 'Encoding', 'Engineering',
  'Executing', 'Fabricating', 'Forging', 'Generating', 'Gridlining',
  'Hashing', 'Indexing', 'Initializing', 'Integrating', 'Iterating',
  'Launching', 'Loading', 'Machining', 'Manufacturing', 'Mapping',
  'Materializing', 'Meshing', 'Modeling', 'Navigating', 'Networking',
  'Optimizing', 'Orchestrating', 'Parsing', 'Patching', 'Pipelining',
  'Processing', 'Profiling', 'Programming', 'Propagating', 'Prototyping',
  'Quantizing', 'Querying', 'Reasoning', 'Refactoring', 'Rendering',
  'Resolving', 'Routing', 'Scaffolding', 'Scanning', 'Sequencing',
  'Serializing', 'Shaping', 'Solving', 'Sorting', 'Spawning',
  'Spinning', 'Structuring', 'Synthesizing', 'Threading', 'Tokenizing',
  'Tracing', 'Transforming', 'Traversing', 'Tuning', 'Vectorizing',
  'Welding', 'Wiring', 'Zeroing',
];
