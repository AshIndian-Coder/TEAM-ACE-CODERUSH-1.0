import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Map, Building2, Truck, Users, BarChart3, 
  Radio, Activity, Zap, ChevronDown, Stethoscope, HeartPulse, Database, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useEngine } from '../../context/EngineContext';

const navItems = [
  { id: 'patients', label: 'Patients', icon: Users, path: '/patients', badge: null, desc: 'Illness + triage', color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'hospitals', label: 'Hospitals', icon: Building2, path: '/hospitals', badge: null, desc: 'Facilities & beds', color: '#028752', bg: '#E6F4EA', hasSub: true },
  { id: 'fleet', label: 'Ambulance Fleet', icon: Truck, path: '/fleet', badge: null, desc: 'Live GPS tracked', color: '#0078BF', bg: '#E0F0F6' },
  { id: 'live', label: 'Live Tracker', icon: Radio, path: '/live', badge: 'Live', badgeColor: 'bg-[#C41E3A] text-white animate-pulse', desc: 'Real GPS tracking', color: '#F08122', bg: '#FEF3E2' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', badge: null, desc: 'Proof & metrics', color: '#0E9F6E', bg: '#D1FAE5' },
  { id: 'data', label: 'Data Manager', icon: Database, path: '/data', badge: 'Add', badgeColor: 'bg-[#012D61] text-white', desc: 'Add real data', color: '#012D61', bg: '#E0F0F6' },
  { id: 'map', label: 'Network Map', icon: Map, path: '/map', badge: null, desc: 'Your network', color: '#2582A1', bg: '#E0F0F6' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/', badge: null, desc: 'Overview', color: '#0FC5C6', bg: '#E0F7F8' },
];

export function Sidebar() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hospitalsExpanded, setHospitalsExpanded] = useState(true);
  const location = useLocation();
  const { state } = useEngine();

  // Figma-style auto slide: collapsed 76px by default, expands to 280px on hover — no button needed
  const showCollapsed = !isHovering;

  return (
    <motion.div
      id="roumi-sidebar"
      initial={false}
      animate={{ width: showCollapsed ? 76 : 280 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.9 }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className="relative flex h-full shrink-0 flex-col bg-white border-r-2 border-[#B8D0E6] shadow-[2px_0_16px_rgba(1,45,97,0.08)] z-30 overflow-hidden"
    >
      {/* Logo - colorful, no hook button */}
      <div className="relative flex h-[68px] items-center gap-3 border-b-2 border-[#B8D0E6] bg-gradient-to-r from-[#012D61] to-[#0A3A7A] px-3.5">
        <motion.div whileHover={{ scale: 1.08, rotate: 5 }} whileTap={{ scale: 0.92 }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] cursor-pointer">
          <HeartPulse className="h-6 w-6 text-[#012D61]" />
        </motion.div>
        <AnimatePresence mode="wait">
          {!showCollapsed && (
            <motion.div key="logo-text" initial={{ opacity: 0, x: -12, filter: 'blur(4px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, x: -12, filter: 'blur(4px)' }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sans text-[16px] font-bold tracking-tight text-white">RouMi</span>
                <span className="rounded-[6px] bg-[#0FC5C6] px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide text-[#012D61] shadow-sm">v1.0</span>
              </div>
              <div className="font-sans text-[11px] leading-[1] tracking-wide text-white/70 mt-0.5">RuralCare Route · Calibri</div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* No hook button - removed as requested */}
      </div>

      <div className="flex-1 overflow-y-auto p-3 bg-[#F8FBFF]">
        <AnimatePresence>
          {!showCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mb-3 px-2 flex items-center gap-2">
              <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#5A8AB0]">Menu</div>
              <div className="flex-1 h-px bg-gradient-to-r from-[#B8D0E6] to-transparent" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#0FC5C6] animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        <nav className="space-y-1.5">
          {navItems.map((item, idx) => {
            const isActive = location.pathname === item.path || (item.id === 'hospitals' && location.pathname.startsWith('/hospitals')) || (item.id === 'hospitals' && location.pathname.startsWith('/doctors'));
            const isHovered = hovered === item.id;
            
            if (item.hasSub) {
              return (
                <div key={item.id} className="space-y-1">
                  <NavLink to={item.path} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)} className="block">
                    <motion.div
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.35 }}
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.97 }}
                      className={`group relative flex h-[46px] items-center rounded-[12px] px-3 transition-all border-2 ${
                        isActive ? 'bg-[#012D61] border-[#012D61] text-white shadow-[0_4px_12px_rgba(1,45,97,0.15)]' : 'bg-white border-[#B8D0E6] text-[#1E4A6E] hover:border-[#2582A1] hover:bg-[#F0F7FF] hover:shadow-sm'
                      }`}
                    >
                      {isActive && <motion.div layoutId="activeAccent" className="absolute left-0 top-1/2 h-[28px] w-[4px] -translate-y-1/2 rounded-full bg-[#0FC5C6] shadow-[0_0_10px_rgba(15,197,198,0.6)]" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                      <div className="relative flex items-center gap-3 flex-1 min-w-0">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-2 shadow-sm ${isActive ? 'bg-white border-white text-[#012D61]' : 'bg-[#E6F4EA] border-[#A7D8B8] text-[#028752]'}`}>
                          <item.icon className="h-[19px] w-[19px]" />
                        </div>
                        <AnimatePresence>
                          {!showCollapsed && (
                            <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} className="flex-1 min-w-0">
                              <div className="truncate font-sans text-[13px] font-bold tracking-tight">{item.label}</div>
                              <div className={`truncate font-sans text-[11px] leading-[1.1] mt-0.5 ${isActive ? 'text-white/70' : 'text-[#5A8AB0]'}`}>{state.hospitals.length} facilities</div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <AnimatePresence>
                        {!showCollapsed && (
                          <div className="flex items-center gap-1 ml-auto">
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.preventDefault(); setHospitalsExpanded(!hospitalsExpanded); }} className={`flex h-6 w-6 items-center justify-center rounded-[6px] border ${isActive ? 'bg-white/10 border-white/20 text-white' : 'bg-[#F0F7FF] border-[#B8D0E6] text-[#5A8AB0]'}`}>
                              <motion.div animate={{ rotate: hospitalsExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="h-3.5 w-3.5" />
                              </motion.div>
                            </motion.button>
                          </div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </NavLink>

                  <AnimatePresence>
                    {!showCollapsed && hospitalsExpanded && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="ml-4 space-y-1 overflow-hidden border-l-2 border-[#B8D0E6] pl-3">
                        {state.hospitals.length === 0 ? (
                          <div className="rounded-[8px] bg-[#FFFBEB] border-2 border-[#FDE68A] px-3 py-2 font-sans text-[11px] text-[#92400E]">No hospitals — add in Data Manager</div>
                        ) : (
                          state.hospitals.slice(0, 5).map(h => (
                            <div key={h.id} className="group rounded-[8px] bg-white border-2 border-[#E6EFF7] hover:border-[#2582A1]/30 hover:bg-[#F0F7FF] px-2.5 py-2 transition-colors">
                              <div className="flex items-center justify-between">
                                <span className="truncate font-sans text-[11px] font-semibold text-[#012D61] max-w-[140px]">{h.name.replace('RuralCare ','').slice(0,20)}</span>
                                <span className="font-mono text-[9px] tabular text-[#5A8AB0]">{h.specialists.length} specs</span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-1">
                                <Stethoscope className="h-3 w-3 text-[#0E9F6E]" />
                                <span className="font-sans text-[10px] text-[#1E4A6E]">Doctors: {state.doctors.filter(d => d.facilityId === h.id).length} · </span>
                                <span className="font-mono text-[10px] tabular text-[#028752]">{state.doctors.filter(d => d.facilityId === h.id && d.shiftStatus === 'on-duty').length} on</span>
                                <span className="font-mono text-[10px] tabular text-[#C41E3A]">· {state.doctors.filter(d => d.facilityId === h.id && d.shiftStatus === 'off-duty').length} off</span>
                              </div>
                            </div>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <NavLink key={item.id} to={item.path} onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)} className="block">
                <motion.div
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.35 }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`group relative flex h-[44px] items-center rounded-[12px] px-3 transition-all border-2 ${
                    isActive ? 'bg-[#012D61] border-[#012D61] text-white shadow-[0_4px_12px_rgba(1,45,97,0.15)]' : 'bg-white border-[#B8D0E6] text-[#1E4A6E] hover:border-[#2582A1] hover:bg-[#F0F7FF] hover:shadow-sm'
                  }`}
                >
                  {isActive && <motion.div layoutId="activeAccent" className="absolute left-0 top-1/2 h-[24px] w-[4px] -translate-y-1/2 rounded-full bg-[#0FC5C6] shadow-[0_0_8px_rgba(15,197,198,0.5)]" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
                  <div className="relative flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      animate={{ scale: isActive ? 1.1 : isHovered ? 1.05 : 1 }}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-2 shadow-sm transition-all`}
                      style={{ backgroundColor: isActive ? 'white' : isHovered ? item.color : item.bg, borderColor: isActive ? 'white' : item.color, color: isActive ? '#012D61' : isHovered ? 'white' : item.color }}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                    </motion.div>
                    <AnimatePresence>
                      {!showCollapsed && (
                        <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} className="flex-1 min-w-0">
                          <div className="truncate font-sans text-[13px] font-bold tracking-tight">{item.label}</div>
                          <div className={`truncate font-sans text-[11px] leading-[1.1] mt-0.5 ${isActive ? 'text-white/70' : 'text-[#5A8AB0]'}`}>{item.desc}</div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <AnimatePresence>
                    {!showCollapsed && item.badge && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={`ml-auto shrink-0 rounded-[8px] border-2 px-2 py-1 font-mono text-[10px] font-bold leading-none ${isActive ? 'bg-white/15 border-white/20 text-white' : item.badgeColor || 'bg-[#F0F7FF] border-[#B8D0E6] text-[#1E4A6E]'}`}>{item.badge}</motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="border-t-2 border-[#B8D0E6] bg-[#F0F7FF] p-3">
        <AnimatePresence>
          {!showCollapsed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              <div className="rounded-[10px] bg-white border-2 border-[#B8D0E6] p-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-[#028752] animate-pulse shadow-[0_0_6px_#028752]" />
                  <span className="font-sans text-[11px] font-bold tracking-tight text-[#012D61]">System Live</span>
                  <span className="ml-auto font-mono text-[10px] tabular text-[#5A8AB0]">{state.graph.nodeCount()}N · {state.graph.edgeCount()}E</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E6EFF7] border border-[#B8D0E6]/50">
                  <motion.div className="h-full bg-gradient-to-r from-[#012D61] to-[#0FC5C6]" initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 1 }} />
                </div>
              </div>
              <div className="px-1 font-mono text-[9px] uppercase tracking-widest text-[#5A8AB0]">Hover to expand · Auto slide · Calibri</div>
            </motion.div>
          ) : (
            <div className="flex justify-center">
              <div className="h-2 w-2 rounded-full bg-[#028752] animate-pulse" />
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
