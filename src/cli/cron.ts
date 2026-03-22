export interface CronJob {
  id: number;
  intervalMs: number;
  prompt: string;
}

interface InternalJob extends CronJob {
  timer: ReturnType<typeof setInterval>;
}

/**
 * Parse a duration string like "5m", "30s", "2h" into milliseconds.
 * Returns null if the input is invalid.
 */
export function parseDuration(input: string): number | null {
  const match = input.match(/^(\d+)([smh])$/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  if (value <= 0) return null;

  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
  };

  return value * multipliers[unit];
}

export class CronManager {
  private jobs: InternalJob[] = [];
  private nextId = 1;

  add(intervalMs: number, prompt: string, callback: () => Promise<void>): number {
    const id = this.nextId++;
    const timer = setInterval(() => {
      callback().catch(() => {
        // Swallow errors from cron callbacks
      });
    }, intervalMs);

    this.jobs.push({ id, intervalMs, prompt, timer });
    return id;
  }

  list(): CronJob[] {
    return this.jobs.map(({ id, intervalMs, prompt }) => ({ id, intervalMs, prompt }));
  }

  stop(id: number): boolean {
    const index = this.jobs.findIndex((j) => j.id === id);
    if (index === -1) return false;

    clearInterval(this.jobs[index].timer);
    this.jobs.splice(index, 1);
    return true;
  }

  stopAll(): void {
    for (const job of this.jobs) {
      clearInterval(job.timer);
    }
    this.jobs = [];
  }
}
