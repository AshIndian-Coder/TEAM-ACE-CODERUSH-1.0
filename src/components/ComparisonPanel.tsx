import { useEngine } from '../context/EngineContext';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, X, GitCompare } from 'lucide-react';

export function ComparisonPanel() {
  const { state, dispatch } = useEngine();

  if (!state.comparison) return null;

  const { naive, optimized } = state.comparison;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-1/2 z-[500] w-[min(960px,95vw)] -translate-x-1/2 overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
    >
      <div className="flex h-[48px] items-center justify-between border-b border-[#E2E8F0] bg-[#F8FAFC] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#0F172A] text-white">
            <GitCompare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-sans text-[13px] font-semibold text-[#0F172A]">Proof: Naive vs RouMi</h3>
            <p className="font-mono text-[10px] text-[#64748B] -mt-0.5">Side-by-side on same request · USP visible as fact</p>
          </div>
        </div>
        <button onClick={() => dispatch({ type: 'SET_COMPARISON', payload: null })} className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 divide-x divide-[#E2E8F0]">
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-[6px] border border-[#FECACA] bg-[#FEF2F2] px-2 py-1 font-mono text-[10px] font-medium uppercase text-[#DC2626]">Naive Nearest</span>
            <span className="font-mono text-[10px] text-[#94A3B8]">distance-only</span>
          </div>
          {naive.hospital ? (
            <>
              <div className="font-sans text-[13px] font-semibold text-[#0F172A]">{naive.hospital.name}</div>
              <div className="mt-1 font-mono text-[11px] tabular text-[#64748B]">{naive.distance.toFixed(1)}km straight-line</div>
              <div className="mt-3 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-3">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[#DC2626] mt-0.5" />
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-[#DC2626]">Violated: {naive.violatedConstraint || 'none (coincidental)'}</div>
                    <div className="mt-1 font-sans text-[12px] leading-[1.4] text-[#7F1D1D]">{naive.reason}</div>
                  </div>
                </div>
              </div>
            </>
          ) : <div className="font-mono text-[11px] text-[#64748B]">{naive.reason}</div>}
        </div>

        <div className="p-4 bg-[#F0FDF4]/50">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-[6px] border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-1 font-mono text-[10px] font-medium uppercase text-[#059669]">RouMi Optimized</span>
            <span className="font-mono text-[10px] text-[#64748B]">feasible + scored</span>
          </div>
          {optimized.success && optimized.selectedHospital ? (
            <>
              <div className="font-sans text-[13px] font-semibold text-[#0F172A]">{optimized.selectedHospital.name}</div>
              <div className="mt-1 font-mono text-[11px] tabular text-[#475569]">cost={optimized.scored[0]?.score.toFixed(3)} · travel={optimized.route?.totalCost.toFixed(1)}m · visited={optimized.route?.visitedNodes}</div>
              <div className="mt-3 rounded-[8px] border border-[#A7F3D0] bg-[#ECFDF5] p-3">
                <div className="flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#059669] mt-0.5" />
                  <div>
                    <div className="font-mono text-[11px] font-semibold text-[#065F46]">Feasible & Optimal</div>
                    <div className="mt-1 font-sans text-[12px] leading-[1.4] text-[#065F46]">Passed all hard constraints: specialist ✓ bed ✓ medicine ✓ reachability ✓. Selected via α=0.6 travel + β=0.4 wait. {optimized.evaluated.filter(e => !e.passed).length} hospitals correctly rejected.</div>
                  </div>
                </div>
              </div>
            </>
          ) : <div className="font-mono text-[11px] text-[#64748B]">{optimized.reason || 'No feasible hospital'}</div>}
        </div>
      </div>

      <div className="border-t border-[#E2E8F0] bg-[#0F172A] px-4 py-2.5">
        <div className="font-mono text-[11px] leading-[1.4] text-[#94A3B8]">USP: <span className="text-white font-medium">We don't route to nearest hospital — we route to nearest hospital actually capable of treating them, and we keep re-routing the moment that stops being true.</span></div>
      </div>
    </motion.div>
  );
}
