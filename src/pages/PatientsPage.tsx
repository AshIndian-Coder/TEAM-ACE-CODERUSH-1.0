import { useEngine } from '../context/EngineContext';
import { useState } from 'react';
import { Users, Clock, MapPin, Search, Zap, Heart, Brain, Bone, Baby, Stethoscope, Wind, Droplets, AlertTriangle, Navigation, Crosshair, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { quickTriage } from '../lib/autoTriage';
import type { PatientRequest } from '../../engine/domain/types';
import { EMERGENCY_TYPES, SPECIALTIES, MEDICINES } from '../../engine/domain/types';
import { useRealLocation } from '../hooks/useRealLocation';

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

export function PatientsPage() {
  const { state, handleNewRequest } = useEngine();
  const [search, setSearch] = useState('');
  const [showRegistration, setShowRegistration] = useState(false);
  const { location: realLocation, loading: locLoading, getCurrentLocation, setManualLocation, error: locError, isPreviewBlocked } = useRealLocation();

  const [form, setForm] = useState({
    patientName: '',
    illness: EMERGENCY_TYPES[0] as string,
    symptoms: '',
    description: '',
    manualLat: '',
    manualLng: '',
  });

  const triageResult = quickTriage(form.illness, 45);

  const handleUseManualLocation = () => {
    if (form.manualLat && form.manualLng) {
      setManualLocation(parseFloat(form.manualLat), parseFloat(form.manualLng), 'manual');
    }
  };

  const handleMapClickLocation = () => {
    const lat = 19.0760 + (Math.random() - 0.5) * 0.1;
    const lng = 72.8777 + (Math.random() - 0.5) * 0.1;
    setManualLocation(lat, lng, 'map-click');
    setForm({ ...form, manualLat: lat.toFixed(6), manualLng: lng.toFixed(6) });
  };

  const handleRegister = () => {
    const villages = state.graph.getAllNodes().filter(n => n.type === 'village');
    let originNode = villages[0];
    let originName: string = villages[0]?.name || 'Custom Location';

    const effectiveLocation = realLocation || (form.manualLat && form.manualLng ? { lat: parseFloat(form.manualLat), lng: parseFloat(form.manualLng), lng2: 0 } as any : null);
    const loc = realLocation || (form.manualLat && form.manualLng ? { lat: parseFloat(form.manualLat), lng: parseFloat(form.manualLng) } : null);

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
        originName = `Real Location: ${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
        if (state.hospitals.length > 0) {
          originNode = { id: state.hospitals[0].nodeId, lat: loc.lat, lng: loc.lng, type: 'village', name: originName } as any;
        } else {
          originNode = { id: `v-${Date.now()}`, lat: loc.lat, lng: loc.lng, type: 'village', name: originName } as any;
        }
      }
    } else {
      if (villages.length > 0) {
        originNode = villages[Math.floor(Math.random() * villages.length)];
        originName = originNode.name || 'Custom Location';
      } else if (state.hospitals.length > 0) {
        originNode = { id: state.hospitals[0].nodeId, lat: 0, lng: 0, type: 'village', name: 'Near Hospital' } as any;
        originName = 'Near Hospital';
      } else {
        originNode = { id: `v-${Date.now()}`, lat: 19.0760, lng: 72.8777, type: 'village', name: 'Mumbai (Default)' } as any;
        originName = 'Mumbai (Default)';
      }
    }

    const req: PatientRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2,4)}`,
      patientId: `pat-${form.patientName.replace(/\s+/g,'').slice(0,8) || 'Unknown'}`,
      originNode: originNode?.id || `v-${Date.now()}`,
      originName: `${originName} · ${form.symptoms.slice(0,30)}`,
      emergencyType: form.illness as any,
      urgency: triageResult.urgency,
      specialtyRequired: SPECIALTIES[(EMERGENCY_TYPES as readonly string[]).indexOf(form.illness)] || 'General Surgeon',
      medicineRequired: MEDICINES[(EMERGENCY_TYPES as readonly string[]).indexOf(form.illness)] || 'Surgical Kit',
      medicineQty: 1,
      createdAt: Date.now(),
      status: 'QUEUED',
    };
    handleNewRequest(req);
    setShowRegistration(false);
    setForm({ patientName: '', illness: EMERGENCY_TYPES[0] as string, symptoms: '', description: '', manualLat: '', manualLng: '' });
  };

  const filteredRequests = state.requests.filter(r => 
    r.id.toLowerCase().includes(search.toLowerCase()) || 
    r.emergencyType.toLowerCase().includes(search.toLowerCase()) ||
    r.originName?.toLowerCase().includes(search.toLowerCase()) ||
    r.patientId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#EEF4FA] p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-sans text-[26px] font-bold tracking-tight text-[#012D61]">Patient Registration</h1>
          <p className="mt-1 font-sans text-[13px] text-[#1E4A6E]">Only name, illness, live location · Auto triage sets criticality · {state.requests.length} total · {state.requests.filter(r=>r.status!=='COMPLETED').length} active</p>
        </div>
        <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={() => setShowRegistration(!showRegistration)} className="flex h-[42px] items-center gap-2 rounded-[12px] bg-[#012D61] px-5 font-sans text-[13px] font-bold tracking-tight text-white shadow-[0_4px_12px_rgba(1,45,97,0.2)] hover:bg-[#0A3A7A]">
          <Zap className="h-4 w-4" /> {showRegistration ? 'Close' : 'Register Patient'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showRegistration && (
          <motion.div initial={{ opacity: 0, y: -12, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -12, height: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="mb-6 overflow-hidden rounded-[16px] border-2 border-[#B8D0E6] bg-white shadow-[0_8px_24px_rgba(1,45,97,0.08)]">
            <div className="border-b-2 border-[#B8D0E6] bg-gradient-to-r from-[#012D61] to-[#0A3A7A] px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-white shadow-sm">
                  <Users className="h-5 w-5 text-[#012D61]" />
                </div>
                <div>
                  <h3 className="font-sans text-[15px] font-bold tracking-tight text-white">Register Patient Illness</h3>
                  <p className="font-sans text-[11px] text-white/70">Name + Illness + Live Location only · Calibri</p>
                </div>
              </div>
              <span className="rounded-full bg-[#0FC5C6] px-3 py-1 font-mono text-[11px] font-bold uppercase text-[#012D61]">Simple & Fast</span>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Patient Name */}
                <div>
                  <label className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Patient Name *</label>
                  <input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} placeholder="e.g., Ramesh Kumar" className="mt-2 h-[48px] w-full rounded-[12px] border-2 border-[#B8D0E6] bg-white px-4 font-sans text-[14px] font-medium outline-none focus:border-[#2582A1] focus:shadow-[0_0_0_4px_rgba(37,130,161,0.12)] transition-all" />
                  <div className="mt-1.5 font-sans text-[11px] text-[#5A8AB0]">Full name of patient</div>
                </div>

                {/* Illness */}
                <div>
                  <label className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Illness / Emergency *</label>
                  <select value={form.illness} onChange={e => setForm({ ...form, illness: e.target.value })} className="mt-2 h-[48px] w-full rounded-[12px] border-2 border-[#B8D0E6] bg-white px-4 font-sans text-[14px] font-medium outline-none focus:border-[#2582A1] focus:shadow-[0_0_0_4px_rgba(37,130,161,0.12)]">
                    {EMERGENCY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="mt-1.5 font-sans text-[11px] text-[#5A8AB0]">Select patient's illness type</div>
                </div>

                {/* Auto Triage Preview */}
                <div className="rounded-[12px] border-2 border-[#012D61] bg-[#012D61] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[11px] font-bold uppercase tracking-wide text-white/70">Auto Criticality</span>
                    <motion.span key={triageResult.urgency} initial={{ scale: 0.8 }} animate={{ scale: 1 }} className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase ${triageResult.urgency === 'CRITICAL' ? 'bg-[#C41E3A] text-white' : triageResult.urgency === 'HIGH' ? 'bg-[#E67E22] text-white' : 'bg-white/20 text-white'}`}>
                      {triageResult.urgency}
                    </motion.span>
                  </div>
                  <div className="mt-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/15"><motion.div className={`h-full ${triageResult.score >= 85 ? 'bg-[#C41E3A]' : triageResult.score >= 65 ? 'bg-[#F08122]' : 'bg-[#0FC5C6]'}`} initial={{ width: 0 }} animate={{ width: `${triageResult.score}%` }} transition={{ duration: 0.5 }} /></div>
                    <div className="mt-2 font-sans text-[12px] font-medium leading-[1.3]">{triageResult.reasons[0]}</div>
                    <div className="mt-1 font-mono text-[11px] text-white/70">{triageResult.estimatedResponseTime} · Score {triageResult.score}/100</div>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-6">
                <div>
                  <label className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Symptoms *</label>
                  <input value={form.symptoms} onChange={e => setForm({ ...form, symptoms: e.target.value })} placeholder="e.g., chest pain, difficulty breathing, sweating, nausea" className="mt-2 h-[44px] w-full rounded-[12px] border-2 border-[#B8D0E6] bg-white px-4 font-sans text-[13px] outline-none focus:border-[#2582A1]" />
                  <div className="mt-1 font-sans text-[11px] text-[#5A8AB0]">Comma-separated symptoms for auto triage</div>
                </div>
                <div>
                  <label className="font-sans text-[13px] font-bold tracking-tight text-[#012D61]">Illness Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe onset, duration, severity, past history..." rows={2} className="mt-2 h-[44px] w-full rounded-[12px] border-2 border-[#B8D0E6] bg-white px-4 py-2.5 font-sans text-[13px] outline-none focus:border-[#2582A1] resize-none" />
                  <div className="mt-1 font-sans text-[11px] text-[#5A8AB0]">Detailed description helps doctors</div>
                </div>
              </div>

              {/* Live Location - Full Width */}
              <div className="mt-6 rounded-[14px] border-2 border-[#B8D0E6] bg-[#F0F7FF] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#012D61] text-white">
                    <Navigation className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-sans text-[14px] font-bold tracking-tight text-[#012D61]">Live Location</div>
                    <div className="font-mono text-[11px] text-[#5A8AB0]">Real GPS from your device · Used as patient origin</div>
                  </div>
                  {realLocation && <span className="ml-auto rounded-full bg-[#028752] px-3 py-1 font-mono text-[11px] font-bold text-white flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />GPS Live</span>}
                </div>

                {isPreviewBlocked ? (
                  <div className="rounded-[12px] border-2 border-[#FED7AA] bg-[#FEF3E2] p-4">
                    <div className="flex gap-3">
                      <Info className="h-5 w-5 text-[#E67E22] shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-sans text-[13px] font-bold text-[#9A3412]">Arena Preview Blocks Real GPS (Permissions Policy)</div>
                        <div className="mt-1 font-sans text-[12px] leading-[1.4] text-[#7C2D12]">The preview iframe disables geolocation for security. <b>In production (Vercel / localhost), your real GPS will work automatically.</b> For preview, use manual entry or map click below.</div>
                        
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-mono text-[11px] uppercase font-bold text-[#9A3412]">Latitude</label>
                            <input value={form.manualLat} onChange={e => setForm({ ...form, manualLat: e.target.value })} placeholder="19.0760" className="mt-1 h-[40px] w-full rounded-[10px] border-2 border-[#FED7AA] bg-white px-3 font-mono text-[13px] tabular font-medium outline-none focus:border-[#E67E22]" />
                          </div>
                          <div>
                            <label className="font-mono text-[11px] uppercase font-bold text-[#9A3412]">Longitude</label>
                            <input value={form.manualLng} onChange={e => setForm({ ...form, manualLng: e.target.value })} placeholder="72.8777" className="mt-1 h-[40px] w-full rounded-[10px] border-2 border-[#FED7AA] bg-white px-3 font-mono text-[13px] tabular font-medium outline-none focus:border-[#E67E22]" />
                          </div>
                        </div>
                        
                        <div className="mt-3 flex gap-2">
                          <button type="button" onClick={handleUseManualLocation} className="flex h-[40px] flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#E67E22] font-sans text-[12px] font-bold text-white shadow-[0_2px_8px_rgba(230,126,34,0.25)] hover:bg-[#D46A1A]">
                            <Crosshair className="h-4 w-4" /> Set Manual Location
                          </button>
                          <button type="button" onClick={handleMapClickLocation} className="flex h-[40px] flex-1 items-center justify-center gap-2 rounded-[10px] border-2 border-[#FED7AA] bg-white font-sans text-[12px] font-bold text-[#9A3412] hover:bg-[#FFF7ED]">
                            <MapPin className="h-4 w-4" /> Simulate Map Click (Mumbai)
                          </button>
                        </div>

                        {realLocation && (
                          <div className="mt-3 rounded-[10px] bg-white border-2 border-[#A7D8B8] p-3">
                            <div className="font-mono text-[11px] font-bold text-[#028752] flex items-center gap-1.5"><Crosshair className="h-3.5 w-3.5" /> {realLocation.source === 'manual' ? 'Manual Location Set' : 'Map Click Location'}</div>
                            <div className="mt-1 font-mono text-[13px] tabular font-bold text-[#012D61]">{realLocation.lat.toFixed(6)}, {realLocation.lng.toFixed(6)}</div>
                            <div className="font-mono text-[10px] text-[#5A8AB0]">Accuracy ±{realLocation.accuracy.toFixed(0)}m · Source: {realLocation.source}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button type="button" onClick={getCurrentLocation} disabled={locLoading} className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border-2 border-[#012D61] bg-[#012D61] font-sans text-[13px] font-bold tracking-tight text-white shadow-[0_4px_12px_rgba(1,45,97,0.2)] hover:bg-[#0A3A7A] disabled:opacity-50 transition-all">
                      <Navigation className="h-5 w-5" /> {locLoading ? 'Getting Your Real Location...' : realLocation ? 'Update Real Location' : 'Get My Real Location (GPS)'}
                    </button>

                    {realLocation ? (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-[12px] bg-white border-2 border-[#A7D8B8] p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#028752] text-white"><Crosshair className="h-4 w-4" /></div>
                            <div>
                              <div className="font-sans text-[13px] font-bold text-[#065F46]">Real Location Captured</div>
                              <div className="font-mono text-[11px] text-[#5A8AB0]">Will be used as patient origin</div>
                            </div>
                          </div>
                          <div className="h-2 w-2 rounded-full bg-[#028752] animate-pulse shadow-[0_0_6px_#028752]" />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-[8px] bg-[#F0F7FF] border border-[#B8D0E6] p-2.5">
                            <div className="font-mono text-[10px] uppercase tracking-wide text-[#5A8AB0]">Coordinates</div>
                            <div className="mt-1 font-mono text-[13px] tabular font-bold text-[#012D61]">{realLocation.lat.toFixed(6)}, {realLocation.lng.toFixed(6)}</div>
                          </div>
                          <div className="rounded-[8px] bg-[#F0F7FF] border border-[#B8D0E6] p-2.5">
                            <div className="font-mono text-[10px] uppercase tracking-wide text-[#5A8AB0]">Accuracy</div>
                            <div className="mt-1 font-mono text-[13px] tabular font-bold text-[#012D61]">±{realLocation.accuracy.toFixed(0)}m · {realLocation.source}</div>
                            <div className="font-mono text-[10px] text-[#5A8AB0]">{new Date(realLocation.timestamp).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="rounded-[10px] border-2 border-dashed border-[#B8D0E6] bg-white p-4 text-center">
                        <MapPin className="h-6 w-6 text-[#B8D0E6] mx-auto" />
                        <div className="mt-2 font-sans text-[12px] font-medium text-[#1E4A6E]">No location yet — click "Get My Real Location" to use your actual GPS</div>
                        <div className="font-mono text-[10px] text-[#5A8AB0] mt-1">In production, this uses your real device GPS. In preview, use manual entry.</div>
                      </div>
                    )}

                    {locError && locError !== 'PREVIEW_BLOCKED' && <div className="rounded-[10px] bg-[#FDE8EA] border-2 border-[#F5C2C7] p-3 font-mono text-[11px] text-[#C41E3A]">{locError}</div>}
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <button type="button" onClick={() => setShowRegistration(false)} className="h-[48px] flex-1 rounded-[12px] border-2 border-[#B8D0E6] bg-white font-sans text-[14px] font-semibold text-[#1E4A6E] hover:bg-[#F0F7FF]">Cancel</button>
                <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={handleRegister} disabled={!form.patientName} className="h-[48px] flex-[2] rounded-[12px] bg-[#012D61] font-sans text-[14px] font-bold tracking-tight text-white shadow-[0_4px_16px_rgba(1,45,97,0.25)] hover:bg-[#0A3A7A] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  <Zap className="h-5 w-5" /> Register Patient as {triageResult.urgency}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-[14px] border-2 border-[#B8D0E6] bg-white shadow-[0_2px_8px_rgba(1,45,97,0.06)] overflow-hidden">
        <div className="flex h-[56px] items-center justify-between border-b-2 border-[#B8D0E6] bg-[#F0F7FF] px-5">
          <h2 className="font-sans text-[15px] font-bold tracking-tight text-[#012D61]">Registered Patients — {filteredRequests.length} total</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A8AB0]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients, illness..." className="h-[36px] w-[320px] rounded-[10px] border-2 border-[#B8D0E6] bg-white pl-9 pr-3 font-sans text-[12px] outline-none focus:border-[#2582A1]" />
          </div>
        </div>
        <div className="divide-y divide-[#E6EFF7]">
          {filteredRequests.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="h-12 w-12 text-[#B8D0E6] mx-auto" />
              <div className="mt-4 font-sans text-[15px] font-bold text-[#012D61]">No patients registered</div>
              <div className="mt-1 font-sans text-[12px] text-[#1E4A6E]">Register with name, illness, live location only</div>
            </div>
          ) : (
            filteredRequests.slice(-20).reverse().map((req, idx) => {
              const Icon = specialtyIcons[req.specialtyRequired] || Stethoscope;
              return (
                <motion.div key={req.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx*0.02 }} className="flex items-center gap-4 p-4 hover:bg-[#F0F7FF] transition-colors">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[10px] border-2 shadow-sm ${req.urgency === 'CRITICAL' ? 'bg-[#FDE8EA] border-[#F5C2C7] text-[#C41E3A]' : req.urgency === 'HIGH' ? 'bg-[#FEF0E0] border-[#FED7AA] text-[#E67E22]' : 'bg-[#F0F7FF] border-[#B8D0E6] text-[#5A8AB0]'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-sans text-[14px] font-bold tracking-tight text-[#012D61]">{req.patientId.replace('pat-','').split('-')[0] || 'Patient'}</span>
                      <span className="font-mono text-[11px] tabular text-[#5A8AB0]">· {req.id.slice(0,8)}</span>
                      <span className={`rounded-[6px] border-2 px-2 py-1 font-mono text-[10px] font-bold uppercase ${req.urgency === 'CRITICAL' ? 'border-[#F5C2C7] bg-[#FDE8EA] text-[#C41E3A]' : 'border-[#B8D0E6] bg-[#F0F7FF] text-[#1E4A6E]'}`}>{req.urgency}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 font-sans text-[12px] text-[#1E4A6E]">
                      <span className="font-medium text-[#012D61]">{req.emergencyType}</span>
                      <span className="text-[#B8D0E6]">·</span>
                      <MapPin className="h-3 w-3 text-[#5A8AB0]" />{req.originName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex rounded-full border-2 px-3 py-1 font-mono text-[11px] font-bold ${req.status === 'COMPLETED' ? 'border-[#A7D8B8] bg-[#E0F2E8] text-[#028752]' : 'border-[#B8D0E6] bg-[#F0F7FF] text-[#1E4A6E]'}`}>{req.status}</div>
                    <div className="mt-1 font-mono text-[11px] tabular text-[#5A8AB0] flex items-center gap-1 justify-end"><Clock className="h-3 w-3" />{new Date(req.createdAt).toLocaleTimeString()}</div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
