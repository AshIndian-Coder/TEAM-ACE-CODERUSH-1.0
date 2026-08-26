import { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import { DEMO_DOCTORS } from '../lib/demoDoctors';
import { Stethoscope, MapPin, Clock, Search, Filter, UserCheck, UserX, Building2, Heart, Brain, Bone, Baby, Wind, Droplets, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const specialtyColors: Record<string, string> = {
  'Cardiologist': 'bg-[#FDE8EA] border-[#F5C2C7] text-[#C41E3A]',
  'Neurologist': 'bg-[#EDE9FE] border-[#DDD6FE] text-[#7C3AED]',
  'Orthopedic': 'bg-[#FEF3E2] border-[#FED7AA] text-[#E67E22]',
  'Pediatrician': 'bg-[#E0F7FF] border-[#B8E6FE] text-[#0078BF]',
  'General Surgeon': 'bg-[#E0F0F6] border-[#B8D9E8] text-[#2582A1]',
  'Pulmonologist': 'bg-[#E6F4EA] border-[#A7D8B8] text-[#028752]',
  'Gynaecologist': 'bg-[#FDF2F8] border-[#FBCFE8] text-[#BE185D]',
  'Trauma Specialist': 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]',
};

export function DoctorsPage() {
  const { state, hospitalRegistry, setDoctorOffDuty, setDoctorOnDuty } = useEngine();
  const [search, setSearch] = useState('');
  const [filterHospital, setFilterHospital] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'on-duty' | 'off-duty'>('all');
  const [doctors, setDoctors] = useState(DEMO_DOCTORS);

  const toggleDuty = (docId: string) => {
    setDoctors(prev => prev.map(d => {
      if (d.id === docId) {
        const newStatus = d.shiftStatus === 'on-duty' ? 'off-duty' : 'on-duty';
        // Update hospital registry specialists
        const hosp = state.hospitals.find(h => h.id === d.facilityId);
        if (hosp) {
          if (newStatus === 'off-duty') {
            setDoctorOffDuty(hosp.id, d.specialty);
          } else {
            setDoctorOnDuty(hosp.id, d.specialty);
          }
        }
        return { ...d, shiftStatus: newStatus };
      }
      return d;
    }));
  };

  const filtered = doctors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase());
    const matchesHospital = filterHospital === 'all' || d.facilityId === filterHospital;
    const matchesStatus = filterStatus === 'all' || d.shiftStatus === filterStatus;
    return matchesSearch && matchesHospital && matchesStatus;
  });

  const onDutyCount = doctors.filter(d => d.shiftStatus === 'on-duty').length;
  const offDutyCount = doctors.filter(d => d.shiftStatus === 'off-duty').length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#EEF4FA] p-6">
      <div className="mb-6">
        <h1 className="font-sans text-[26px] font-bold tracking-tight text-[#012D61]">Doctors Roster</h1>
        <p className="mt-1 font-sans text-[13px] text-[#1E4A6E]">Per-hospital on-duty / off-duty tracking · Affects facility eligibility in real-time · {doctors.length} doctors across 8 hospitals</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="rounded-[12px] border-2 border-[#B8D0E6] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#E6F4EA] border border-[#A7D8B8] text-[#028752]"><UserCheck className="h-4 w-4" /></div>
            <div>
              <div className="font-mono text-[20px] font-bold tabular text-[#012D61]">{onDutyCount}</div>
              <div className="font-sans text-[11px] font-medium text-[#1E4A6E]">On Duty</div>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border-2 border-[#B8D0E6] bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#FDE8EA] border border-[#F5C2C7] text-[#C41E3A]"><UserX className="h-4 w-4" /></div>
            <div>
              <div className="font-mono text-[20px] font-bold tabular text-[#012D61]">{offDutyCount}</div>
              <div className="font-sans text-[11px] font-medium text-[#1E4A6E]">Off Duty</div>
            </div>
          </div>
        </div>
        <div className="rounded-[12px] border-2 border-[#B8D0E6] bg-white p-4 shadow-sm col-span-2">
          <div className="font-sans text-[11px] font-bold uppercase tracking-wide text-[#5A8AB0]">Coverage by Specialty</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(doctors.reduce((acc, d) => {
              if (d.shiftStatus === 'on-duty') acc[d.specialty] = (acc[d.specialty] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)).map(([spec, count]) => (
              <span key={spec} className={`rounded-[6px] border px-2 py-1 font-mono text-[10px] font-medium ${specialtyColors[spec] || 'bg-white border-[#B8D0E6] text-[#1E4A6E]'}`}>{spec}: {count} on-duty</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-[360px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A8AB0]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search doctors or specialty..." className="h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white pl-9 pr-3 font-sans text-[13px] outline-none focus:border-[#2582A1]" />
        </div>
        <select value={filterHospital} onChange={e => setFilterHospital(e.target.value)} className="h-[40px] rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]">
          <option value="all">All Hospitals</option>
          {state.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
        <div className="flex rounded-[10px] border-2 border-[#B8D0E6] bg-white p-1">
          {(['all','on-duty','off-duty'] as const).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)} className={`rounded-[6px] px-3 py-1.5 font-sans text-[12px] font-medium capitalize ${filterStatus===f ? 'bg-[#012D61] text-white shadow-sm' : 'text-[#5A8AB0] hover:text-[#012D61]'}`}>{f.replace('-',' ')}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((doc, i) => {
          const Icon = specialtyIcons[doc.specialty] || Stethoscope;
          const hosp = state.hospitals.find(h => h.id === doc.facilityId);
          const isOnDuty = doc.shiftStatus === 'on-duty';
          return (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.03 }} whileHover={{ y: -2 }} className={`group overflow-hidden rounded-[12px] border-2 bg-white shadow-sm hover:shadow-[0_8px_24px_rgba(1,45,97,0.1)] transition-all ${isOnDuty ? 'border-[#A7D8B8] hover:border-[#6BBF8A]' : 'border-[#F5C2C7] hover:border-[#E8A0A8] bg-[#FFFBFB]'}`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[10px] border-2 shadow-sm ${isOnDuty ? 'bg-[#E6F4EA] border-[#A7D8B8] text-[#028752]' : 'bg-[#FDE8EA] border-[#F5C2C7] text-[#C41E3A]'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[14px] font-bold tracking-tight text-[#012D61]">{doc.name}</span>
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${isOnDuty ? 'bg-[#028752] text-white' : 'bg-[#C41E3A] text-white'}`}>{doc.shiftStatus}</span>
                    </div>
                    <div className={`mt-1 inline-flex rounded-[6px] border px-2 py-1 font-sans text-[11px] font-medium ${specialtyColors[doc.specialty] || 'bg-white border-[#B8D0E6] text-[#1E4A6E]'}`}>
                      {doc.specialty}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-[#1E4A6E]">
                      <Building2 className="h-3 w-3 text-[#5A8AB0]" /> {hosp?.name} · {doc.facilityId}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleDuty(doc.id)}
                    className={`flex h-8 w-16 items-center justify-center rounded-full border-2 p-1 transition-all ${isOnDuty ? 'bg-[#028752] border-[#028752] justify-end' : 'bg-[#E2E8F0] border-[#B8D0E6] justify-start'}`}
                  >
                    <div className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </motion.button>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-[8px] bg-[#F0F7FF] border border-[#B8D0E6] px-3 py-2">
                  <span className="font-mono text-[10px] uppercase tracking-wide text-[#5A8AB0]">Impact on Dispatch</span>
                  <span className={`font-mono text-[11px] font-medium ${isOnDuty ? 'text-[#028752]' : 'text-[#C41E3A]'}`}>{isOnDuty ? '✓ Eligible for dispatch' : '✕ Hospital loses this specialty'}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
