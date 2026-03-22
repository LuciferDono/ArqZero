import type { Tool, ToolContext, ToolResult } from '../types.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const MAX_RESULTS = 10;

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
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/**
 * Strip HTML tags from a string.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Parse DuckDuckGo HTML search results into structured data.
 * Exported for testing.
 */
export function parseSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Match each result block
  const resultBlockRegex = /<div\s+class="result[^"]*"[^>]*>([\s\S]*?)(?=<div\s+class="result|$)/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = resultBlockRegex.exec(html)) !== null && results.length < MAX_RESULTS) {
    const block = blockMatch[1];

    // Extract link and title
    const linkMatch = block.match(/<a\s+class="result__a"\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const url = decodeHtmlEntities(linkMatch[1]);
    const title = decodeHtmlEntities(stripHtmlTags(linkMatch[2]).trim());

    // Extract snippet
    const snippetMatch = block.match(/<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch
      ? decodeHtmlEntities(stripHtmlTags(snippetMatch[1]).trim())
      : '';

    results.push({ title, url, snippet });
  }

  return results;
}

/**
 * Format search results into readable text.
 */
function formatResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return 'No search results found.';
  }

  return results
    .map((r, i) => {
      const parts = [`${i + 1}. ${r.title}`, `   ${r.url}`];
      if (r.snippet) {
        parts.push(`   ${r.snippet}`);
      }
      return parts.join('\n');
    })
    .join('\n\n');
}

interface WebSearchInput {
  query: string;
}

export const webSearchTool: Tool = {
  name: 'WebSearch',
  description: 'Searches the web using DuckDuckGo and returns results with titles, URLs, and snippets.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, _ctx: ToolContext): Promise<ToolResult> {
    const { query } = (input ?? {}) as Partial<WebSearchInput>;

    if (!query || query.trim().length === 0) {
      return {
        content: 'Error: query is required and must not be empty.',
        isError: true,
      };
    }

    const encodedQuery = encodeURIComponent(query.trim());
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(searchUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'ArqCode/1.0',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          content: `Error: Search request failed with status ${response.status}.`,
          isError: true,
        };
      }

      const html = await response.text();
      const results = parseSearchResults(html);
      const formatted = formatResults(results);

      return { content: formatted };
    } catch (err: any) {
      const message = err.name === 'AbortError'
        ? 'Error: Search request timed out after 10 seconds.'
        : `Error: Failed to perform search: ${err.message}`;
      return { content: message, isError: true };
    }
  },
};
