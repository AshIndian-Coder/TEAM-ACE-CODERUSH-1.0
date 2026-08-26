import { useEngine } from '../context/EngineContext';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle2, XCircle, Zap, Clock, Cpu, GitCompare } from 'lucide-react';

export function BenchmarkPanel() {
  const { state, runBenchmark } = useEngine();
  const [size, setSize] = useState<number>(1000);

  return (
    <div className="overflow-hidden rounded-[6px] border border-[#313A48] bg-[#12161D] shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <div className="flex h-[36px] items-center justify-between border-b border-[#232A35] bg-[#0A0E13] px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-[#12A594]/15 border border-[#12A594]/20">
            <Zap className="h-3 w-3 text-[#12A594]" />
          </div>
          <div>
            <div className="font-mono text-[11px] font-medium text-[#E8ECF1]">Algorithm Proof</div>
            <div className="font-mono text-[8px] uppercase tracking-wide text-[#57616F] -mt-0.5">A* vs Dijkstra live</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-[#2FBF71] animate-pulse" />
          <span className="font-mono text-[9px] uppercase text-[#57616F]">Live</span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-[4px] border border-[#232A35] bg-[#0A0E13] p-0.5">
            {[1000, 10000, 50000].map(s => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`rounded-[3px] px-2.5 py-1 font-mono text-[10px] tabular transition-all ${
                  size === s ? 'bg-[#212836] border border-[#313A48] text-[#E8ECF1] shadow-[0_1px_0_0_#232A35]' : 'text-[#57616F] hover:text-[#8B96A5]'
                }`}
              >
                {s >= 1000 ? `${s/1000}k` : s}
              </button>
            ))}
          </div>
          <span className="font-mono text-[9px] tabular text-[#57616F]">nodes · ~{Math.round(size*4)} edges · 50 pairs</span>
          <button
            onClick={() => runBenchmark(size)}
            disabled={state.isBenchmarking}
            className="ml-auto flex h-[26px] items-center gap-1 rounded-[4px] bg-[#12A594] px-2.5 font-mono text-[10px] font-medium text-white hover:bg-[#12A594]/90 disabled:opacity-50 active:scale-[0.97] shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]"
          >
            <Play className="h-3 w-3" /> {state.isBenchmarking ? 'Running...' : 'Run Proof'}
          </button>
        </div>

        {state.isBenchmarking && (
          <div className="rounded-[4px] border border-[#232A35] bg-[#0A0E13] p-2.5">
            <div className="flex items-center gap-2 font-mono text-[10px] text-[#8B96A5]">
              <div className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-[#232A35] border-t-[#12A594]" />
              Generating {size} nodes · Poisson-disc + kNN + Union-Find · 50 random O-D pairs...
            </div>
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#1A2029]">
              <motion.div className="h-full bg-[#12A594]" initial={{ width: '0%' }} animate={{ width: '70%' }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} />
            </div>
          </div>
        )}

        {state.benchmark && !state.isBenchmarking && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[4px] border border-[#232A35] bg-[#0A0E13] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wide text-[#12A594]">A* Production</span>
                  <span className="rounded-[2px] bg-[#12A594]/10 border border-[#12A594]/20 px-1 py-0.5 font-mono text-[8px] uppercase text-[#12A594]">Primary</span>
                </div>
                <div className="mt-1.5 font-mono text-[16px] font-medium tabular leading-none text-[#E8ECF1]">{state.benchmark.aStar.avgMs.toFixed(2)}<span className="text-[10px] text-[#57616F]">ms avg</span></div>
                <div className="mt-1 space-y-0.5 font-mono text-[9px] tabular text-[#57616F]">
                  <div className="flex justify-between"><span>p50</span><span className="text-[#8B96A5]">{state.benchmark.aStar.p50Ms.toFixed(2)}ms</span></div>
                  <div className="flex justify-between"><span>p95</span><span className="text-[#8B96A5]">{state.benchmark.aStar.p95Ms.toFixed(2)}ms</span></div>
                  <div className="flex justify-between"><span>visited</span><span className="text-[#8B96A5]">{state.benchmark.aStar.nodesVisitedAvg.toFixed(0)}</span></div>
                  <div className="flex justify-between"><span>req/s</span><span className="text-[#2FBF71]">{state.benchmark.aStar.requestsPerSecond.toFixed(0)}</span></div>
                </div>
              </div>
              <div className="rounded-[4px] border border-[#232A35] bg-[#0A0E13] p-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wide text-[#8B96A5]">Dijkstra Reference</span>
                  <span className="rounded-[2px] bg-[#1A2029] border border-[#232A35] px-1 py-0.5 font-mono text-[8px] uppercase text-[#57616F]">Oracle</span>
                </div>
                <div className="mt-1.5 font-mono text-[16px] font-medium tabular leading-none text-[#E8ECF1]">{state.benchmark.dijkstra.avgMs.toFixed(2)}<span className="text-[10px] text-[#57616F]">ms avg</span></div>
                <div className="mt-1 space-y-0.5 font-mono text-[9px] tabular text-[#57616F]">
                  <div className="flex justify-between"><span>p50</span><span className="text-[#8B96A5]">{state.benchmark.dijkstra.p50Ms.toFixed(2)}ms</span></div>
                  <div className="flex justify-between"><span>p95</span><span className="text-[#8B96A5]">{state.benchmark.dijkstra.p95Ms.toFixed(2)}ms</span></div>
                  <div className="flex justify-between"><span>visited</span><span className="text-[#8B96A5]">{state.benchmark.dijkstra.nodesVisitedAvg.toFixed(0)}</span></div>
                  <div className="flex justify-between"><span>req/s</span><span className="text-[#57616F]">{state.benchmark.dijkstra.requestsPerSecond.toFixed(0)}</span></div>
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-[4px] border px-2.5 py-2 font-mono text-[10px] ${state.benchmark.costsMatch ? 'border-[#2FBF71]/20 bg-[#2FBF71]/10 text-[#2FBF71]' : 'border-[#E5484D]/20 bg-[#E5484D]/10 text-[#E5484D]'}`}>
              {state.benchmark.costsMatch ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              <div className="flex-1">
                <div className="font-medium">{state.benchmark.costsMatch ? `Costs match across ${state.benchmark.pairCount} pairs ✓ — A* heuristic admissible` : `${state.benchmark.mismatches} mismatches — heuristic not admissible!`}</div>
                <div className="mt-0.5 text-[9px] opacity-80 tabular">Graph {state.benchmark.graphSize.nodes}N/{state.benchmark.graphSize.edges}E · {state.benchmark.speedUp.toFixed(2)}x speedup · O((V+E) log V)</div>
              </div>
              <span className="rounded-[3px] bg-[#0A0E13] border border-current px-1.5 py-0.5 text-[10px] tabular">{state.benchmark.speedUp.toFixed(2)}x</span>
            </div>
          </motion.div>
        )}

        {!state.benchmark && !state.isBenchmarking && (
          <div className="rounded-[4px] border border-dashed border-[#232A35] bg-[#0A0E13]/50 p-2.5">
            <div className="flex gap-2">
              <GitCompare className="h-4 w-4 shrink-0 text-[#57616F] mt-0.5" />
              <div className="font-mono text-[10px] leading-[1.4] text-[#57616F]">
                Click Run to execute live proof. Generates synthetic road-like network (Poisson-disc spacing + k-nearest + Union-Find) and compares A* vs Dijkstra across 50 random pairs. No canned numbers — all computed live.
              </div>
            </div>
            <div className="mt-2 flex gap-1.5">
              <span className="rounded-[2px] bg-[#1A2029] border border-[#232A35] px-1.5 py-0.5 font-mono text-[8px] uppercase text-[#57616F]">O((V+E) log V)</span>
              <span className="rounded-[2px] bg-[#1A2029] border border-[#232A35] px-1.5 py-0.5 font-mono text-[8px] uppercase text-[#57616F]">Admissible heuristic</span>
              <span className="rounded-[2px] bg-[#1A2029] border border-[#232A35] px-1.5 py-0.5 font-mono text-[8px] uppercase text-[#57616F]">50 pairs</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
