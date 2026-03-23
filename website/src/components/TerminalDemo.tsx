'use client';
import { useState, useEffect, useRef } from 'react';

interface DemoLine {
  type: 'prompt' | 'system' | 'tool' | 'diff-add' | 'diff-remove' | 'result' | 'text';
  text: string;
  delay: number;
  elapsed?: string;
}

const DEMO_LINES: DemoLine[] = [
  { type: 'prompt', text: '> fix the auth bug in login', delay: 0 },
  { type: 'system', text: 'Engaging debugging + security', delay: 800 },
  { type: 'tool', text: '● Read src/auth/login.ts (42 lines)', delay: 1400, elapsed: '0.2s' },
  { type: 'tool', text: '● Grep "token" → 12 matches', delay: 2000, elapsed: '0.3s' },
  { type: 'tool', text: '● Edit src/auth/login.ts', delay: 2600, elapsed: '0.1s' },
  { type: 'diff-add', text: '  + const token = await verifyJWT(req);', delay: 2900 },
  { type: 'diff-remove', text: '  - const token = req.headers.auth;', delay: 3100 },
  { type: 'tool', text: '● Bash npm test', delay: 3600, elapsed: '1.4s' },
  { type: 'result', text: '  42 passing, 0 failing', delay: 4200 },
  { type: 'text', text: 'Auth now validates JWT properly. Bug fixed.', delay: 4800 },
];

const STYLE_MAP: Record<string, string> = {
  prompt: 'text-[#00D4AA] font-bold',
  system: 'text-[#6B7280] italic',
  tool: 'text-[#D4D4D4]',
  'diff-add': 'text-[#2E9E50] bg-[#0a2e1a] px-1',
  'diff-remove': 'text-[#B03A3A] bg-[#2e0a0a] px-1',
  result: 'text-[#3AAF60]',
  text: 'text-[#D4D4D4]',
};

export default function TerminalDemo() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [cycle, setCycle] = useState(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear previous timeouts
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    setVisibleCount(0);

    DEMO_LINES.forEach((line, i) => {
      const t = setTimeout(() => setVisibleCount(i + 1), line.delay);
      timeoutsRef.current.push(t);
    });

    // Restart cycle
    const restart = setTimeout(() => {
      setCycle(c => c + 1);
    }, 8000);
    timeoutsRef.current.push(restart);

    return () => timeoutsRef.current.forEach(clearTimeout);
  }, [cycle]);

  return (
    <div className="bg-[#141414] border border-[#1e1e1e] p-6 font-mono text-sm leading-relaxed overflow-hidden">
      <div className="text-[#00D4AA] mb-4">◆ ArqZero v2.0.0</div>
      {DEMO_LINES.slice(0, visibleCount).map((line, i) => (
        <div
          key={`${cycle}-${i}`}
          className={`${STYLE_MAP[line.type]} mb-1 flex justify-between animate-fade-in-up`}
        >
          <span>
            {line.type === 'tool' && <span className="text-[#3AAF60]">●</span>}
            {line.type === 'tool' ? (
              <>
                {' '}<span className="text-[#4A7CF0]">{line.text.split(' ')[1]}</span>
                {' '}<span className="text-[#6B7280]">{line.text.split(' ').slice(2).join(' ')}</span>
              </>
            ) : line.text}
          </span>
          {line.elapsed && <span className="text-[#6B7280]">{line.elapsed}</span>}
        </div>
      ))}
      {visibleCount >= DEMO_LINES.length && (
        <div className="mt-3 text-[#00D4AA]">{'>'} <span className="animate-pulse">▌</span></div>
      )}
    </div>
  );
}
