import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webSearchTool, parseSearchResults } from './web-search.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: '.',
  config: { provider: 'cursor' } as any,
  promptUser: async () => ({ allowed: true }),
};

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
    const html = `
      <div class="result">
        <a class="result__a" href="https://example.com/page1">Example Page 1</a>
        <a class="result__snippet">This is the first result snippet.</a>
      </div>
      <div class="result">
        <a class="result__a" href="https://example.com/page2">Example Page 2</a>
        <a class="result__snippet">This is the second result snippet.</a>
      </div>
    `;
    const results = parseSearchResults(html);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, 'Example Page 1');
    assert.equal(results[0].url, 'https://example.com/page1');
    assert.equal(results[0].snippet, 'This is the first result snippet.');
    assert.equal(results[1].title, 'Example Page 2');
  });

  it('should handle HTML with no results', () => {
    const html = '<div class="no-results">No results found</div>';
    const results = parseSearchResults(html);
    assert.equal(results.length, 0);
  });

  it('should handle results with missing snippets', () => {
    const html = `
      <div class="result">
        <a class="result__a" href="https://example.com/page1">Example Page 1</a>
      </div>
    `;
    const results = parseSearchResults(html);
    assert.equal(results.length, 1);
    assert.equal(results[0].title, 'Example Page 1');
    assert.equal(results[0].snippet, '');
  });

  it('should strip HTML tags from snippets', () => {
    const html = `
      <div class="result">
        <a class="result__a" href="https://example.com/page1">Example Page</a>
        <a class="result__snippet">This has <b>bold</b> and <i>italic</i> text.</a>
      </div>
    `;
    const results = parseSearchResults(html);
    assert.equal(results[0].snippet, 'This has bold and italic text.');
  });

  it('should decode HTML entities in results', () => {
    const html = `
      <div class="result">
        <a class="result__a" href="https://example.com/page1">Tom &amp; Jerry</a>
        <a class="result__snippet">Results for &quot;search&quot; &lt;query&gt;</a>
      </div>
    `;
    const results = parseSearchResults(html);
    assert.equal(results[0].title, 'Tom & Jerry');
    assert.equal(results[0].snippet, 'Results for "search" <query>');
  });

  it('should limit results to 10', () => {
    const resultBlocks = Array.from({ length: 15 }, (_, i) => `
      <div class="result">
        <a class="result__a" href="https://example.com/page${i}">Page ${i}</a>
        <a class="result__snippet">Snippet ${i}</a>
      </div>
    `).join('');
    const html = `<html><body>${resultBlocks}</body></html>`;
    const results = parseSearchResults(html);
    assert.equal(results.length, 10);
  });
});
