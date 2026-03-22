import type { Tool, ToolContext, ToolResult } from '../types.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const MAX_RESULTS = 10;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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
 * Extract the real URL from DuckDuckGo redirect URLs.
 */
function cleanDdgUrl(url: string): string {
  // DDG wraps URLs like //duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com&...
  if (url.includes('duckduckgo.com/l/')) {
    const match = url.match(/[?&]uddg=([^&]+)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        // fall through
      }
    }
  }
  // Also handle //duckduckgo.com/y.js?... with u3= param
  if (url.includes('duckduckgo.com/y.js')) {
    const match = url.match(/[?&]u3=([^&]+)/);
    if (match) {
      try {
        const decoded = decodeURIComponent(match[1]);
        // u3 sometimes contains another bing redirect — extract final URL
        const bingMatch = decoded.match(/[?&]u=a1([^&]+)/i);
        if (bingMatch) {
          return decodeURIComponent(bingMatch[1]);
        }
        return decoded;
      } catch {
        // fall through
      }
    }
  }
  return url;
}

/**
 * Parse DuckDuckGo HTML search results into structured data.
 * Exported for testing.
 */
export function parseSearchResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Match each organic result block (skip ads)
  const resultBlockRegex = /<div\s+class="result results_links results_links_deep web-result\s*"[^>]*>([\s\S]*?)(?=<div\s+class="result |$)/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = resultBlockRegex.exec(html)) !== null && results.length < MAX_RESULTS) {
    const block = blockMatch[1];

    // Extract link and title
    const linkMatch = block.match(/<a\s+[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a\s+[^>]*href="([^"]*)"[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const url = decodeHtmlEntities(linkMatch[1]);
    const title = decodeHtmlEntities(stripHtmlTags(linkMatch[2]).trim());

    // Extract snippet
    const snippetMatch = block.match(/<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<div\s+class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
    const snippet = snippetMatch
      ? decodeHtmlEntities(stripHtmlTags(snippetMatch[1]).trim())
      : '';

    if (title && url) {
      results.push({ title, url: cleanDdgUrl(url), snippet });
    }
  }

  // Fallback for simpler links (no block structure)
  if (results.length === 0) {
    const simpleRegex = /<a\s+[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = simpleRegex.exec(html)) !== null && results.length < MAX_RESULTS) {
      const url = decodeHtmlEntities(match[1]);
      const title = decodeHtmlEntities(stripHtmlTags(match[2]).trim());
      if (title && url) {
        results.push({ title, url: cleanDdgUrl(url), snippet: '' });
      }
    }
  }

  return results;
}

/**
 * Search using Tavily API (if key available).
 */
async function searchWithTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: MAX_RESULTS,
      include_answer: false,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Tavily API returned ${response.status}`);
  }

  const data = await response.json() as {
    results: Array<{ title: string; url: string; content: string }>;
  };

  return (data.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content?.slice(0, 200) ?? '',
  }));
}

/**
 * Search using DuckDuckGo HTML (free, no API key).
 */
async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  const encodedQuery = encodeURIComponent(query.trim());
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

  const response = await fetch(searchUrl, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      'User-Agent': BROWSER_UA,
    },
  });

  if (!response.ok) {
    throw new Error(`Search request failed with status ${response.status}`);
  }

  const html = await response.text();
  return parseSearchResults(html);
}

/**
 * Format search results into readable text.
 */
function formatResults(results: SearchResult[], source: string): string {
  if (results.length === 0) {
    return 'No search results found.';
  }

  const header = `Search results (${source}):\n`;
  const formatted = results
    .map((r, i) => {
      const parts = [`${i + 1}. ${r.title}`, `   ${r.url}`];
      if (r.snippet) {
        parts.push(`   ${r.snippet}`);
      }
      return parts.join('\n');
    })
    .join('\n\n');

  return header + formatted;
}

interface WebSearchInput {
  query: string;
}

export const webSearchTool: Tool = {
  name: 'WebSearch',
  description: 'Searches the web and returns results with titles, URLs, and snippets. Uses Tavily API if configured, otherwise DuckDuckGo.',
  inputSchema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query' },
    },
    required: ['query'],
  },
  permissionLevel: 'ask',

  async execute(input: unknown, ctx: ToolContext): Promise<ToolResult> {
    const { query } = (input ?? {}) as Partial<WebSearchInput>;

    if (!query || query.trim().length === 0) {
      return {
        content: 'Error: query is required and must not be empty.',
        isError: true,
      };
    }

    // Try Tavily first (if API key available)
    const tavilyKey = process.env.TAVILY_API_KEY ?? (ctx.config as any)?.tavilyApiKey;
    if (tavilyKey) {
      try {
        const results = await searchWithTavily(query.trim(), tavilyKey);
        return { content: formatResults(results, 'Tavily') };
      } catch (err: any) {
        // Fall through to DuckDuckGo
      }
    }

    // Fallback to DuckDuckGo
    try {
      const results = await searchWithDuckDuckGo(query.trim());
      return { content: formatResults(results, 'DuckDuckGo') };
    } catch (err: any) {
      const message = err.name === 'AbortError' || err.name === 'TimeoutError'
        ? 'Error: Search request timed out.'
        : `Error: Failed to perform search: ${err.message}`;
      return { content: message, isError: true };
    }
  },
};
