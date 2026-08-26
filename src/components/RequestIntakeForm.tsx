import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Crosshair, Info, Zap, Users, Activity } from 'lucide-react';
import { useEngine } from '../context/EngineContext';
import type { PatientRequest } from '../../engine/domain/types';
import { EMERGENCY_TYPES, SPECIALTIES, MEDICINES } from '../../engine/domain/types';
import { quickTriage } from '../lib/autoTriage';
import { useRealLocation } from '../hooks/useRealLocation';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function RequestIntakeForm({ open, onClose }: Props) {
  const { handleNewRequest, compareRequest, state } = useEngine();
  const { location: realLocation, loading: locLoading, getCurrentLocation, setManualLocation, isPreviewBlocked } = useRealLocation();
  
  const [patientName, setPatientName] = useState('');
  const [illness, setIllness] = useState(EMERGENCY_TYPES[0] as string);
  const [symptoms, setSymptoms] = useState('chest pain, difficulty breathing');
  const [description, setDescription] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const triage = quickTriage(illness, 45);

  const handleManual = () => {
    if (manualLat && manualLng) {
      setManualLocation(parseFloat(manualLat), parseFloat(manualLng), 'manual');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const villages = state.graph.getAllNodes().filter(n => n.type === 'village');
    let originNode = villages[0];
    let originName = villages[0]?.name || 'Custom Location';

    const loc = realLocation || (manualLat && manualLng ? { lat: parseFloat(manualLat), lng: parseFloat(manualLng) } : null);

    if (loc) {
      let minDist = Infinity;
      villages.forEach(v => {
        const dLat = v.lat - loc.lat;
        const dLng = v.lng - loc.lng;
        const dist = Math.sqrt(dLat*dLat + dLng*dLng);
        if (dist < minDist) {
          minDist = dist;
          originNode = v;
          originName = `${v.name} (Near ${loc.lat.toFixed(4)},${loc.lng.toFixed(4)})`;
        }
      });
      if (villages.length === 0) {
        originName = `Real Location: ${loc.lat.toFixed(4)},${loc.lng.toFixed(4)} · ${symptoms.slice(0,20)}`;
        originNode = { id: `v-${Date.now()}`, lat: loc.lat, lng: loc.lng, type: 'village', name: originName } as any;
      }
    }

    const req: PatientRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2,4)}`,
      patientId: `pat-${patientName.replace(/\s+/g,'').slice(0,8) || 'Unknown'}`,
      originNode: originNode?.id || `v-${Date.now()}`,
      originName: `${originName} · ${symptoms.slice(0,30)}`,
      emergencyType: illness as any,
      urgency: triage.urgency,
      specialtyRequired: SPECIALTIES[(EMERGENCY_TYPES as readonly string[]).indexOf(illness)] || 'General Surgeon',
      medicineRequired: MEDICINES[(EMERGENCY_TYPES as readonly string[]).indexOf(illness)] || 'Surgical Kit',
      medicineQty: 1,
      createdAt: Date.now(),
      status: 'QUEUED',
    };

    handleNewRequest(req);
    setTimeout(() => compareRequest(req), 300);
    onClose();
    setPatientName('');
    setSymptoms('chest pain, difficulty breathing');
    setDescription('');
    setManualLat('');
    setManualLng('');
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] flex items-center justify-center bg-[#012D61]/60 backdrop-blur-[2px] p-4">
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="w-[520px] max-h-[92vh] overflow-y-auto rounded-[16px] border-2 border-[#B8D0E6] bg-white shadow-[0_16px_48px_rgba(1,45,97,0.2)]">
          <div className="flex items-center justify-between border-b-2 border-[#B8D0E6] bg-gradient-to-r from-[#012D61] to-[#0A3A7A] px-5 py-4 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white shadow-sm">
                <Users className="h-4 w-4 text-[#012D61]" />
              </div>
              <div>
                <h3 className="font-sans text-[14px] font-bold tracking-tight text-white">Register Patient</h3>
                <p className="font-sans text-[11px] text-white/70">Name + Illness + Symptoms + Live Location</p>
              </div>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/10 border border-white/20 text-white/80 hover:bg-white/15 hover:text-white"><X className="h-4 w-4" /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div>
              <label className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Patient Name *</label>
              <input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="e.g., Ramesh Kumar" required className="mt-2 h-[44px] w-full rounded-[12px] border-2 border-[#B8D0E6] bg-white px-4 font-sans text-[14px] font-medium outline-none focus:border-[#2582A1] focus:shadow-[0_0_0_4px_rgba(37,130,161,0.12)]" />
            </div>

            <div>
              <label className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Illness / Emergency Type *</label>
              <select value={illness} onChange={e => setIllness(e.target.value)} className="mt-2 h-[44px] w-full rounded-[12px] border-2 border-[#B8D0E6] bg-white px-4 font-sans text-[14px] font-medium outline-none focus:border-[#2582A1]">
                {EMERGENCY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="mt-2 flex items-center gap-2 rounded-[10px] border-2 border-[#012D61] bg-[#012D61] px-3 py-2.5">
                <Activity className="h-4 w-4 text-[#0FC5C6]" />
                <span className="font-mono text-[11px] uppercase text-white/70">Auto Criticality:</span>
                <span className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-bold uppercase ${triage.urgency === 'CRITICAL' ? 'bg-[#C41E3A] text-white animate-pulse' : triage.urgency === 'HIGH' ? 'bg-[#F08122] text-white' : 'bg-white/20 text-white'}`}>{triage.urgency} · {triage.score}/100</span>
                <span className="ml-auto font-mono text-[10px] text-white/60">{triage.estimatedResponseTime}</span>
              </div>
            </div>

            <div>
              <label className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Symptoms Description *</label>
              <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Describe symptoms: chest pain, difficulty breathing, sweating, nausea, dizziness..." rows={3} required className="mt-2 w-full rounded-[12px] border-2 border-[#B8D0E6] bg-white px-4 py-3 font-sans text-[13px] outline-none focus:border-[#2582A1] resize-none" />
              <div className="mt-1 font-sans text-[10px] text-[#5A8AB0]">Detailed symptoms help auto triage set correct criticality</div>
            </div>

            <div>
              <label className="font-sans text-[12px] font-semibold text-[#012D61]">Illness Description (Optional)</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Onset, duration, past history..." rows={2} className="mt-1.5 w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 py-2 font-sans text-[12px] outline-none focus:border-[#2582A1] resize-none" />
            </div>

            <div className="rounded-[12px] border-2 border-[#B8D0E6] bg-[#F0F7FF] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Navigation className="h-4 w-4 text-[#012D61]" />
                <span className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Live Location</span>
                {realLocation && <span className="ml-auto rounded-full bg-[#028752] px-2 py-1 font-mono text-[10px] font-bold text-white flex items-center gap-1"><div className="h-1 w-1 rounded-full bg-white animate-pulse" />Live</span>}
              </div>

              {isPreviewBlocked ? (
                <div className="space-y-3">
                  <div className="rounded-[10px] border-2 border-[#FED7AA] bg-[#FEF3E2] p-3">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 text-[#E67E22] shrink-0 mt-0.5" />
                      <div className="font-sans text-[11px] leading-[1.4] text-[#7C2D12]"><b>Preview blocks GPS.</b> In production (Vercel), real GPS works. Use manual below.</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={manualLat} onChange={e => setManualLat(e.target.value)} placeholder="Lat 19.0760" className="h-[40px] rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[12px] tabular font-medium outline-none focus:border-[#2582A1]" />
                    <input value={manualLng} onChange={e => setManualLng(e.target.value)} placeholder="Lng 72.8777" className="h-[40px] rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[12px] tabular font-medium outline-none focus:border-[#2582A1]" />
                  </div>
                  <button type="button" onClick={handleManual} className="flex h-[36px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#E67E22] font-sans text-[12px] font-bold text-white hover:bg-[#D46A1A]"><Crosshair className="h-4 w-4" /> Set Manual Location</button>
                  {realLocation && <div className="rounded-[10px] bg-white border-2 border-[#A7D8B8] p-2.5 font-mono text-[11px] tabular font-bold text-[#012D61]">{realLocation.lat.toFixed(6)}, {realLocation.lng.toFixed(6)} · ±{realLocation.accuracy.toFixed(0)}m · {realLocation.source}</div>}
                </div>
              ) : (
                <div className="space-y-3">
                  <button type="button" onClick={getCurrentLocation} className="flex h-[40px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#012D61] font-sans text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(1,45,97,0.2)] hover:bg-[#0A3A7A]">
                    <Navigation className="h-4 w-4" /> {realLocation ? 'Update Real Location' : 'Get My Real Location'}
                  </button>
                  {realLocation && <div className="rounded-[10px] bg-white border-2 border-[#A7D8B8] p-2.5 font-mono text-[11px] tabular font-bold text-[#012D61]">{realLocation.lat.toFixed(6)}, {realLocation.lng.toFixed(6)} · ±{realLocation.accuracy.toFixed(0)}m · {realLocation.source}</div>}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="h-[44px] flex-1 rounded-[12px] border-2 border-[#B8D0E6] bg-white font-sans text-[13px] font-semibold text-[#1E4A6E] hover:bg-[#F0F7FF]">Cancel</button>
              <button type="submit" disabled={!patientName} className="h-[44px] flex-[1.5] rounded-[12px] bg-[#012D61] font-sans text-[13px] font-bold tracking-tight text-white shadow-[0_4px_12px_rgba(1,45,97,0.2)] hover:bg-[#0A3A7A] disabled:opacity-40 flex items-center justify-center gap-2">
                <Zap className="h-4 w-4" /> Register as {triage.urgency}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
