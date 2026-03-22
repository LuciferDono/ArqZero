// src/cli/markdown.ts
import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import hljs from 'highlight.js';
import { runtime } from '../config/runtime.js';

function createMarked(): Marked {
  const m = new Marked();
  m.use(
    markedTerminal({
      showSectionPrefix: false,
      // Use highlight.js for code blocks (unless disabled)
      code: (code: string, lang?: string) => {
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
      // Muted horizontal rules
      hr: () => '\u2500'.repeat(40) + '\n',
      // Keep lists tight
      listitem: (text: string) => `  \u2022 ${text}`,
    }) as any,
  );
  return m;
}

let marked = createMarked();

/**
 * Render markdown to terminal-formatted string.
 * Strips trailing whitespace and normalizes newlines.
 */
export function renderMarkdown(text: string): string {
  // Don't process very short or non-markdown text
  if (!text || text.length < 3) return text;

  // Quick check: does this look like it has markdown?
  const hasMarkdown = /[#*`_~\[\]|>-]/.test(text);
  if (!hasMarkdown) return text;

  try {
    const rendered = marked.parse(text, { async: false }) as string;
    // Trim trailing newlines that marked adds
    return rendered.replace(/\n+$/, '');
  } catch {
    // Fallback to raw text if parsing fails
    return text;
  }
}
