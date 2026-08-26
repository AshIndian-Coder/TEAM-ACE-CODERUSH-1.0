import { useEngine } from '../context/EngineContext';
import { motion, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { Activity, Bed, Pill, Truck, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 200, damping: 20 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
    const unsub = spring.on('change', (v) => setDisplay(Math.round(v)));
    return () => unsub();
  }, [value, spring]);

  return <span className="tabular">{display}</span>;
}

export function TelemetryPanel() {
  const { state } = useEngine();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const availableAMB = state.ambulances.filter(a => a.status === 'AVAILABLE').length;
  const busyAMB = state.ambulances.length - availableAMB;
  const enRouteAMB = state.ambulances.filter(a => a.status === 'EN_ROUTE').length;

  const totalBeds = state.hospitals.reduce((s, h) => s + h.bedsTotal, 0);
  const freeBeds = state.hospitals.reduce((s, h) => s + h.bedsAvailable, 0);
  const reservedBeds = state.hospitals.reduce((s, h) => s + h.bedsReserved, 0);
  const occupiedPct = ((totalBeds - freeBeds) / totalBeds) * 100;

  return (
    <div className="flex h-full flex-col bg-[#12161D]">
      {/* Header - instrument panel style */}
      <div className="flex h-[32px] shrink-0 items-center justify-between border-b border-[#232A35] bg-[#0A0E13] px-3">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-[#2FBF71] animate-pulse" />
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B96A5]">Telemetry</h2>
          <span className="font-mono text-[9px] tabular text-[#57616F]">· {now.toLocaleTimeString()} · 1s refresh</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-[#2FBF71]" />
          <span className="font-mono text-[9px] uppercase text-[#57616F]">Live</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Fleet - dense stat rows, not KPI cards */}
        <div className="border-b border-[#232A35]">
          <div className="flex items-center justify-between bg-[#1A2029] px-3 py-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#57616F]">
              <Truck className="h-3 w-3" /> Fleet · {state.ambulances.length} units
            </div>
            <div className="font-mono text-[9px] tabular text-[#57616F]">{enRouteAMB} en-route</div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-[#232A35] border-b border-[#232A35]">
            {[
              { label: 'Available', value: availableAMB, color: 'text-[#2FBF71]', bg: 'bg-[#2FBF71]/10', border: 'border-[#2FBF71]/20' },
              { label: 'Busy', value: busyAMB, color: 'text-[#F76B15]', bg: 'bg-[#F76B15]/10', border: 'border-[#F76B15]/20' },
              { label: 'En Route', value: enRouteAMB, color: 'text-[#E8ECF1]', bg: 'bg-[#212836]', border: 'border-[#232A35]' },
            ].map((stat) => (
              <div key={stat.label} className={`px-2.5 py-2 ${stat.bg}`}>
                <div className="font-mono text-[9px] uppercase tracking-wide text-[#57616F]">{stat.label}</div>
                <motion.div
                  key={stat.value}
                  initial={{ scale: 0.9, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`font-mono text-[18px] font-medium leading-none tabular ${stat.color}`}
                >
                  <AnimatedNumber value={stat.value} />
                </motion.div>
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#1A2029]">
            {state.ambulances.map((amb) => (
              <motion.div
                key={amb.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-[26px] items-center justify-between px-3 font-mono text-[11px] hover:bg-[#1A2029]/50"
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1 w-1 rounded-full ${amb.status === 'AVAILABLE' ? 'bg-[#2FBF71]' : amb.status === 'EN_ROUTE' ? 'bg-[#F76B15] animate-pulse' : 'bg-[#57616F]'}`} />
                  <span className="tabular text-[#8B96A5] w-[54px]">{amb.id}</span>
                  <span className="text-[#57616F] text-[10px] tabular">{amb.nodeId.slice(0,6)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {amb.currentRequestId && <span className="text-[9px] tabular text-[#57616F]">{amb.currentRequestId.slice(0,6)}</span>}
                  <span className={`rounded-[3px] border px-1 py-0.5 text-[8px] uppercase leading-none tracking-wide ${
                    amb.status === 'AVAILABLE' ? 'border-[#2FBF71]/20 bg-[#2FBF71]/10 text-[#2FBF71]' :
                    amb.status === 'EN_ROUTE' ? 'border-[#F76B15]/20 bg-[#F76B15]/10 text-[#F76B15]' :
                    amb.status === 'ASSIGNED' ? 'border-[#F5B700]/20 bg-[#F5B700]/10 text-[#F5B700]' :
                    'border-[#232A35] bg-[#1A2029] text-[#57616F]'
                  }`}>{amb.status}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Hospitals - dense table-like */}
        <div className="border-b border-[#232A35]">
          <div className="flex items-center justify-between bg-[#1A2029] px-3 py-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#57616F]">
              <Bed className="h-3 w-3" /> Facilities · {state.hospitals.length}
            </div>
            <div className="flex items-center gap-2 font-mono text-[9px] tabular">
              <span className="text-[#57616F]">{freeBeds}/{totalBeds} free</span>
              <span className={`px-1 py-0.5 rounded-[2px] border ${occupiedPct > 80 ? 'border-[#E5484D]/20 bg-[#E5484D]/10 text-[#E5484D]' : 'border-[#232A35] bg-[#12161D] text-[#57616F]'}`}>{occupiedPct.toFixed(0)}% occ</span>
            </div>
          </div>

          <div className="space-y-0">
            {state.hospitals.map((h) => {
              const occ = ((h.bedsTotal - h.bedsAvailable) / h.bedsTotal) * 100;
              const isStressed = occ > 85 || h.bedsAvailable === 0;
              return (
                <motion.div
                  key={h.id}
                  layout
                  className={`group border-b border-[#1A2029] last:border-0 px-2.5 py-2 hover:bg-[#1A2029]/70 ${isStressed ? 'bg-[#E5484D]/[0.03]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-1 w-1 rounded-full ${h.bedsAvailable > 0 ? 'bg-[#2FBF71]' : 'bg-[#E5484D]'}`} />
                        <span className="truncate font-mono text-[11px] font-medium leading-[1.1] text-[#E8ECF1]">{h.name.replace('RuralCare ', '').replace(' - ', ' · ')}</span>
                        {isStressed && <AlertCircle className="h-3 w-3 text-[#E5484D] shrink-0" />}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-0.5">
                        {h.specialists.slice(0, 3).map(s => (
                          <span key={s} className="rounded-[2px] border border-[#232A35] bg-[#0A0E13] px-1 py-0.5 font-mono text-[8px] uppercase leading-none tracking-wide text-[#57616F]">{s.slice(0,3)}</span>
                        ))}
                        {h.specialists.length > 3 && <span className="font-mono text-[8px] text-[#57616F]">+{h.specialists.length-3}</span>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-[11px] tabular leading-none text-[#E8ECF1]">{h.bedsAvailable}<span className="text-[#57616F]">/{h.bedsTotal}</span></div>
                      <div className="font-mono text-[9px] tabular text-[#F76B15]">{h.bedsReserved} res</div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[#1A2029]">
                      <motion.div
                        className="h-full bg-[#12A594]"
                        initial={{ width: 0 }}
                        animate={{ width: `${100 - occ}%` }}
                        transition={{ duration: 0.6, ease: [0.22,1,0.36,1] }}
                      />
                    </div>
                    <span className="font-mono text-[9px] tabular text-[#57616F] w-[28px] text-right">{(100-occ).toFixed(0)}%</span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between font-mono text-[9px] tabular">
                    <div className="flex items-center gap-2 text-[#57616F]">
                      <span className="flex items-center gap-1"><Pill className="h-2.5 w-2.5" />{Object.values(h.medicines).reduce((s,m)=>s+m.available,0)} units</span>
                    </div>
                    <div className="text-[#57616F]">{h.id}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Requests - urgency breakdown with animated bars */}
        <div>
          <div className="flex items-center gap-1.5 bg-[#1A2029] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[#57616F]">
            <Activity className="h-3 w-3" /> Active · {state.requests.filter(r=>r.status!=='COMPLETED').length} in-flight
          </div>

          <div className="grid grid-cols-4 divide-x divide-[#232A35] border-y border-[#232A35]">
            {(['CRITICAL','HIGH','MEDIUM','LOW'] as const).map(u => {
              const count = state.requests.filter(r => r.urgency === u && r.status !== 'COMPLETED').length;
              const total = state.requests.filter(r => r.urgency === u).length;
              return (
                <div key={u} className="px-2 py-2 text-center">
                  <div className={`mx-auto mb-1 h-0.5 w-full rounded-full ${
                    u === 'CRITICAL' ? 'bg-[#E5484D]' : u === 'HIGH' ? 'bg-[#F76B15]' : u === 'MEDIUM' ? 'bg-[#F5B700]' : 'bg-[#6C7684]'
                  }`} style={{ opacity: count > 0 ? 1 : 0.2 }} />
                  <div className="font-mono text-[8px] uppercase tracking-wide text-[#57616F]">{u.slice(0,4)}</div>
                  <motion.div
                    key={count}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className="font-mono text-[14px] font-medium tabular leading-none mt-0.5 text-[#E8ECF1]"
                  >
                    {count}
                  </motion.div>
                  <div className="font-mono text-[8px] tabular text-[#57616F]">{total} total</div>
                </div>
              );
            })}
          </div>

          {/* Recent requests mini timeline */}
          <div className="p-2 space-y-1">
            <div className="font-mono text-[9px] uppercase tracking-widest text-[#57616F] flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Last 5 dispatches</div>
            {state.requests.slice(-5).reverse().map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-[3px] bg-[#0A0E13] border border-[#1A2029] px-2 py-1 font-mono text-[10px]">
                <span className="tabular text-[#8B96A5]">{r.id.slice(0,6)}</span>
                <span className={`px-1 py-0.5 rounded-[2px] text-[8px] uppercase border ${
                  r.urgency === 'CRITICAL' ? 'border-[#E5484D]/20 bg-[#E5484D]/10 text-[#E5484D]' :
                  r.urgency === 'HIGH' ? 'border-[#F76B15]/20 bg-[#F76B15]/10 text-[#F76B15]' :
                  'border-[#232A35] bg-[#12161D] text-[#57616F]'
                }`}>{r.urgency.slice(0,4)}</span>
                <span className="tabular text-[#57616F] text-[9px]">{new Date(r.createdAt).toLocaleTimeString().slice(0,5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
