import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEngine } from '../../context/EngineContext';
import { 
  Zap, Route, Bed, Pill, Truck, RotateCcw, Bomb, Activity, 
  MapPinned, Stethoscope, ChevronRight, Pin, PinOff, Settings2
} from 'lucide-react';

export function OperationsBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const { generateEmergency, generateBurst, blockRandomRoad, reopenRandomRoad, fillRandomBeds, depleteRandomMedicine, occupyAmbulance, freeAmbulance, resetSimulation, state } = useEngine();

  const trigger = (label: string, fn: () => void) => {
    fn();
    setLastAction(label);
    setTimeout(() => setLastAction(null), 2000);
  };

  return (
    <>
      {/* Trigger tab - always visible at left edge */}
      <motion.div
        initial={{ x: -8, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="fixed left-0 top-1/2 z-[45] -translate-y-1/2"
      >
        <motion.button
          whileHover={{ x: 4, scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onMouseEnter={() => !isPinned && setIsOpen(true)}
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-[88px] w-[28px] flex-col items-center justify-center gap-1 rounded-r-[10px] border-y border-r border-[#2582A1]/20 bg-[#012D61] shadow-[2px_0_8px_rgba(1,45,97,0.15)] hover:bg-[#0A3A7A] transition-colors group"
        >
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            <ChevronRight className="h-4 w-4 text-white" />
          </motion.div>
          <span className="font-mono text-[8px] font-bold uppercase tracking-widest text-[#0FC5C6] [writing-mode:vertical-lr]">OPS</span>
          <div className="h-1 w-1 rounded-full bg-[#0FC5C6] animate-pulse" />
        </motion.button>
      </motion.div>

      {/* Backdrop */}
      <AnimatePresence>
        {(isOpen || isPinned) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isPinned && setIsOpen(false)}
            className="fixed inset-0 z-[44] bg-[#012D61]/10 backdrop-blur-[1px]"
          />
        )}
      </AnimatePresence>

      {/* Sliding panel - Figma style */}
      <motion.div
        initial={false}
        animate={{ 
          x: (isOpen || isPinned) ? 0 : -320,
          boxShadow: (isOpen || isPinned) ? '4px 0 24px rgba(1,45,97,0.12), 1px 0 0 #D6E0EB' : '0 0 0 transparent'
        }}
        transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => !isPinned && setIsOpen(false)}
        className="fixed left-0 top-0 z-[46] flex h-full w-[320px] flex-col border-r border-[#D6E0EB] bg-white"
      >
        {/* Header with pin */}
        <div className="flex h-[60px] items-center justify-between border-b border-[#D6E0EB] bg-gradient-to-r from-[#012D61] to-[#0A3A7A] px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white shadow-sm">
              <Settings2 className="h-4 w-4 text-[#012D61]" />
            </div>
            <div>
              <div className="font-sans text-[13px] font-bold tracking-tight text-white">Operations</div>
              <div className="font-mono text-[10px] text-white/60">Simulation Controls</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPinned(!isPinned)}
              className={`flex h-7 w-7 items-center justify-center rounded-[8px] border transition-colors ${isPinned ? 'bg-[#0FC5C6] border-[#0FC5C6] text-[#012D61]' : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/15 hover:text-white'}`}
            >
              {isPinned ? <Pin className="h-3.5 w-3.5" /> : <PinOff className="h-3.5 w-3.5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/10 border border-white/20 text-white/70 hover:bg-white/15 hover:text-white"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </motion.button>
          </div>
        </div>

        {/* Last action */}
        <AnimatePresence>
          {lastAction && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="border-b border-[#D6E0EB] bg-[#E0F0F6] px-4 py-2"
            >
              <div className="flex items-center gap-2 font-mono text-[11px] text-[#1A5F7A]">
                <div className="h-1.5 w-1.5 rounded-full bg-[#2582A1] animate-pulse" />
                {lastAction} · {new Date().toLocaleTimeString()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <div className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#7A9AB8] mb-2.5 flex items-center gap-2">
              Patient Intake <span className="h-px flex-1 bg-[#D6E0EB]" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'CRITICAL', label: 'Critical', icon: Zap, color: 'bg-[#C41E3A] text-white border-[#C41E3A] shadow-[0_2px_6px_rgba(196,30,58,0.2)]' },
                { id: 'HIGH', label: 'High', icon: Activity, color: 'bg-[#E67E22] text-white border-[#E67E22]' },
                { id: 'MEDIUM', label: 'Medium', icon: Stethoscope, color: 'bg-white text-[#2C4A6B] border-[#D6E0EB] hover:border-[#9AB1CB]' },
                { id: 'LOW', label: 'Low', icon: MapPinned, color: 'bg-white text-[#7A9AB8] border-[#D6E0EB]' },
              ].map(btn => (
                <motion.button
                  key={btn.id}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => trigger(`Generated ${btn.id}`, () => generateEmergency(btn.id as any))}
                  className={`flex h-[40px] items-center gap-2 rounded-[10px] border px-3 font-sans text-[12px] font-semibold tracking-tight transition-all ${btn.color}`}
                >
                  <btn.icon className="h-4 w-4" /> {btn.label}
                </motion.button>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => trigger(`Burst x5`, () => generateBurst(5))}
              className="mt-2 flex h-[36px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#012D61] bg-[#012D61] font-sans text-[12px] font-medium text-white shadow-[0_2px_8px_rgba(1,45,97,0.15)] hover:bg-[#0A3A7A]"
            >
              <Bomb className="h-4 w-4" /> Concurrent Burst x5
            </motion.button>
          </div>

          <div>
            <div className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#7A9AB8] mb-2.5">Road Network</div>
            <div className="grid grid-cols-2 gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => trigger('Blocked road', blockRandomRoad)} className="flex h-[36px] items-center justify-center gap-1.5 rounded-[10px] border border-[#D6E0EB] bg-white font-sans text-[12px] font-medium text-[#2C4A6B] shadow-sm hover:border-[#9AB1CB] hover:bg-[#F0F6FB]"><Route className="h-4 w-4" /> Block</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => trigger('Reopened road', reopenRandomRoad)} className="flex h-[36px] items-center justify-center gap-1.5 rounded-[10px] border border-[#A7D8B8] bg-[#E6F4EA] font-sans text-[12px] font-medium text-[#028752]"><Route className="h-4 w-4" /> Reopen</motion.button>
            </div>
          </div>

          <div>
            <div className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#7A9AB8] mb-2.5">Facility Stress</div>
            <div className="space-y-2">
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => trigger('Filled beds', fillRandomBeds)} className="flex h-[36px] w-full items-center gap-2 rounded-[10px] border border-[#D6E0EB] bg-white px-3 font-sans text-[12px] font-medium text-[#2C4A6B] shadow-sm hover:bg-[#F0F6FB]"><Bed className="h-4 w-4" /> Fill Beds · {state.hospitals.reduce((s,h)=>s+h.bedsAvailable,0)} free</motion.button>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => trigger('Depleted medicine', depleteRandomMedicine)} className="flex h-[36px] w-full items-center gap-2 rounded-[10px] border border-[#D6E0EB] bg-white px-3 font-sans text-[12px] font-medium text-[#2C4A6B] shadow-sm hover:bg-[#F0F6FB]"><Pill className="h-4 w-4" /> Deplete Medicine</motion.button>
            </div>
          </div>

          <div>
            <div className="font-sans text-[11px] font-bold uppercase tracking-widest text-[#7A9AB8] mb-2.5">Fleet</div>
            <div className="grid grid-cols-2 gap-2">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => trigger('Occupied AMB', occupyAmbulance)} className="flex h-[36px] items-center justify-center gap-1.5 rounded-[10px] border border-[#D6E0EB] bg-white font-sans text-[12px] font-medium text-[#2C4A6B] shadow-sm"><Truck className="h-4 w-4" /> Occupy</motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => trigger('Freed AMB', freeAmbulance)} className="flex h-[36px] items-center justify-center gap-1.5 rounded-[10px] border border-[#A7D8B8] bg-[#E6F4EA] font-sans text-[12px] font-medium text-[#028752]"><Truck className="h-4 w-4" /> Free</motion.button>
            </div>
          </div>

          <div className="rounded-[10px] border border-[#D6E0EB] bg-[#F5F7FA] p-3">
            <div className="font-sans text-[11px] font-bold uppercase tracking-wide text-[#7A9AB8]">Live Queue</div>
            <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[11px] tabular">
              <div className="text-center"><div className="text-[10px] uppercase text-[#7A9AB8]">Queued</div><div className="text-[16px] font-bold text-[#012D61]">{state.queue.length}</div></div>
              <div className="text-center border-x border-[#D6E0EB]"><div className="text-[10px] uppercase text-[#7A9AB8]">Active</div><div className="text-[16px] font-bold text-[#E67E22]">{state.requests.filter(r=>r.status!=='COMPLETED').length}</div></div>
              <div className="text-center"><div className="text-[10px] uppercase text-[#7A9AB8]">Done</div><div className="text-[16px] font-bold text-[#028752]">{state.requests.filter(r=>r.status==='COMPLETED').length}</div></div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D6E0EB] p-3 bg-[#F5F7FA]">
          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => trigger('Reset simulation', resetSimulation)} className="flex h-[36px] w-full items-center justify-center gap-2 rounded-[10px] border border-[#D6E0EB] bg-white font-sans text-[12px] font-medium text-[#2C4A6B] shadow-sm hover:bg-[#F0F6FB]"><RotateCcw className="h-4 w-4" /> Reset Simulation</motion.button>
        </div>
      </motion.div>
    </>
  );
}
