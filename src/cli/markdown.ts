// src/cli/markdown.ts
import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';

const marked = new Marked();
marked.use(
  markedTerminal({
    // No top-level heading transforms — keep it clean
    showSectionPrefix: false,
    // Code block styling
    code: (code: string) => code,
    // Muted horizontal rules
    hr: () => '─'.repeat(40) + '\n',
    // Keep lists tight
    listitem: (text: string) => `  • ${text}`,
  }) as any,
);

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
