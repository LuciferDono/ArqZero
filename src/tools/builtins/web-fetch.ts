import type { Tool, ToolContext, ToolResult } from '../types.js';

const DEFAULT_MAX_LENGTH = 50_000;

/**
 * Decode common HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * Strip HTML to plain text: removes script/style blocks, tags,
 * decodes entities, and collapses whitespace.
 * Exported for testing.
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  let text = html;

  // Remove script and style blocks (including content)
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]*>/g, ' ');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Truncate text to a maximum length, appending a notice if truncated.
 * Exported for testing.
 */
export function truncateText(text: string, maxLength: number = DEFAULT_MAX_LENGTH): string {
  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  return `${truncated}\n\n[truncated - content exceeded ${maxLength} characters]`;
}

/**
 * Validate that a string is a valid HTTP(S) URL.
 */
function isValidHttpUrl(str: string): boolean {
  if (!str) return false;
  try {
    const parsed = new URL(str);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface WebFetchInput {
  url: string;
  prompt?: string;
}

export const webFetchTool: Tool = {
  name: 'WebFetch',
  description: 'Fetches a web page, strips HTML tags, and returns the text content.',
  inputSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'The URL to fetch (must be http:// or https://)' },
      prompt: { type: 'string', description: 'Optional context instruction to prepend to the content' },
    },
    required: ['url'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { url, prompt } = (input ?? {}) as Partial<WebFetchInput>;

    if (!url || url.trim().length === 0) {
      return {
        content: 'Error: url is required and must not be empty.',
        isError: true,
      };
    }

    if (!isValidHttpUrl(url)) {
      return {
        content: 'Error: url must be a valid URL starting with http:// or https://.',
        isError: true,
      };
    }

    let timeout: ReturnType<typeof setTimeout>;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 15_000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          content: `Error: Fetch failed with status ${response.status}.`,
          isError: true,
        };
      }

      const html = await response.text();
      let text = stripHtml(html);
      text = truncateText(text);

      if (prompt) {
        text = `${prompt}\n\n${text}`;
      }

      return { content: text };
    } catch (err: any) {
      clearTimeout(timeout);
      const message = err.name === 'AbortError'
        ? 'Error: Fetch request timed out after 15 seconds.'
        : `Error: Failed to fetch URL: ${err.message}`;
      return { content: message, isError: true };
    }
  },
};
