import { useEngine } from '../context/EngineContext';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Route, Bed, Pill, UserX, Truck, RotateCcw, Bomb, Activity, MapPinned, Stethoscope, Clock, AlertTriangle
} from 'lucide-react';

const btnBase = "group relative flex h-[32px] w-full items-center gap-2 rounded-[4px] border bg-[#1A2029] px-2.5 font-mono text-[11px] font-medium uppercase tracking-wide transition-all active:scale-[0.97] overflow-hidden";
const btnIdle = "border-[#232A35] text-[#8B96A5] hover:border-[#313A48] hover:bg-[#212836] hover:text-[#E8ECF1]";
const btnCritical = "border-[#E5484D]/20 bg-[#E5484D]/10 text-[#E5484D] hover:bg-[#E5484D]/15 hover:border-[#E5484D]/30";

export function SimulationControls() {
  const { 
    generateEmergency, generateBurst, blockRandomRoad, reopenRandomRoad,
    fillRandomBeds, depleteRandomMedicine, occupyAmbulance, freeAmbulance,
    resetSimulation, state, setDoctorOffDuty
  } = useEngine();

  const [burstCount, setBurstCount] = useState(5);
  const [lastAction, setLastAction] = useState<{ label: string; at: number } | null>(null);

  const trigger = (label: string, fn: () => void) => {
    fn();
    setLastAction({ label, at: Date.now() });
  };

  return (
    <div className="flex h-full flex-col bg-[#12161D]">
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-[#232A35] bg-[#0A0E13] px-3">
        <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B96A5]">Controls</h2>
        <div className="flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-[#2FBF71] animate-pulse" />
          <span className="font-mono text-[9px] uppercase text-[#57616F]">Edge-case panel</span>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-2.5">
        {/* Last action toast - reactive feedback */}
        <AnimatePresence>
          {lastAction && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 rounded-[4px] border border-[#12A594]/20 bg-[#12A594]/10 px-2.5 py-1.5 font-mono text-[10px] text-[#12A594]">
                <Clock className="h-3 w-3 shrink-0" />
                <span className="truncate">{lastAction.label}</span>
                <span className="ml-auto tabular text-[9px] opacity-60">{new Date(lastAction.at).toLocaleTimeString()}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Patient Intake - most important, visual hierarchy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-widest text-[#57616F]">Patient Intake</div>
            <div className="font-mono text-[8px] tabular text-[#57616F]">{state.requests.length} total</div>
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'CRITICAL', label: 'Critical', icon: Zap, color: 'text-[#E5484D]', bg: 'bg-[#E5484D]/10', border: 'border-[#E5484D]/20' },
              { id: 'HIGH', label: 'High', icon: Activity, color: 'text-[#F76B15]', bg: 'bg-[#F76B15]/10', border: 'border-[#F76B15]/20' },
              { id: 'MEDIUM', label: 'Medium', icon: Stethoscope, color: 'text-[#F5B700]', bg: 'bg-[#F5B700]/10', border: 'border-[#F5B700]/20' },
              { id: 'LOW', label: 'Low', icon: MapPinned, color: 'text-[#6C7684]', bg: 'bg-[#1A2029]', border: 'border-[#232A35]' },
            ].map(btn => (
              <button
                key={btn.id}
                className={`${btnBase} ${btn.border} ${btn.bg} ${btn.color} hover:brightness-110`}
                onClick={() => trigger(`Generate ${btn.id} emergency`, () => generateEmergency(btn.id as any))}
              >
                <btn.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{btn.label}</span>
                <span className="ml-auto text-[9px] opacity-60">↗</span>
              </button>
            ))}
          </div>

          <div className="rounded-[4px] border border-[#232A35] bg-[#0A0E13] p-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#57616F]">Concurrent Burst</span>
              <span className="font-mono text-[8px] tabular text-[#57616F]">stress-tests atomic lock</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-[4px] border border-[#232A35] bg-[#1A2029] px-1.5">
                <span className="font-mono text-[9px] text-[#57616F]">x</span>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={burstCount}
                  onChange={(e) => setBurstCount(parseInt(e.target.value) || 5)}
                  className="h-[28px] w-[36px] bg-transparent font-mono text-[11px] tabular text-[#E8ECF1] outline-none"
                />
              </div>
              <button
                className={`${btnBase} flex-1 ${btnIdle}`}
                onClick={() => trigger(`Burst x${burstCount} (same tick)`, () => generateBurst(burstCount))}
              >
                <Bomb className="h-3.5 w-3.5" /> Burst x{burstCount}
              </button>
            </div>
          </div>
        </div>

        {/* Roads */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#57616F] flex items-center gap-1.5">
            Road Network <span className="text-[8px] tabular opacity-60">{state.graph.getAllEdges().filter(e=>e.status==='closed').length} closed</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button className={`${btnBase} ${btnIdle}`} onClick={() => trigger('Block random road', blockRandomRoad)}>
              <Route className="h-3.5 w-3.5 text-[#4B5563]" /> Block
            </button>
            <button className={`${btnBase} ${btnIdle}`} onClick={() => trigger('Reopen random road', reopenRandomRoad)}>
              <Route className="h-3.5 w-3.5 text-[#2FBF71]" /> Reopen
            </button>
          </div>
        </div>

        {/* Facility Constraints */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#57616F]">Facility Constraints</div>
          <div className="space-y-1.5">
            <button className={`${btnBase} ${btnIdle}`} onClick={() => trigger('Fill beds @ random hospital', fillRandomBeds)}>
              <Bed className="h-3.5 w-3.5" /> Fill Beds
              <span className="ml-auto text-[9px] tabular opacity-50">{state.hospitals.reduce((s,h)=>s+h.bedsAvailable,0)} free</span>
            </button>
            <button className={`${btnBase} ${btnIdle}`} onClick={() => trigger('Deplete medicine', depleteRandomMedicine)}>
              <Pill className="h-3.5 w-3.5" /> Deplete Medicine
            </button>
            
            <div className="rounded-[4px] border border-[#232A35] bg-[#0A0E13] p-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[9px] uppercase tracking-widest text-[#57616F]">Doctor Off-Duty</span>
                <AlertTriangle className="h-3 w-3 text-[#F5B700]" />
              </div>
              <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                {state.hospitals.slice(0, 4).map(h => (
                  <div key={h.id} className="group flex items-center justify-between rounded-[3px] px-1.5 py-1 hover:bg-[#1A2029]">
                    <span className="truncate font-mono text-[10px] text-[#8B96A5] max-w-[110px]">{h.name.replace('RuralCare ', '').slice(0,18)}</span>
                    <div className="flex gap-1 shrink-0">
                      {h.specialists.slice(0, 2).map(s => (
                        <button
                          key={s}
                          onClick={() => trigger(`${s} OFF @ ${h.name.slice(0,12)}`, () => setDoctorOffDuty(h.id, s))}
                          className="rounded-[3px] border border-[#232A35] bg-[#1A2029] px-1 py-0.5 font-mono text-[8px] uppercase text-[#57616F] hover:border-[#E5484D]/30 hover:text-[#E5484D] hover:bg-[#E5484D]/10"
                        >
                          {s.slice(0,3)} ✕
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Fleet */}
        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#57616F] flex items-center gap-1.5">
            Fleet <span className="text-[8px] tabular opacity-60">{state.ambulances.filter(a=>a.status==='AVAILABLE').length}/{state.ambulances.length} avail</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button className={`${btnBase} ${btnIdle}`} onClick={() => trigger('Occupy ambulance', occupyAmbulance)}>
              <Truck className="h-3.5 w-3.5" /> Occupy
            </button>
            <button className={`${btnBase} border-[#2FBF71]/20 bg-[#2FBF71]/10 text-[#2FBF71] hover:bg-[#2FBF71]/15`} onClick={() => trigger('Free ambulance', freeAmbulance)}>
              <Truck className="h-3.5 w-3.5" /> Free
            </button>
          </div>
        </div>

        {/* Queue - live reactive */}
        <div className="rounded-[4px] border border-[#232A35] bg-[#0A0E13] p-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#57616F]">Live Queue</span>
            <span className={`h-1.5 w-1.5 rounded-full ${state.queue.length > 0 ? 'bg-[#F76B15] animate-pulse' : 'bg-[#2FBF71]'}`} />
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[10px] tabular">
            <div className="text-center">
              <div className="text-[9px] uppercase text-[#57616F]">Queued</div>
              <motion.div key={state.queue.length} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className="text-[14px] font-medium text-[#E8ECF1]">{state.queue.length}</motion.div>
            </div>
            <div className="text-center border-x border-[#1A2029]">
              <div className="text-[9px] uppercase text-[#57616F]">Active</div>
              <div className="text-[14px] font-medium text-[#F76B15]">{state.requests.filter(r => r.status !== 'COMPLETED').length}</div>
            </div>
            <div className="text-center">
              <div className="text-[9px] uppercase text-[#57616F]">Done</div>
              <div className="text-[14px] font-medium text-[#2FBF71]">{state.requests.filter(r => r.status === 'COMPLETED').length}</div>
            </div>
          </div>
          {state.queue.length > 0 && (
            <div className="mt-2 space-y-1">
              {state.queue.slice(0, 2).map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-[3px] bg-[#1A2029] px-1.5 py-1 font-mono text-[9px]">
                  <span className="tabular text-[#8B96A5]">{r.id.slice(0,6)}</span>
                  <span className={`px-1 py-0.5 rounded-[2px] text-[8px] uppercase border ${r.urgency === 'CRITICAL' ? 'border-[#E5484D]/20 bg-[#E5484D]/10 text-[#E5484D]' : 'border-[#232A35] text-[#57616F]'}`}>{r.urgency}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-[#232A35] bg-[#0A0E13] p-2.5">
        <button
          onClick={() => trigger('Reset simulation', resetSimulation)}
          className="group flex h-[30px] w-full items-center justify-center gap-2 rounded-[4px] border border-[#232A35] bg-[#1A2029] font-mono text-[10px] font-medium uppercase tracking-wide text-[#57616F] hover:border-[#313A48] hover:text-[#E8ECF1] hover:bg-[#212836]"
        >
          <RotateCcw className="h-3 w-3 transition-transform group-hover:rotate-180 duration-500" /> Reset Simulation
        </button>
        <div className="mt-1.5 text-center font-mono text-[8px] tabular text-[#57616F]">All edge-case controls independently triggerable · any order · no reload</div>
      </div>
    </div>
  );
}
