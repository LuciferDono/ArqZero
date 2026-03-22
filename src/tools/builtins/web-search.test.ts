import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webSearchTool, parseBingResults, parseDdgResults } from './web-search.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: '.',
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

// Helper: build Bing result HTML
function bingResult(url: string, title: string, snippet?: string): string {
  return `<li class="b_algo"><h2><a href="${url}">${title}</a></h2><div class="b_caption"><p>${snippet ?? ''}</p></div></li>`;
}

// Helper: build DDG result HTML
function ddgResult(url: string, title: string, snippet?: string): string {
  const snippetHtml = snippet
    ? `<a class="result__snippet" href="${url}">${snippet}</a>`
    : '';
  return `<div class="result results_links results_links_deep web-result "><div class="links_main"><h2><a class="result__a" href="${url}">${title}</a></h2>${snippetHtml}</div></div>`;
}

describe('webSearchTool metadata', () => {
  it('should have correct name', () => {
    assert.equal(webSearchTool.name, 'WebSearch');
  });

  it('should have ask permission level', () => {
    assert.equal(webSearchTool.permissionLevel, 'ask');
  });

  it('should require query', () => {
    const schema = webSearchTool.inputSchema as any;
    assert.deepEqual(schema.required, ['query']);
  });
});

describe('webSearchTool input validation', () => {
  it('should return error when query is empty', async () => {
    const result = await webSearchTool.execute({ query: '' }, ctx);
    assert.equal(result.isError, true);
  });

  it('should return error when query is missing', async () => {
    const result = await webSearchTool.execute({}, ctx);
    assert.equal(result.isError, true);
  });
});

describe('parseBingResults', () => {
  it('should extract results from Bing HTML', () => {
    const html = bingResult('https://example.com', 'Example', 'A snippet.') +
      bingResult('https://example2.com', 'Example 2', 'Another snippet.');
    const results = parseBingResults(html);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, 'Example');
    assert.equal(results[0].url, 'https://example.com');
    assert.equal(results[0].snippet, 'A snippet.');
  });

  it('should handle empty HTML', () => {
    assert.equal(parseBingResults('<html></html>').length, 0);
  });

  it('should strip HTML tags from titles', () => {
    const html = bingResult('https://ex.com', '<b>Bold</b> Title', 'snip');
    const results = parseBingResults(html);
    assert.equal(results[0].title, 'Bold Title');
  });

  it('should decode HTML entities', () => {
    const html = bingResult('https://ex.com', 'Tom &amp; Jerry', 'A &lt;great&gt; movie');
    const results = parseBingResults(html);
    assert.equal(results[0].title, 'Tom & Jerry');
    assert.equal(results[0].snippet, 'A <great> movie');
  });

  it('should limit to 10 results', () => {
    const blocks = Array.from({ length: 15 }, (_, i) =>
      bingResult(`https://ex.com/${i}`, `Page ${i}`, `Snippet ${i}`)
    ).join('');
    assert.equal(parseBingResults(blocks).length, 10);
  });
});

describe('parseDdgResults', () => {
  it('should extract results from DDG HTML', () => {
    const html = ddgResult('https://example.com', 'Example', 'A snippet.');
    const results = parseDdgResults(html);
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Example');
  });

  it('should handle empty HTML', () => {
    assert.equal(parseDdgResults('<html></html>').length, 0);
  });
});
