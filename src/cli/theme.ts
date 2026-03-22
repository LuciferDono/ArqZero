// src/cli/theme.ts
export const THEME = {
  // Symbols
  dot: process.platform === 'darwin' ? '\u23FA' : '\u25CF',
  branch: '\u23BF',
  diamond: '\u25C6',
  arrow: '\u25B8',
  pipe: '\u250A',
  prompt: '\u203A',
  successDot: '\u25CF',
  failureMark: '\u00D7',

  // ArqZero colors (amber/gold identity)
  primary: '#FFB800',
  primaryShimmer: '#FFD54F',
  text: 'white',
  dim: 'gray',
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'cyan',
  toolBorder: '#5769F7',
  bashBorder: '#FF0087',
  diffAdded: '#69DB7C',
  diffRemoved: '#FFA8B4',

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
