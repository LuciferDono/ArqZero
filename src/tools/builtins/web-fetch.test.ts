import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { webFetchTool, stripHtml, truncateText } from './web-fetch.js';
import type { ToolContext } from '../types.js';

const ctx: ToolContext = {
  cwd: '.',
  config: { provider: 'cursor' } as any,
  promptUser: async () => ({ allowed: true }),
};

describe('webFetchTool metadata', () => {
  it('should have correct name', () => {
    assert.equal(webFetchTool.name, 'WebFetch');
  });

  it('should have ask permission level', () => {
    assert.equal(webFetchTool.permissionLevel, 'ask');
  });

  it('should require url in inputSchema', () => {
    const schema = webFetchTool.inputSchema as any;
    assert.equal(schema.type, 'object');
    assert.ok(schema.properties.url);
    assert.ok(schema.properties.prompt);
    assert.deepEqual(schema.required, ['url']);
  });
});

describe('webFetchTool input validation', () => {
  it('should return error when url is missing', async () => {
    const result = await webFetchTool.execute({}, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.toLowerCase().includes('url'));
  });

  it('should return error when url is empty', async () => {
    const result = await webFetchTool.execute({ url: '' }, ctx);
    assert.equal(result.isError, true);
  });

  it('should return error for invalid URL scheme', async () => {
    const result = await webFetchTool.execute({ url: 'ftp://example.com' }, ctx);
    assert.equal(result.isError, true);
    assert.ok(result.content.includes('http'));
  });

  it('should return error for non-URL strings', async () => {
    const result = await webFetchTool.execute({ url: 'not-a-url' }, ctx);
    assert.equal(result.isError, true);
  });
});

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    const html = '<p>Hello <b>world</b></p>';
    assert.equal(stripHtml(html), 'Hello world');
  });

  it('should remove script tags and their content', () => {
    const html = '<p>Hello</p><script>alert("xss")</script><p>world</p>';
    assert.equal(stripHtml(html), 'Hello world');
  });

  it('should remove style tags and their content', () => {
    const html = '<p>Hello</p><style>.red { color: red; }</style><p>world</p>';
    assert.equal(stripHtml(html), 'Hello world');
  });

  it('should collapse multiple whitespace characters', () => {
    const html = '<p>Hello</p>   \n\n   <p>world</p>';
    const result = stripHtml(html);
    assert.ok(!result.includes('   '));
    assert.ok(result.includes('Hello'));
    assert.ok(result.includes('world'));
  });

  it('should decode HTML entities', () => {
    const html = '<p>Tom &amp; Jerry &lt;3&gt;</p>';
    assert.equal(stripHtml(html), 'Tom & Jerry <3>');
  });

  it('should handle empty input', () => {
    assert.equal(stripHtml(''), '');
  });

  it('should handle plain text without tags', () => {
    assert.equal(stripHtml('Hello world'), 'Hello world');
  });
});

describe('truncateText', () => {
  it('should not truncate short text', () => {
    const text = 'Hello world';
    assert.equal(truncateText(text, 50000), text);
  });

  it('should truncate text exceeding the limit', () => {
    const text = 'a'.repeat(60000);
    const result = truncateText(text, 50000);
    assert.ok(result.length <= 50000 + 100); // allow for truncation notice
    assert.ok(result.includes('[truncated'));
  });

  it('should use default limit of 50000', () => {
    const text = 'a'.repeat(60000);
    const result = truncateText(text);
    assert.ok(result.length <= 50100);
    assert.ok(result.includes('[truncated'));
  });

  it('should preserve content before truncation point', () => {
    const text = 'important start ' + 'x'.repeat(60000);
    const result = truncateText(text, 50000);
    assert.ok(result.startsWith('important start'));
  });
});
