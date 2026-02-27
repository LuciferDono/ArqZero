import { readTool } from './read.js';
import { writeTool } from './write.js';
import { editTool } from './edit.js';
import { bashTool } from './bash.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { askUserTool } from './ask-user.js';
import { webSearchTool } from './web-search.js';
import { webFetchTool } from './web-fetch.js';
import type { Tool } from '../types.js';

export const builtinTools: Tool[] = [
  readTool,
  writeTool,
  editTool,
  bashTool,
  globTool,
  grepTool,
  askUserTool,
  webSearchTool,
  webFetchTool,
];

// Also re-export individual tools for direct access
export { readTool, writeTool, editTool, bashTool, globTool, grepTool, askUserTool, webSearchTool, webFetchTool };
