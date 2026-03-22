import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from './args.js';

describe('parseArgs', () => {
  it('returns empty options for no arguments', () => {
    const args = parseArgs([]);
    assert.equal(args.print, undefined);
    assert.equal(args.continue, undefined);
    assert.equal(args.resume, undefined);
    assert.equal(args.model, undefined);
    assert.equal(args.verbose, undefined);
  });

  it('parses -p / --print flag', () => {
    const args = parseArgs(['-p', 'hello world']);
    assert.equal(args.print, 'hello world');
  });

  it('parses --print long form', () => {
    const args = parseArgs(['--print', 'summarize this']);
    assert.equal(args.print, 'summarize this');
  });

  it('parses -c / --continue flag', () => {
    const args = parseArgs(['-c']);
    assert.equal(args.continue, true);
  });

  it('parses --resume with session id', () => {
    const args = parseArgs(['--resume', 'abc-123']);
    assert.equal(args.resume, 'abc-123');
  });

  it('parses --model flag', () => {
    const args = parseArgs(['--model', 'gpt-4']);
    assert.equal(args.model, 'gpt-4');
  });

  it('parses --verbose flag', () => {
    const args = parseArgs(['--verbose']);
    assert.equal(args.verbose, true);
  });

  it('parses --allowedTools flag', () => {
    const args = parseArgs(['--allowedTools', 'Read,Bash,Glob']);
    assert.equal(args.allowedTools, 'Read,Bash,Glob');
  });

  it('parses --output-format flag', () => {
    const args = parseArgs(['--output-format', 'json']);
    assert.equal(args.outputFormat, 'json');
  });

  it('parses --output-format stream-json', () => {
    const args = parseArgs(['--output-format', 'stream-json']);
    assert.equal(args.outputFormat, 'stream-json');
  });

  it('parses --auto-approve flag', () => {
    const args = parseArgs(['--auto-approve']);
    assert.equal(args.autoApprove, true);
  });

  it('parses --worktree flag', () => {
    const args = parseArgs(['--worktree', 'feature-x']);
    assert.equal(args.worktree, 'feature-x');
  });

  it('parses multiple flags together', () => {
    const args = parseArgs(['-p', 'do stuff', '--model', 'llama', '--verbose', '--output-format', 'json']);
    assert.equal(args.print, 'do stuff');
    assert.equal(args.model, 'llama');
    assert.equal(args.verbose, true);
    assert.equal(args.outputFormat, 'json');
  });

  it('defaults outputFormat to text when not specified', () => {
    const args = parseArgs([]);
    assert.equal(args.outputFormat, undefined);
  });
});
