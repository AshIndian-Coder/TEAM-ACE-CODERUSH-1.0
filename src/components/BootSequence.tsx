import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LINES = [
  'Loading rural network · 30 nodes / 42 edges indexed · O((V+E) log V)',
  'Indexing 8 hospitals · 6 ambulances · 8 specialties · medicines stock',
  'Warming A* heuristic · Euclidean admissible check OK · BinaryHeap ready',
  'RouMi v1.0 · Engine ready · Atomic reservation enabled · Live GPS tracking',
];

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (skipped) {
      onDone();
      return;
    }
    if (visibleLines >= LINES.length) {
      const t = setTimeout(onDone, 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 280);
    return () => clearTimeout(t);
  }, [visibleLines, skipped, onDone]);

  useEffect(() => {
    const handler = () => setSkipped(true);
    window.addEventListener('keydown', handler);
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('click', handler);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-[100] flex items-center justify-center bg-[#F8FAFC]/90 backdrop-blur-[2px]"
    >
      <div className="w-[600px] overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.12)]">
        <div className="flex h-[40px] items-center gap-3 border-b border-[#E2E8F0] bg-[#F8FAFC] px-4">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#E2E8F0]" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-[#059669]" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-[#475569]">RouMi Boot Sequence</span>
          </div>
          <span className="ml-auto font-mono text-[10px] text-[#94A3B8]">Press any key to skip</span>
        </div>
        <div className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0E9F6E] text-white font-mono text-[12px] font-bold">R</div>
            <div>
              <div className="font-sans text-[14px] font-semibold text-[#0F172A]">RouMi · RuralCare Route</div>
              <div className="font-mono text-[11px] text-[#64748B]">Operations Console · Algorithm-first · Production-grade</div>
            </div>
          </div>
          <div className="space-y-2.5 font-mono text-[12px] leading-[1.5]">
            {LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex gap-3"
              >
                <span className="shrink-0 tabular text-[11px] text-[#94A3B8]">[{new Date().toISOString().slice(11, 19)}]</span>
                <span className={i === LINES.length - 1 ? 'text-[#059669] font-medium' : 'text-[#334155]'}>{line}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-[#F1F5F9]">
            <motion.div
              className="h-full bg-[#0E9F6E]"
              initial={{ width: '0%' }}
              animate={{ width: `${(visibleLines / LINES.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="mt-3 flex justify-between font-mono text-[10px] tabular text-[#94A3B8]">
            <span>Engine: O((V+E) log V) · Atomic reservation · Live GPS</span>
            <span>{visibleLines}/{LINES.length}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
