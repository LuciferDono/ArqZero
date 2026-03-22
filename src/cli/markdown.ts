// src/cli/markdown.ts
import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import hljs from 'highlight.js';
import { runtime } from '../config/runtime.js';

const marked = new Marked();
marked.use(
  markedTerminal({
    showSectionPrefix: false,
    reflowText: true,
    tab: 2,
    // Syntax highlighting for code blocks
    codespan: (text: string) => `\x1b[36m${text}\x1b[0m`,  // cyan for inline code
    code(code: string, lang?: string) {
      if (runtime.syntaxHighlightingDisabled) return code;
      try {
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
        }
        return hljs.highlightAuto(code).value;
      } catch {
        return code;
      }
    },
    hr: () => '─'.repeat(40) + '\n',
  // @ts-expect-error marked-terminal type mismatch with Marked extension interface
  }),
);

/**
 * Render markdown to terminal-formatted string.
 * Handles headings, bold, italic, code, lists, links.
 */
export function renderMarkdown(text: string): string {
  if (!text || text.length < 3) return text;

  // Quick check: does this look like it has markdown?
  if (!/[#*`_~\[\]|>-]/.test(text)) return text;

  try {
    let rendered = marked.parse(text, { async: false }) as string;
    // Clean up excessive newlines
    rendered = rendered.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
    return rendered;
  } catch {
    return text;
  }
}
