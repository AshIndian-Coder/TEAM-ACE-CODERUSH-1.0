import { useEngine } from '../context/EngineContext';
import { Building2, Bed, Pill, Users, MapPin, Activity, AlertTriangle, CheckCircle2, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export function HospitalsPage() {
  const { state } = useEngine();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'full'>('all');

  const filtered = state.hospitals.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) || h.specialists.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === 'all' || (filter === 'available' ? h.bedsAvailable > 0 : h.bedsAvailable === 0);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6">
      <div className="mb-6">
        <h1 className="font-sans text-[24px] font-semibold tracking-tight text-[#0F172A]">Hospitals Network</h1>
        <p className="mt-1 font-sans text-[13px] text-[#64748B]">8 facilities across Maharashtra rural region · Real-time bed & medicine tracking</p>
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search hospitals or specialties..." className="h-[40px] w-full rounded-[10px] border border-[#E2E8F0] bg-white pl-9 pr-3 font-sans text-[13px] outline-none focus:border-[#0E9F6E] focus:ring-2 focus:ring-[#0E9F6E]/10" />
        </div>
        <div className="flex rounded-[10px] border border-[#E2E8F0] bg-white p-1">
          {(['all','available','full'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-[6px] px-3 py-1.5 font-sans text-[12px] font-medium capitalize transition-all ${filter===f ? 'bg-[#0F172A] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((h, i) => {
          const node = state.graph.getNode(h.nodeId);
          const occ = ((h.bedsTotal - h.bedsAvailable) / h.bedsTotal) * 100;
          const isFull = h.bedsAvailable === 0;
          return (
            <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }} className="group overflow-hidden rounded-[12px] border border-[#E2E8F0] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:border-[#CBD5E1] transition-all">
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-[10px] border ${isFull ? 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]' : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'}`}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-sans text-[14px] font-semibold leading-[1.2] text-[#0F172A]">{h.name}</h3>
                      <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] text-[#64748B]">
                        <MapPin className="h-3 w-3" /> {node?.lat.toFixed(4)}, {node?.lng.toFixed(4)} · {h.nodeId}
                      </div>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium ${isFull ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]' : 'border-[#A7F3D0] bg-[#ECFDF5] text-[#059669]'}`}>
                    {isFull ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />} {isFull ? 'Full' : 'Available'}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-[#64748B]">Beds</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold tabular text-[#0F172A]">{h.bedsAvailable}<span className="text-[12px] text-[#94A3B8]">/{h.bedsTotal}</span></div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E2E8F0]"><div className="h-full bg-[#0E9F6E]" style={{ width: `${100-occ}%` }} /></div>
                  </div>
                  <div className="rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-[#64748B]">Reserved</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold tabular text-[#EA580C]">{h.bedsReserved}</div>
                    <div className="mt-1 font-mono text-[10px] text-[#64748B]">{occ.toFixed(0)}% occupied</div>
                  </div>
                  <div className="rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wide text-[#64748B]">Medicines</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold tabular text-[#0F172A]">{Object.values(h.medicines).reduce((s,m)=>s+m.available,0)}</div>
                    <div className="mt-1 font-mono text-[10px] text-[#64748B]">{Object.keys(h.medicines).length} types</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#94A3B8] mb-2">Specialists</div>
                  <div className="flex flex-wrap gap-1.5">
                    {h.specialists.map(s => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-[6px] border border-[#E2E8F0] bg-white px-2 py-1 font-sans text-[11px] font-medium text-[#0F172A] shadow-sm">
                        <Users className="h-3 w-3 text-[#94A3B8]" /> {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#94A3B8] mb-2">Medicine Stock</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(h.medicines).slice(0,4).map(([name, stock]) => (
                      <div key={name} className="flex items-center justify-between rounded-[6px] bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <Pill className="h-3 w-3 text-[#94A3B8]" />
                          <span className="font-sans text-[11px] text-[#0F172A] truncate max-w-[90px]">{name}</span>
                        </div>
                        <span className={`font-mono text-[11px] tabular font-medium ${stock.available === 0 ? 'text-[#DC2626]' : stock.available < 3 ? 'text-[#D97706]' : 'text-[#059669]'}`}>{stock.available}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#E2E8F0] bg-[#F8FAFC] px-5 py-3">
                <span className="font-mono text-[11px] tabular text-[#64748B]">ID: {h.id} · Status: {h.status}</span>
                <button className="font-sans text-[12px] font-medium text-[#0E9F6E] hover:text-[#047857]">View Details →</button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
