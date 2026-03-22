import { readTool } from './read.js';
import { writeTool } from './write.js';
import { editTool } from './edit.js';
import { bashTool } from './bash.js';
import { globTool } from './glob.js';
import { grepTool } from './grep.js';
import { askUserTool } from './ask-user.js';
import { webSearchTool } from './web-search.js';
import { webFetchTool } from './web-fetch.js';
import { multiEditTool } from './multi-edit.js';
import { lsTool } from './ls.js';
import { todoWriteTool } from './todo-write.js';
import { todoReadTool } from './todo-read.js';
import { bashOutputTool } from './bash-output.js';
import { killShellTool } from './kill-shell.js';
import { notebookReadTool } from './notebook-read.js';
import { notebookEditTool } from './notebook-edit.js';
import { taskTool } from './task.js';
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
  multiEditTool,
  lsTool,
  todoWriteTool,
  todoReadTool,
  bashOutputTool,
  killShellTool,
  notebookReadTool,
  notebookEditTool,
  taskTool,
];

// Also re-export individual tools for direct access
export {
  readTool, writeTool, editTool, bashTool, globTool, grepTool, askUserTool,
  webSearchTool, webFetchTool, multiEditTool, lsTool, todoWriteTool, todoReadTool,
  bashOutputTool, killShellTool, notebookReadTool, notebookEditTool, taskTool,
};
