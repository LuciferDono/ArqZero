import { z } from 'zod';

export const SkillManifestSchema = z.object({
  name: z.string(),
  description: z.string(),
  version: z.string(),
  command: z.string(),
  triggers: z.array(z.string()).min(1),
  prompt: z.string(),
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;

export interface LoadedSkill {
  manifest: SkillManifest;
  promptContent: string;
  directory: string;
}

export function parseManifest(jsonString: string): SkillManifest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('Invalid JSON in skill manifest');
  }

  const result = SkillManifestSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid skill manifest:\n${issues}`);
  }

  return result.data;
}
