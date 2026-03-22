import type { ZodSchema } from 'zod';

export function validateInput<T>(input: unknown, schema: ZodSchema<T>, toolName: string): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid input for ${toolName}: ${issues}`);
  }
  return result.data;
}
