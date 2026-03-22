import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { validateInput } from './validate.js';

describe('validateInput', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().optional(),
  });

  it('returns parsed data for valid input', () => {
    const result = validateInput({ name: 'Alice', age: 30 }, schema, 'TestTool');
    assert.deepStrictEqual(result, { name: 'Alice', age: 30 });
  });

  it('returns parsed data when optional fields are omitted', () => {
    const result = validateInput({ name: 'Bob' }, schema, 'TestTool');
    assert.deepStrictEqual(result, { name: 'Bob' });
  });

  it('throws on missing required field', () => {
    assert.throws(
      () => validateInput({}, schema, 'TestTool'),
      (err: Error) => {
        assert.match(err.message, /Invalid input for TestTool/);
        return true;
      },
    );
  });

  it('throws on wrong type', () => {
    assert.throws(
      () => validateInput({ name: 123 }, schema, 'TestTool'),
      (err: Error) => {
        assert.match(err.message, /Invalid input for TestTool/);
        return true;
      },
    );
  });

  it('includes field path in error message', () => {
    assert.throws(
      () => validateInput({ name: 123 }, schema, 'TestTool'),
      (err: Error) => {
        assert.match(err.message, /name/);
        return true;
      },
    );
  });
});
