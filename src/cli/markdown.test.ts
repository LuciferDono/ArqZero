import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from './markdown.js';

describe('renderMarkdown', () => {
  it('should render headings without raw hashes', () => {
    const result = renderMarkdown('# Hello World');
    assert.ok(!result.includes('# '), `Expected no raw "# " but got: ${result}`);
  });

  it('should render bold text', () => {
    const result = renderMarkdown('This is **bold** text.');
    assert.ok(!result.includes('**'), `Expected no raw "**" but got: ${result}`);
  });

  it('should render inline code', () => {
    const result = renderMarkdown('Use `npm install` to install.');
    assert.ok(!result.includes('`npm'), `Expected no raw backticks but got: ${result}`);
  });

  it('should render lists without raw dashes', () => {
    const result = renderMarkdown('- item one\n- item two');
    assert.ok(!result.startsWith('- '), `Expected no raw "- " but got: ${result}`);
  });

  it('should pass through plain text unchanged', () => {
    const result = renderMarkdown('Just plain text no markdown.');
    assert.strictEqual(result, 'Just plain text no markdown.');
  });

  it('should handle empty input', () => {
    assert.strictEqual(renderMarkdown(''), '');
  });

  it('should not crash on malformed markdown', () => {
    const result = renderMarkdown('```\nunclosed code block');
    assert.ok(typeof result === 'string');
  });
});
