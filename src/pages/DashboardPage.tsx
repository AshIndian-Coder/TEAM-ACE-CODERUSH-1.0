import { useEngine } from '../context/EngineContext';
import { motion } from 'framer-motion';
import { 
  Building2, Truck, Users, Activity, AlertTriangle, 
  TrendingUp, Clock, MapPin, Zap, ArrowUpRight, Heart,
  Brain, Stethoscope, Baby, Bone, Wind, Droplets, Radio
} from 'lucide-react';
import { useState, useEffect } from 'react';

const specialtyIcons: Record<string, any> = {
  'Cardiologist': Heart,
  'Neurologist': Brain,
  'Orthopedic': Bone,
  'Pediatrician': Baby,
  'General Surgeon': Stethoscope,
  'Pulmonologist': Wind,
  'Gynaecologist': Droplets,
  'Trauma Specialist': AlertTriangle,
};

export function DashboardPage() {
  const { state, generateEmergency } = useEngine();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const activeRequests = state.requests.filter(r => r.status !== 'COMPLETED');
  const criticalRequests = activeRequests.filter(r => r.urgency === 'CRITICAL');
  const availableAmbulances = state.ambulances.filter(a => a.status === 'AVAILABLE').length;
  const totalBeds = state.hospitals.reduce((s, h) => s + h.bedsTotal, 0);
  const freeBeds = state.hospitals.reduce((s, h) => s + h.bedsAvailable, 0);
  const occupancy = ((totalBeds - freeBeds) / totalBeds) * 100;

  const kpis = [
    { label: 'Active Emergencies', value: activeRequests.length, change: '+2 in last hour', icon: Activity, color: 'text-[#012D61]', bg: 'bg-white', border: 'border-[#D6E0EB]', accent: 'bg-[#012D61]', trend: 'up' },
    { label: 'Critical Cases', value: criticalRequests.length, change: criticalRequests.length > 0 ? 'Requires immediate attention' : 'All stable', icon: Zap, color: 'text-[#C41E3A]', bg: 'bg-[#FDF0F1]', border: 'border-[#F5C2C7]', accent: 'bg-[#C41E3A]', trend: criticalRequests.length > 0 ? 'critical' : 'stable' },
    { label: 'Available Ambulances', value: `${availableAmbulances}/${state.ambulances.length}`, change: `${state.ambulances.filter(a => a.status === 'EN_ROUTE').length} en-route · GPS live`, icon: Truck, color: 'text-[#028752]', bg: 'bg-[#E6F4EA]', border: 'border-[#A7D8B8]', accent: 'bg-[#028752]', trend: 'up' },
    { label: 'Bed Occupancy', value: `${occupancy.toFixed(0)}%`, change: `${freeBeds} beds free of ${totalBeds} · ${state.hospitals.length} hospitals`, icon: Building2, color: 'text-[#2582A1]', bg: 'bg-[#E0F0F6]', border: 'border-[#B8D9E8]', accent: 'bg-[#2582A1]', trend: occupancy > 80 ? 'critical' : 'up' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F7FA] p-6">
      {/* Header with Mayo + Apollo grading */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[26px] font-bold tracking-tight text-[#012D61]">Operations Dashboard</h1>
            <span className="rounded-[6px] bg-[#012D61] px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">Live</span>
            <span className="rounded-[6px] border border-[#2582A1]/20 bg-[#E0F0F6] px-2 py-1 font-mono text-[10px] font-medium text-[#2582A1]">Mayo + Apollo inspired</span>
          </div>
          <p className="mt-1.5 font-sans text-[13px] leading-[1.4] text-[#2C4A6B]">Real-time overview of rural healthcare network · Last updated {now.toLocaleTimeString()} IST · O((V+E) log V) engine</p>
        </div>
        <div className="flex gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => generateEmergency('CRITICAL')}
            className="flex h-[40px] items-center gap-2 rounded-[10px] bg-[#C41E3A] px-4 font-sans text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(196,30,58,0.25),0_1px_0_0_rgba(255,255,255,0.15)_inset] hover:bg-[#A51A30] transition-all"
          >
            <Zap className="h-4 w-4" /> New Critical Emergency
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => generateEmergency()}
            className="flex h-[40px] items-center gap-2 rounded-[10px] border border-[#D6E0EB] bg-white px-4 font-sans text-[13px] font-medium text-[#012D61] shadow-[0_1px_3px_rgba(1,45,97,0.08)] hover:bg-[#F0F6FB] hover:border-[#9AB1CB] hover:shadow-md transition-all"
          >
            <Activity className="h-4 w-4" /> Generate Emergency
          </motion.button>
        </div>
      </div>

      {/* KPIs - Figma animations, real hospital colors */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className={`group relative overflow-hidden rounded-[14px] border bg-white p-5 shadow-[0_1px_3px_rgba(1,45,97,0.06),0_1px_2px_rgba(1,45,97,0.04)] hover:shadow-[0_8px_24px_rgba(1,45,97,0.08),0_2px_8px_rgba(1,45,97,0.06)] transition-all ${kpi.border}`}
          >
            {/* Subtle gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-[#F0F6FB]/50 pointer-events-none" />
            
            <div className="relative flex items-start justify-between">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                className={`flex h-10 w-10 items-center justify-center rounded-[10px] border shadow-sm ${kpi.bg} ${kpi.border}`}
              >
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </motion.div>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 400 }}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold ${
                  kpi.trend === 'critical' ? 'bg-[#FDF0F1] text-[#C41E3A] border-[#F5C2C7]' :
                  kpi.trend === 'up' ? 'bg-[#E6F4EA] text-[#028752] border-[#A7D8B8]' :
                  'bg-[#F0F6FB] text-[#2C4A6B] border-[#D6E0EB]'
                }`}
              >
                {kpi.trend === 'critical' ? <AlertTriangle className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {kpi.trend}
              </motion.span>
            </div>
            
            <div className="relative mt-4">
              <motion.div
                key={typeof kpi.value === 'number' ? kpi.value : kpi.value.toString()}
                initial={{ scale: 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="font-display text-[30px] font-bold leading-none tracking-tight text-[#012D61] tabular"
              >
                {kpi.value}
              </motion.div>
              <div className="mt-1.5 font-sans text-[13px] font-semibold tracking-tight text-[#012D61]">{kpi.label}</div>
              <div className="mt-1 font-mono text-[11px] leading-[1.3] text-[#2C4A6B]">{kpi.change}</div>
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#F0F6FB]">
              <motion.div
                className={`h-full ${kpi.accent}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (typeof kpi.value === 'number' ? kpi.value : 50) * 12)}%` }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-[14px] border border-[#D6E0EB] bg-white shadow-[0_1px_3px_rgba(1,45,97,0.06)] overflow-hidden">
          <div className="flex h-[56px] items-center justify-between border-b border-[#D6E0EB] bg-[#F5F7FA] px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#012D61] text-white shadow-sm">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-sans text-[14px] font-semibold tracking-tight text-[#012D61]">Active Emergencies</h2>
                <div className="font-mono text-[11px] tabular text-[#2C4A6B]">{activeRequests.length} active · {criticalRequests.length} critical · Live GPS tracking</div>
              </div>
              {criticalRequests.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="ml-2 rounded-full bg-[#C41E3A] px-2.5 py-1 font-mono text-[11px] font-bold text-white shadow-[0_2px_6px_rgba(196,30,58,0.25)] animate-pulse"
                >
                  {criticalRequests.length} CRITICAL
                </motion.span>
              )}
            </div>
            <button className="flex items-center gap-1.5 rounded-[8px] border border-[#D6E0EB] bg-white px-3 py-1.5 font-sans text-[12px] font-medium text-[#2582A1] shadow-sm hover:bg-[#F0F6FB] hover:border-[#9AB1CB] transition-all">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          
          <div className="divide-y divide-[#EFF4F9]">
            {activeRequests.length === 0 ? (
              <div className="py-20 text-center">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F5F7FA] border border-[#D6E0EB] shadow-sm"
                >
                  <Activity className="h-7 w-7 text-[#7A9AB8]" />
                </motion.div>
                <div className="mt-4 font-sans text-[14px] font-semibold text-[#012D61]">No active emergencies</div>
                <div className="mt-1 font-sans text-[12px] text-[#2C4A6B]">All patients stable. System monitoring network in real-time.</div>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-dashed border-[#D6E0EB] bg-[#F5F7FA] px-3 py-1.5 font-mono text-[11px] text-[#7A9AB8]">
                  <Radio className="h-3 w-3 text-[#028752] animate-pulse" /> Live tracking active · Press ⌘K
                </div>
              </div>
            ) : (
              activeRequests.slice(-5).reverse().map((req, idx) => {
                const Icon = specialtyIcons[req.specialtyRequired] || Stethoscope;
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ x: 2, backgroundColor: '#F5F7FA' }}
                    className="group flex items-center gap-4 p-4 transition-colors"
                  >
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border shadow-sm ${
                        req.urgency === 'CRITICAL' ? 'bg-[#FDF0F1] border-[#F5C2C7] text-[#C41E3A]' :
                        req.urgency === 'HIGH' ? 'bg-[#FEF3E2] border-[#FED7AA] text-[#E67E22]' :
                        req.urgency === 'MEDIUM' ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D4A017]' :
                        'bg-[#F5F7FA] border-[#D6E0EB] text-[#7A9AB8]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-[13px] font-semibold tracking-tight text-[#012D61]">{req.emergencyType}</span>
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, delay: 0.2 + idx * 0.05 }}
                          className={`rounded-[6px] border px-2 py-1 font-mono text-[10px] font-bold uppercase leading-none tracking-wide ${
                            req.urgency === 'CRITICAL' ? 'border-[#F5C2C7] bg-[#FDF0F1] text-[#C41E3A]' :
                            req.urgency === 'HIGH' ? 'border-[#FED7AA] bg-[#FEF3E2] text-[#E67E22]' :
                            'border-[#D6E0EB] bg-[#F5F7FA] text-[#2C4A6B]'
                          }`}
                        >
                          {req.urgency}
                        </motion.span>
                        <span className="font-mono text-[11px] tabular text-[#7A9AB8]">{req.id.slice(0,8)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 font-sans text-[12px] text-[#2C4A6B]">
                        <MapPin className="h-3 w-3 text-[#7A9AB8] shrink-0" />
                        <span className="truncate">{req.originName}</span>
                        <span className="text-[#D6E0EB]">·</span>
                        <span className="font-medium text-[#012D61]">{req.specialtyRequired}</span>
                        <span className="text-[#D6E0EB]">·</span>
                        <span className="font-mono text-[11px] tabular">{req.medicineRequired}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className={`inline-flex rounded-full border px-3 py-1 font-mono text-[11px] font-semibold leading-none tracking-wide ${
                          req.status === 'EN_ROUTE' ? 'border-[#FED7AA] bg-[#FEF3E2] text-[#9A3412]' :
                          req.status === 'REROUTING' ? 'border-[#F5C2C7] bg-[#FDF0F1] text-[#C41E3A] animate-pulse' :
                          'border-[#D6E0EB] bg-[#F5F7FA] text-[#2C4A6B]'
                        }`}
                      >
                        {req.status}
                      </motion.div>
                      <div className="mt-1.5 font-mono text-[11px] tabular text-[#2C4A6B] flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3 text-[#7A9AB8]" /> {req.routeCost?.toFixed(0)}m ETA
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[14px] border border-[#D6E0EB] bg-white shadow-[0_1px_3px_rgba(1,45,97,0.06)] overflow-hidden">
            <div className="flex h-[48px] items-center justify-between border-b border-[#D6E0EB] bg-[#F5F7FA] px-4">
              <h2 className="font-sans text-[13px] font-semibold tracking-tight text-[#012D61]">Hospitals</h2>
              <span className="rounded-full bg-white border border-[#D6E0EB] px-2.5 py-1 font-mono text-[11px] tabular font-medium text-[#2C4A6B] shadow-sm">{freeBeds}/{totalBeds} beds free</span>
            </div>
            <div className="p-3 space-y-2.5">
              {state.hospitals.slice(0, 4).map((h, i) => {
                const occ = ((h.bedsTotal - h.bedsAvailable) / h.bedsTotal) * 100;
                return (
                  <motion.div
                    key={h.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    whileHover={{ y: -1, scale: 1.01 }}
                    className="group rounded-[10px] border border-[#D6E0EB] bg-[#F5F7FA] p-3 hover:border-[#9AB1CB] hover:bg-white hover:shadow-[0_4px_12px_rgba(1,45,97,0.08)] transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-sans text-[12px] font-semibold tracking-tight text-[#012D61]">{h.name.replace('RuralCare ', '')}</div>
                        <div className="mt-1 flex gap-1">
                          {h.specialists.slice(0, 3).map(s => (
                            <span key={s} className="rounded-[5px] bg-white border border-[#D6E0EB] px-1.5 py-1 font-mono text-[9px] uppercase font-medium tracking-wide text-[#2C4A6B] shadow-xs">{s.slice(0,4)}</span>
                          ))}
                        </div>
                      </div>
                      <motion.div animate={{ scale: h.bedsAvailable === 0 ? [1, 1.2, 1] : 1 }} transition={{ duration: 2, repeat: h.bedsAvailable === 0 ? Infinity : 0 }} className={`h-2.5 w-2.5 rounded-full border-2 border-white shadow-sm ${h.bedsAvailable > 0 ? 'bg-[#028752]' : 'bg-[#C41E3A]'}`} />
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between font-mono text-[10px] tabular mb-1.5">
                        <span className="uppercase tracking-wide text-[#7A9AB8]">Beds</span>
                        <span className="font-medium text-[#012D61]">{h.bedsAvailable}/{h.bedsTotal}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[#DCE8F2] border border-[#D6E0EB]/50">
                        <motion.div className="h-full bg-[#2582A1]" initial={{ width: 0 }} animate={{ width: `${100-occ}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[14px] border border-[#D6E0EB] bg-white shadow-[0_1px_3px_rgba(1,45,97,0.06)] overflow-hidden">
            <div className="flex h-[48px] items-center justify-between border-b border-[#D6E0EB] bg-[#F5F7FA] px-4">
              <h2 className="font-sans text-[13px] font-semibold tracking-tight text-[#012D61]">Fleet Status</h2>
              <span className="rounded-full bg-[#E6F4EA] border border-[#A7D8B8] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#028752] shadow-sm">{availableAmbulances} available</span>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Available', value: availableAmbulances, color: 'text-[#028752]', bg: 'bg-[#E6F4EA] border-[#A7D8B8]' },
                  { label: 'En Route', value: state.ambulances.filter(a=>a.status==='EN_ROUTE').length, color: 'text-[#E67E22]', bg: 'bg-[#FEF3E2] border-[#FED7AA]' },
                  { label: 'Total', value: state.ambulances.length, color: 'text-[#012D61]', bg: 'bg-[#F0F6FB] border-[#D6E0EB]' },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-[10px] border p-3 text-center shadow-sm ${stat.bg}`}>
                    <div className={`font-display text-[20px] font-bold tabular leading-none ${stat.color}`}>{stat.value}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#2C4A6B]">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {state.ambulances.slice(0, 4).map(amb => (
                  <motion.div key={amb.id} whileHover={{ x: 2 }} className="flex items-center justify-between rounded-[8px] bg-[#F5F7FA] border border-[#D6E0EB] px-3 py-2.5 hover:bg-white hover:border-[#9AB1CB] hover:shadow-sm transition-all">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-2 w-2 rounded-full ${amb.status === 'AVAILABLE' ? 'bg-[#028752]' : 'bg-[#E67E22] animate-pulse'} shadow-sm`} />
                      <span className="font-mono text-[12px] font-semibold tabular tracking-wide text-[#012D61]">{amb.id}</span>
                      <span className="font-mono text-[10px] tabular text-[#7A9AB8]">{amb.nodeId.slice(0,5)}</span>
                    </div>
                    <span className={`rounded-[6px] border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide ${amb.status === 'AVAILABLE' ? 'border-[#A7D8B8] bg-[#E6F4EA] text-[#028752]' : 'border-[#FED7AA] bg-[#FEF3E2] text-[#9A3412]'}`}>{amb.status}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
