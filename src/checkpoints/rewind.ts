import fs from 'node:fs';
import type { Checkpoint, CheckpointStore } from './store.js';

export interface RewindResult {
  restoredFiles: string[];
  checkpointsRewound: number;
}

export function rewindToCheckpoint(
  store: CheckpointStore,
  targetId: number,
  options: { restoreCode?: boolean; restoreConversation?: boolean } = {
    restoreCode: true,
    restoreConversation: true,
  },
): RewindResult {
  const toRewind = store.getAfter(targetId);
  const result: RewindResult = {
    restoredFiles: [],
    checkpointsRewound: toRewind.length,
  };

  if (options.restoreCode !== false) {
    // Build a map of file -> earliest beforeContent in the rewind range
    const fileStates = new Map<string, string | null>();
    for (const cp of toRewind) {
      if (!fileStates.has(cp.filePath)) {
        fileStates.set(cp.filePath, cp.beforeContent);
      }
    }

    for (const [filePath, beforeContent] of fileStates) {
      if (beforeContent === null) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } else {
        fs.writeFileSync(filePath, beforeContent, 'utf-8');
      }
      result.restoredFiles.push(filePath);
    }
  }

  return result;
}

export function formatCheckpointList(checkpoints: Checkpoint[]): string {
  if (checkpoints.length === 0) {
    return 'No checkpoints in this session.';
  }
  return checkpoints
    .map((cp) => {
      const time = new Date(cp.timestamp).toLocaleTimeString();
      return `[${cp.id}] ${time} — ${cp.toolName} ${cp.filePath}`;
    })
    .join('\n');
}
