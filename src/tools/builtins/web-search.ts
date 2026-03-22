import type { Tool, ToolContext, ToolResult } from '../types.js';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const MAX_RESULTS = 10;
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Extract real URL from Bing redirect URLs.
 * Bing wraps links as /ck/a?...&u=a1<base64url>&...
 */
function cleanBingUrl(url: string): string {
  if (url.includes('bing.com/ck/a')) {
    const match = url.match(/[?&]u=a1([^&]+)/);
    if (match) {
      try {
        // Base64url decode
        const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(b64, 'base64').toString('utf-8');
      } catch { /* fall through */ }
    }
  }
  return url;
}

/**
 * Search using Bing (primary — reliable, no API key, structured HTML).
 */
async function searchWithBing(query: string): Promise<SearchResult[]> {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${MAX_RESULTS}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Bing returned ${response.status}`);
  }

  const html = await response.text();
  return parseBingResults(html);
}

/**
 * Parse Bing search results from HTML.
 * Exported for testing.
 */
export function parseBingResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Bing results are in <li class="b_algo">
  const blockRegex = /<li class="b_algo"[^>]*>([\s\S]*?)(?=<li class="b_algo"|<\/ol>|$)/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null && results.length < MAX_RESULTS) {
    const block = blockMatch[1];

    // Extract URL and title from <h2><a href="...">title</a></h2>
    const linkMatch = block.match(/<h2[^>]*>\s*<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const rawUrl = decodeHtmlEntities(linkMatch[1]);
    const title = decodeHtmlEntities(stripHtmlTags(linkMatch[2]).trim());

    // Clean Bing redirect URLs: extract real URL from u= param (base64)
    const url = cleanBingUrl(rawUrl);

    // Extract snippet from <p> or <div class="b_caption">
    const snippetMatch = block.match(/<div class="b_caption"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i)
      || block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const snippet = snippetMatch
      ? decodeHtmlEntities(stripHtmlTags(snippetMatch[1]).trim()).slice(0, 200)
      : '';

    if (title && url) {
      results.push({ title, url, snippet });
    }
  }

  return results;
}

/**
 * Search using DuckDuckGo HTML (fallback).
 */
async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'User-Agent': BROWSER_UA },
  });

  if (!response.ok || response.status === 202) {
    throw new Error(`DuckDuckGo returned ${response.status}`);
  }

  const html = await response.text();
  return parseDdgResults(html);
}

/**
 * Parse DuckDuckGo HTML results. Exported for testing.
 */
export function parseDdgResults(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  const blockRegex = /<div\s+class="result results_links results_links_deep web-result\s*"[^>]*>([\s\S]*?)(?=<div\s+class="result |$)/gi;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = blockRegex.exec(html)) !== null && results.length < MAX_RESULTS) {
    const block = blockMatch[1];

    const linkMatch = block.match(/<a\s+[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a\s+[^>]*href="([^"]*)"[^>]*class="result__a"[^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    let url = decodeHtmlEntities(linkMatch[1]);
    const title = decodeHtmlEntities(stripHtmlTags(linkMatch[2]).trim());

    // Clean DDG redirect URLs
    if (url.includes('duckduckgo.com/l/')) {
      const m = url.match(/[?&]uddg=([^&]+)/);
      if (m) try { url = decodeURIComponent(m[1]); } catch { /* keep original */ }
    }

    const snippetMatch = block.match(/<a\s+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch
      ? decodeHtmlEntities(stripHtmlTags(snippetMatch[1]).trim())
      : '';

    if (title && url) results.push({ title, url, snippet });
  }

  return results;
}

// Keep old export name for test compatibility
export const parseSearchResults = parseDdgResults;

function formatResults(results: SearchResult[], source: string): string {
  if (results.length === 0) return 'No search results found.';

  return `Search results (${source}):\n` + results
    .map((r, i) => {
      const parts = [`${i + 1}. ${r.title}`, `   ${r.url}`];
      if (r.snippet) parts.push(`   ${r.snippet}`);
      return parts.join('\n');
    })
    .join('\n\n');
}

interface WebSearchInput { query: string; }

export const webSearchTool: Tool = {
  name: 'WebSearch',
  description: 'Searches the web and returns results with titles, URLs, and snippets.',
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
      return { content: 'Error: query is required and must not be empty.', isError: true };
    }

    let bingError = false;
    let ddgError = false;

    // Primary: Bing
    try {
      const results = await searchWithBing(query.trim());
      if (results.length > 0) {
        return { content: formatResults(results, 'Bing') };
      }
    } catch { bingError = true; }

    // Fallback: DuckDuckGo
    try {
      const results = await searchWithDuckDuckGo(query.trim());
      if (results.length > 0) {
        return { content: formatResults(results, 'DuckDuckGo') };
      }
    } catch { ddgError = true; }

    // Both engines threw — report an error instead of misleading "no results"
    if (bingError && ddgError) {
      return { content: 'Error: Search unavailable', isError: true };
    }

    return { content: 'No search results found.' };
  },
};
