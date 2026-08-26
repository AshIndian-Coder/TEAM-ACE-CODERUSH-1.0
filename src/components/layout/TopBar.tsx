import { useState, useEffect } from 'react';
import { Search, Bell, Volume2, VolumeX, Clock, Cpu, Activity, Command, HeartPulse } from 'lucide-react';
import { useEngine } from '../../context/EngineContext';
import { isMuted, setMuted } from '../../lib/sound';
import { motion } from 'framer-motion';

export function TopBar({ onCommandOpen }: { onCommandOpen: () => void }) {
  const { state } = useEngine();
  const [now, setNow] = useState(new Date());
  const [muted, setMutedState] = useState(isMuted());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const toggleMute = () => {
    const m = !isMuted();
    setMuted(m);
    setMutedState(m);
  };

  const activeCount = state.requests.filter(r => r.status !== 'COMPLETED').length;
  const criticalCount = state.requests.filter(r => r.urgency === 'CRITICAL' && r.status !== 'COMPLETED').length;

  return (
    <div className="relative flex h-[64px] shrink-0 items-center justify-between border-b-2 border-[#B8D0E6] bg-white px-4 shadow-[0_2px_8px_rgba(1,45,97,0.08)]">
      <div className="absolute inset-0 bg-gradient-to-r from-[#E0F0F6] via-white to-[#F0F7FF] pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#012D61] via-[#2582A1] to-[#0FC5C6] pointer-events-none" />

      <div className="relative flex items-center gap-3 flex-1 max-w-[640px]">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A8AB0] group-focus-within:text-[#2582A1] transition-colors" />
          <input
            placeholder="Search hospitals, ambulances, patients, or press ⌘K..."
            onFocus={onCommandOpen}
            className="h-[42px] w-full rounded-[12px] border-2 border-[#B8D0E6] bg-[#F0F7FF] pl-10 pr-20 font-sans text-[13px] font-medium text-[#012D61] placeholder:text-[#5A8AB0] outline-none focus:border-[#2582A1] focus:bg-white focus:shadow-[0_0_0_4px_rgba(37,130,161,0.12)] transition-all"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1">
            <span className="flex items-center gap-1 rounded-[8px] border-2 border-[#B8D0E6] bg-white px-2.5 py-1 font-mono text-[11px] font-bold text-[#012D61] shadow-sm">
              <Command className="h-3 w-3" />K
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex items-center gap-2.5">
        <div className="hidden lg:flex items-center gap-0 rounded-[12px] border-2 border-[#B8D0E6] bg-[#F0F7FF] p-1 shadow-sm">
          <div className="flex items-center gap-2 rounded-[8px] bg-white border-2 border-[#B8D0E6] px-3 h-[36px] shadow-sm">
            <Clock className="h-4 w-4 text-[#2582A1]" />
            <span className="font-mono text-[12px] font-bold tabular text-[#012D61]">{now.toLocaleTimeString()} IST</span>
          </div>
          <div className="flex items-center gap-2 px-3 h-[36px] font-mono text-[12px] tabular">
            <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-2 w-2 rounded-full bg-[#028752] shadow-[0_0_6px_#028752]" />
            <span className="font-bold text-[#028752]">Live</span>
            <span className="text-[#5A8AB0]">·</span>
            <span className="font-bold text-[#012D61]">{activeCount} active</span>
            {criticalCount > 0 && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="ml-1 rounded-full bg-[#C41E3A] px-2 py-1 font-mono text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(196,30,58,0.3)] animate-pulse">
                {criticalCount} CRIT
              </motion.span>
            )}
          </div>
        </div>

        <motion.button whileHover={{ scale: 1.08, y: -1 }} whileTap={{ scale: 0.92 }} onClick={toggleMute} className="flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border-2 border-[#B8D0E6] bg-white text-[#5A8AB0] shadow-[0_2px_6px_rgba(1,45,97,0.08)] hover:bg-[#F0F7FF] hover:text-[#012D61] hover:border-[#2582A1] hover:shadow-[0_4px_12px_rgba(1,45,97,0.12)] transition-all">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </motion.button>

        <motion.button whileHover={{ scale: 1.08, y: -1 }} whileTap={{ scale: 0.92 }} className="relative flex h-[40px] w-[40px] items-center justify-center rounded-[12px] border-2 border-[#B8D0E6] bg-white text-[#5A8AB0] shadow-[0_2px_6px_rgba(1,45,97,0.08)] hover:bg-[#F0F7FF] hover:text-[#012D61] transition-all">
          <Bell className="h-4 w-4" />
          {criticalCount > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }} className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#C41E3A] text-[12px] font-bold text-white shadow-[0_3px_8px_rgba(196,30,58,0.4)] border-2 border-white">
              {criticalCount}
            </motion.span>
          )}
        </motion.button>

        <motion.div whileHover={{ scale: 1.03, y: -1 }} className="flex items-center gap-2.5 rounded-[12px] border-2 border-[#012D61] bg-[#012D61] px-3 py-2 shadow-[0_2px_8px_rgba(1,45,97,0.2)] hover:bg-[#0A3A7A] transition-all cursor-pointer">
          <div className="hidden md:block text-right leading-[1.1]">
            <div className="font-sans text-[13px] font-bold text-white">RuralCare Network</div>
            <div className="font-mono text-[11px] text-white/70">Maharashtra · {state.graph.nodeCount()}N {state.graph.edgeCount()}E</div>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white text-[#012D61] font-sans text-[12px] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
            <HeartPulse className="h-5 w-5" />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
