import { useEngine } from '../context/EngineContext';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Terminal } from 'lucide-react';

export function DecisionLogPanel() {
  const { state } = useEngine();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs]);

  const filteredLogs = filter === 'all' ? state.logs : state.logs.filter(l => l.type.includes(filter.toUpperCase()) || l.level === filter);

  const getBorder = (level: string, type: string) => {
    if (type === 'HOSPITAL_REJECTED') return 'border-l-[#E5484D]/50';
    if (type === 'HOSPITAL_SELECTED' || type === 'RE_SELECTED') return 'border-l-[#12A594]';
    if (level === 'error') return 'border-l-[#E5484D]';
    if (level === 'success') return 'border-l-[#2FBF71]/50';
    if (level === 'warn') return 'border-l-[#F76B15]/50';
    return 'border-l-[#232A35]';
  };

  const getBg = (type: string) => {
    if (type === 'HOSPITAL_SELECTED') return 'bg-[#12A594]/[0.06]';
    if (type === 'REROUTE_TRIGGERED') return 'bg-[#E5484D]/[0.06]';
    if (type === 'DISPATCHED') return 'bg-[#212836]';
    return '';
  };

  return (
    <div className="flex h-full flex-col bg-[#0D1117]">
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-[#232A35] bg-[#0A0E13] px-2.5">
        <div className="flex items-center gap-1.5">
          <Terminal className="h-3 w-3 text-[#57616F]" />
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B96A5]">Decision Log</h2>
          <span className="rounded-[3px] bg-[#1A2029] border border-[#232A35] px-1 py-0.5 font-mono text-[9px] tabular text-[#57616F]">{state.logs.length}</span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'rejected', label: 'Rej' },
            { id: 'selected', label: 'Sel' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-[3px] border px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide ${filter === f.id ? 'border-[#12A594]/30 bg-[#12A594]/10 text-[#12A594]' : 'border-[#232A35] bg-[#12161D] text-[#57616F] hover:text-[#8B96A5]'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-1.5 font-mono text-[11px] leading-[1.45] scrollbar-thin"
        aria-live="polite"
      >
        {state.logs.length === 0 && (
          <div className="py-8 text-center">
            <div className="mx-auto w-fit rounded-[4px] border border-dashed border-[#232A35] bg-[#12161D] px-3 py-2">
              <div className="font-mono text-[11px] text-[#57616F]">No decisions yet</div>
              <div className="mt-1 font-mono text-[10px] text-[#313A48]">Generate emergency to see real algorithm output</div>
              <div className="mt-2 font-mono text-[9px] tabular text-[#57616F]">Every line from engine output · never hardcoded</div>
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {filteredLogs.slice(-80).map((entry, idx) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: (idx % 3) * 0.02 }}
              className={`group relative mb-1 rounded-[3px] border border-transparent border-l-2 pl-2.5 pr-2 py-1.5 hover:border-[#232A35] hover:bg-[#12161D] ${getBorder(entry.level, entry.type)} ${getBg(entry.type)}`}
            >
              <div className="flex gap-2">
                <span className="shrink-0 font-mono text-[9px] tabular text-[#57616F] leading-[1.6]">
                  {new Date(entry.timestamp).toISOString().slice(11, 19)}<span className="opacity-50">.{String(entry.timestamp % 1000).padStart(3, '0')}</span>
                </span>
                <span className={`break-all leading-[1.4] ${
                  entry.type === 'HOSPITAL_REJECTED' ? 'text-[#57616F]' :
                  entry.type === 'HOSPITAL_SELECTED' || entry.type === 'RE_SELECTED' || entry.type === 'DISPATCHED' ? 'text-[#E8ECF1] font-medium' :
                  entry.level === 'error' ? 'text-[#E5484D]' :
                  entry.level === 'success' ? 'text-[#8B96A5]' :
                  'text-[#8B96A5]'
                }`}>
                  {entry.message}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-[8px] tabular text-[#313A48]">
                <span className={`rounded-[2px] border px-1 py-0.5 leading-none ${
                  entry.type === 'HOSPITAL_REJECTED' ? 'border-[#E5484D]/20 bg-[#E5484D]/10 text-[#E5484D]/70' :
                  entry.type === 'HOSPITAL_SELECTED' ? 'border-[#12A594]/20 bg-[#12A594]/10 text-[#12A594]' :
                  'border-[#1A2029] bg-[#0A0E13] text-[#57616F]'
                }`}>{entry.type}</span>
                <span>·</span>
                <span className="truncate max-w-[80px]">{entry.requestId.slice(0,10)}</span>
                <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">#{filteredLogs.length - filteredLogs.indexOf(entry)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex h-[22px] shrink-0 items-center justify-between border-t border-[#232A35] bg-[#0A0E13] px-2.5">
        <span className="font-mono text-[8px] uppercase tracking-widest text-[#313A48]">Generated from real engine output only · never hardcoded</span>
        <span className="font-mono text-[8px] tabular text-[#57616F]">{filteredLogs.length} entries</span>
      </div>
    </div>
  );
}
