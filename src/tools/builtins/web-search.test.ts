import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webSearchTool, parseSearchResults } from './web-search.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: '.',
  config: { provider: 'fireworks' } as any,
  promptUser: async () => ({ allowed: true }),
};

// Helper: build realistic DDG result HTML
function ddgResult(url: string, title: string, snippet?: string): string {
  const snippetHtml = snippet
    ? `<a class="result__snippet" href="${url}">${snippet}</a>`
    : '';
  return `
    <div class="result results_links results_links_deep web-result ">
      <div class="links_main links_deep result__body">
        <h2 class="result__title">
          <a class="result__a" href="${url}">${title}</a>
        </h2>
        ${snippetHtml}
      </div>
    </div>`;
}

describe('webSearchTool metadata', () => {
  it('should have correct name', () => {
    assert.equal(webSearchTool.name, 'WebSearch');
  });

  it('should have ask permission level', () => {
    assert.equal(webSearchTool.permissionLevel, 'ask');
  });

  it('should require query in inputSchema', () => {
    const schema = webSearchTool.inputSchema as any;
    assert.equal(schema.type, 'object');
    assert.ok(schema.properties.query);
    assert.deepEqual(schema.required, ['query']);
  });
});

describe('webSearchTool input validation', () => {
  it('should return error when query is empty', async () => {
    const result = await webSearchTool.execute({ query: '' }, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.includes('query'));
  });

  it('should return error when query is missing', async () => {
    const result = await webSearchTool.execute({}, ctx);
    assert.equal(result.isError, true);
  });
});

describe('parseSearchResults', () => {
  it('should extract results from DuckDuckGo HTML', () => {
    const html = ddgResult('https://example.com/page1', 'Example Page 1', 'First snippet.')
      + ddgResult('https://example.com/page2', 'Example Page 2', 'Second snippet.');
    const results = parseSearchResults(html);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, 'Example Page 1');
    assert.equal(results[0].url, 'https://example.com/page1');
    assert.equal(results[0].snippet, 'First snippet.');
    assert.equal(results[1].title, 'Example Page 2');
  });

  it('should handle HTML with no results', () => {
    const html = '<div class="no-results">No results found</div>';
    const results = parseSearchResults(html);
    assert.equal(results.length, 0);
  });

  it('should handle results with missing snippets', () => {
    const html = ddgResult('https://example.com/page1', 'Example Page 1');
    const results = parseSearchResults(html);
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Example Page 1');
    assert.equal(results[0].snippet, '');
  });

  it('should strip HTML tags from snippets', () => {
    const html = ddgResult('https://example.com', 'Page', 'This has <b>bold</b> and <i>italic</i> text.');
    const results = parseSearchResults(html);
    assert.equal(results[0].snippet, 'This has bold and italic text.');
  });

  it('should decode HTML entities in results', () => {
    const html = ddgResult('https://example.com', 'Tom &amp; Jerry', 'Results for &quot;search&quot; &lt;query&gt;');
    const results = parseSearchResults(html);
    assert.equal(results[0].title, 'Tom & Jerry');
    assert.equal(results[0].snippet, 'Results for "search" <query>');
  });

  it('should limit results to 10', () => {
    const blocks = Array.from({ length: 15 }, (_, i) =>
      ddgResult(`https://example.com/page${i}`, `Page ${i}`, `Snippet ${i}`)
    ).join('');
    const results = parseSearchResults(blocks);
    assert.equal(results.length, 10);
  });

  it('should clean DuckDuckGo redirect URLs', () => {
    const html = ddgResult(
      '//duckduckgo.com/l/?uddg=https%3A%2F%2Freal-site.com%2Fpage&rut=abc',
      'Real Site',
      'A snippet.',
    );
    const results = parseSearchResults(html);
    assert.equal(results[0].url, 'https://real-site.com/page');
  });
});
