import { MapPanel } from '../components/MapPanel';
import { useEngine } from '../context/EngineContext';

export function MapPage() {
  const { state } = useEngine();
  return (
    <div className="flex flex-1 flex-col bg-[#F8FAFC] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="font-sans text-[18px] font-semibold tracking-tight text-[#0F172A]">Network Map</h1>
          <p className="font-mono text-[11px] tabular text-[#64748B]">{state.graph.nodeCount()} nodes · {state.graph.edgeCount()} edges · {state.graph.getAllEdges().filter(e=>e.status==='closed').length} closed roads · Live A* routing</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white shadow-sm">
        <MapPanel />
      </div>
    </div>
  );
}
