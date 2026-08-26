import { useEngine } from '../context/EngineContext';
import { Truck, MapPin, Clock, Activity, Battery, Navigation, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function FleetPage() {
  const { state } = useEngine();
  const [selectedAmb, setSelectedAmb] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-sans text-[24px] font-semibold tracking-tight text-[#0F172A]">Ambulance Fleet</h1>
          <p className="mt-1 font-sans text-[13px] text-[#64748B]">Live GPS tracking · 6 units across Maharashtra · Real-time ETA and status</p>
        </div>
        <div className="flex items-center gap-2 rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2 shadow-sm">
          <div className="h-2 w-2 rounded-full bg-[#059669] animate-pulse" />
          <span className="font-mono text-[12px] font-medium text-[#0F172A]">Live Tracking Active</span>
          <span className="font-mono text-[11px] tabular text-[#64748B]">· {now.toLocaleTimeString()} IST</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Fleet', value: state.ambulances.length, sub: '6 units operational', color: 'text-[#0F172A]', bg: 'bg-white', icon: Truck },
          { label: 'Available', value: state.ambulances.filter(a=>a.status==='AVAILABLE').length, sub: 'Ready for dispatch', color: 'text-[#059669]', bg: 'bg-[#ECFDF5]', icon: CheckCircle2 },
          { label: 'En Route', value: state.ambulances.filter(a=>a.status==='EN_ROUTE').length, sub: 'Active emergencies', color: 'text-[#EA580C]', bg: 'bg-[#FFF7ED]', icon: Navigation },
          { label: 'Avg Response', value: '8.2m', sub: 'Last 24 hours', color: 'text-[#0E9F6E]', bg: 'bg-[#F0FDF4]', icon: Clock },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className={`rounded-[12px] border border-[#E2E8F0] ${kpi.bg} p-4 shadow-sm`}>
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <span className="h-1.5 w-1.5 rounded-full bg-[#059669] animate-pulse" />
            </div>
            <div className="mt-3 font-mono text-[24px] font-semibold tabular text-[#0F172A]">{kpi.value}</div>
            <div className="font-sans text-[12px] font-medium text-[#0F172A]">{kpi.label}</div>
            <div className="font-mono text-[11px] text-[#64748B]">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-3">
          {state.ambulances.map((amb, i) => {
            const node = state.graph.getNode(amb.nodeId);
            const request = amb.currentRequestId ? state.requests.find(r => r.id === amb.currentRequestId) : null;
            const isSelected = selectedAmb === amb.id;
            return (
              <motion.div key={amb.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i*0.05 }} onClick={() => setSelectedAmb(amb.id)} className={`group cursor-pointer rounded-[12px] border bg-white p-4 shadow-sm hover:shadow-md transition-all ${isSelected ? 'border-[#0E9F6E] ring-2 ring-[#0E9F6E]/10' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-[10px] border ${amb.status === 'AVAILABLE' ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]' : amb.status === 'EN_ROUTE' ? 'bg-[#FFF7ED] border-[#FED7AA] text-[#EA580C]' : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]'}`}>
                      <Truck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[14px] font-semibold tabular text-[#0F172A]">{amb.id}</span>
                        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium uppercase ${amb.status === 'AVAILABLE' ? 'border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]' : 'border-[#FED7AA] bg-[#FFF7ED] text-[#EA580C]'}`}>{amb.status}</span>
                        {amb.status === 'EN_ROUTE' && <span className="h-1.5 w-1.5 rounded-full bg-[#EA580C] animate-pulse" />}
                      </div>
                      <div className="mt-1 flex items-center gap-3 font-mono text-[11px] tabular text-[#64748B]">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{node?.name || amb.nodeId} · {node?.lat.toFixed(4)},{node?.lng.toFixed(4)}</span>
                      </div>
                      {request && (
                        <div className="mt-2 rounded-[6px] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1.5">
                          <div className="font-sans text-[12px] font-medium text-[#0F172A]">{request.emergencyType} @ {request.originName}</div>
                          <div className="font-mono text-[11px] text-[#64748B]">{request.urgency} · {request.specialtyRequired} · {request.routeCost?.toFixed(0)}m ETA</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[11px] tabular text-[#64748B] flex items-center gap-1 justify-end"><Battery className="h-3 w-3" /> 87%</div>
                    <div className="mt-1 font-mono text-[10px] tabular text-[#94A3B8]">Speed: {amb.status === 'EN_ROUTE' ? '62 km/h' : '0 km/h'}</div>
                    <div className="mt-2 flex items-center gap-1 justify-end">
                      <div className="h-1 w-1 rounded-full bg-[#059669] animate-pulse" />
                      <span className="font-mono text-[10px] text-[#059669]">GPS Live</span>
                    </div>
                  </div>
                </div>

                {isSelected && request && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 border-t border-[#E2E8F0] pt-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] p-2.5">
                        <div className="font-mono text-[10px] uppercase text-[#64748B]">Live Location</div>
                        <div className="mt-1 font-mono text-[12px] tabular font-medium text-[#0F172A]">{node?.lat.toFixed(5)}, {node?.lng.toFixed(5)}</div>
                        <div className="mt-1 font-mono text-[10px] text-[#64748B]">Updated 2s ago · GPS ±3m</div>
                      </div>
                      <div className="rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] p-2.5">
                        <div className="font-mono text-[10px] uppercase text-[#64748B]">ETA to Patient</div>
                        <div className="mt-1 font-mono text-[14px] font-semibold tabular text-[#EA580C]">{request.routeCost ? `${(request.routeCost * 0.6).toFixed(0)}m` : '12m'}</div>
                        <div className="mt-1 font-mono text-[10px] text-[#64748B]">Via A* optimal route</div>
                      </div>
                      <div className="rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] p-2.5">
                        <div className="font-mono text-[10px] uppercase text-[#64748B]">Patient</div>
                        <div className="mt-1 font-sans text-[12px] font-medium text-[#0F172A]">{request.id.slice(0,8)}</div>
                        <div className="mt-1 font-mono text-[10px] text-[#64748B]">{request.urgency} · {request.specialtyRequired}</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="space-y-4">
          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <h3 className="font-sans text-[13px] font-semibold text-[#0F172A]">Live Tracking Map</h3>
            <p className="mt-1 font-mono text-[11px] text-[#64748B]">Real-time GPS positions update every 2 seconds</p>
            <div className="mt-3 h-[200px] rounded-[8px] bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center">
              <div className="text-center">
                <Navigation className="h-8 w-8 text-[#94A3B8] mx-auto animate-pulse" />
                <div className="mt-2 font-mono text-[11px] text-[#64748B]">Live map view</div>
                <div className="font-mono text-[10px] text-[#94A3B8]">Go to Live Tracker page for full map</div>
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E2E8F0] bg-white p-4 shadow-sm">
            <h3 className="font-sans text-[13px] font-semibold text-[#0F172A]">Fleet Health</h3>
            <div className="mt-3 space-y-2.5">
              {[
                { label: 'Fuel Average', value: '78%', status: 'good' },
                { label: 'Maintenance Due', value: '1 unit', status: 'warning' },
                { label: 'GPS Signal', value: '100%', status: 'good' },
                { label: 'Response Time', value: '8.2 min avg', status: 'good' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded-[6px] bg-[#F8FAFC] border border-[#E2E8F0] px-3 py-2">
                  <span className="font-sans text-[12px] text-[#475569]">{item.label}</span>
                  <span className={`font-mono text-[11px] font-medium tabular ${item.status === 'good' ? 'text-[#059669]' : 'text-[#D97706]'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
