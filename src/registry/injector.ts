import type { MatchResult } from './matcher.js';

export function buildCapabilityContext(matches: MatchResult[]): string {
  if (matches.length === 0) return '';

  const parts: string[] = ['\n## Active Capabilities'];

  // Group by category
  const methodologies = matches.filter(m => m.capability.category === 'methodology');
  const architectures = matches.filter(m => m.capability.category === 'architecture');
  const domains = matches.filter(m => m.capability.category === 'domain');
  const guardrails = matches.filter(m => m.capability.category === 'guardrail');
  const orchestrations = matches.filter(m => m.capability.category === 'orchestration');
  const tools = matches.filter(m => m.capability.category === 'tool');

  // Render each section
  if (methodologies.length > 0) {
    parts.push('\n### Workflow');
    for (const m of methodologies) {
      parts.push(`\n**${m.capability.name}**`);
      if (m.capability.systemPromptAddition) parts.push(m.capability.systemPromptAddition);
    }
  }

  if (architectures.length > 0) {
    parts.push('\n### Architecture Constraints');
    for (const m of architectures) {
      parts.push(`\n**${m.capability.name}**: ${m.capability.description}`);
      if (m.capability.systemPromptAddition) parts.push(m.capability.systemPromptAddition);
    }
  }

  if (domains.length > 0) {
    parts.push('\n### Technology Context');
    for (const m of domains) {
      const toolHint = m.capability.suggestedTools?.length ? ` (tools: ${m.capability.suggestedTools.join(', ')})` : '';
      parts.push(`- **${m.capability.name}**${toolHint}`);
    }
  }

  if (guardrails.length > 0) {
    parts.push('\n### Guardrails');
    for (const m of guardrails) {
      parts.push(`\n**${m.capability.name}**: ${m.capability.description}`);
      if (m.capability.systemPromptAddition) parts.push(m.capability.systemPromptAddition);
    }
  }

  // Dispatch hints from orchestration
  if (orchestrations.length > 0) {
    parts.push('\n### Parallelization');
    for (const m of orchestrations) {
      if (m.capability.dispatchHint) {
        parts.push(`\nWHEN: ${m.capability.dispatchHint.when}`);
        parts.push('USE Dispatch to run in parallel:');
        m.capability.dispatchHint.tasks.forEach((t, i) => parts.push(`${i + 1}. ${t}`));
      }
    }
  }

  // Tool hints
  if (tools.length > 0) {
    const allTools = [...new Set(tools.flatMap(t => t.capability.suggestedTools ?? []))];
    if (allTools.length > 0) {
      parts.push(`\n### Suggested Tools: ${allTools.join(', ')}`);
    }
  }

  // Verification gates — ALWAYS LAST
  const gates = matches.filter(m => m.capability.verificationGate);
  if (gates.length > 0) {
    parts.push('\n### Verification Gates (MANDATORY)');
    parts.push('Before reporting completion, you MUST complete these steps:');
    for (const g of gates) {
      parts.push(`\n**${g.capability.name}**:`);
      g.capability.verificationGate!.steps.forEach((s, i) => parts.push(`${i + 1}. ${s}`));
      parts.push(`On failure: ${g.capability.verificationGate!.failAction === 'retry' ? 'fix and re-verify' : 'report failures explicitly'}`);
    }
    parts.push('\nDo NOT claim completion until all gates pass.');
  }

  return parts.join('\n');
}
