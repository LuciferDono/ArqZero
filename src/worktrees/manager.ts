import { spawnSync } from 'node:child_process';
import path from 'node:path';

export interface WorktreeInfo {
  name: string;
  path: string;
  branch: string;
}

export class WorktreeManager {
  constructor(private repoRoot: string) {}

  create(name: string): WorktreeInfo {
    if (this.exists(name)) {
      throw new Error(`Worktree '${name}' already exists`);
    }

    const wtPath = this.getPath(name);
    const branch = `arqzero/${name}`;

    const result = spawnSync('git', ['worktree', 'add', wtPath, '-b', branch], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      const msg = (result.stderr || result.stdout || 'unknown error').trim();
      throw new Error(`Failed to create worktree '${name}': ${msg}`);
    }

    return { name, path: wtPath, branch };
  }

  remove(name: string): void {
    if (!this.exists(name)) {
      throw new Error(`Worktree '${name}' does not exist`);
    }

    const wtPath = this.getPath(name);
    const branch = `arqzero/${name}`;

    const result = spawnSync('git', ['worktree', 'remove', wtPath, '--force'], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      const msg = (result.stderr || result.stdout || 'unknown error').trim();
      throw new Error(`Failed to remove worktree '${name}': ${msg}`);
    }

    // Clean up the branch
    spawnSync('git', ['branch', '-D', branch], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
    });
  }

  list(): WorktreeInfo[] {
    const result = spawnSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: this.repoRoot,
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      return [];
    }

    const output = result.stdout.trim();
    if (!output) return [];

    const worktrees: WorktreeInfo[] = [];
    const blocks = output.split('\n\n');

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      let wtPath = '';
      let branch = '';

      for (const line of lines) {
        if (line.startsWith('worktree ')) {
          wtPath = line.slice('worktree '.length);
        } else if (line.startsWith('branch ')) {
          branch = line.slice('branch '.length);
          // branch comes as refs/heads/xxx
          branch = branch.replace(/^refs\/heads\//, '');
        }
      }

      if (wtPath) {
        // Derive name from branch if it starts with arqzero/
        const name = branch.startsWith('arqzero/')
          ? branch.slice('arqzero/'.length)
          : path.basename(wtPath);

        worktrees.push({
          name,
          path: wtPath,
          branch,
        });
      }
    }

    return worktrees;
  }

  exists(name: string): boolean {
    const wtPath = path.resolve(this.getPath(name));
    return this.list().some(w => path.resolve(w.path) === wtPath);
  }

  getPath(name: string): string {
    return path.join(path.dirname(this.repoRoot), 'arqzero-worktrees', name);
  }
}
