import { useState } from 'react';
import { useEngine } from '../context/EngineContext';
import { motion } from 'framer-motion';
import { 
  Building2, MapPin, Truck, Stethoscope, Route, Plus, Trash2, 
  Navigation, Crosshair, Database, Upload, Download, AlertTriangle, Info, Shuffle
} from 'lucide-react';
import { useRealLocation } from '../hooks/useRealLocation';
import type { GraphNode, RoadEdge, Hospital, Ambulance, Doctor } from '../../engine/domain/types';
import { SPECIALTIES, MEDICINES } from '../../engine/domain/types';

export function DataManagerPage() {
  const { state, addNode, addEdge, addHospital, addAmbulance, addDoctor, clearAllData, loadSample, realLocation } = useEngine();
  const { location: gps, getCurrentLocation, setManualLocation, loading: gpsLoading, isPreviewBlocked } = useRealLocation();

  const [activeTab, setActiveTab] = useState<'hospital' | 'village' | 'road' | 'ambulance' | 'doctor'>('hospital');

  const [villageForm, setVillageForm] = useState({ name: '', lat: '', lng: '' });
  const [hospitalForm, setHospitalForm] = useState({ name: '', lat: '', lng: '', beds: 20, specialists: [] as string[], medicines: {} as Record<string, number> });
  const [roadForm, setRoadForm] = useState({ from: '', to: '', travelTime: 10, distance: 5 });
  const [ambulanceForm, setAmbulanceForm] = useState({ id: '', nodeId: '', lat: '', lng: '', useManualGps: false });
  const [doctorForm, setDoctorForm] = useState({ name: '', specialty: SPECIALTIES[0] as string, hospitalId: '', status: 'on-duty' as Doctor['shiftStatus'] });

  // Spread GPS locations so graph is visible — not all same point
  const spreadLocation = (baseLat: number, baseLng: number, spreadKm: number = 3) => {
    const offsetLat = (Math.random() - 0.5) * (spreadKm / 111);
    const offsetLng = (Math.random() - 0.5) * (spreadKm / (111 * Math.cos(baseLat * Math.PI / 180)));
    return { lat: baseLat + offsetLat, lng: baseLng + offsetLng };
  };

  const useGpsForVillage = () => {
    const base = gps || realLocation;
    if (base) {
      const spread = spreadLocation(base.lat, base.lng, 5);
      setVillageForm({ ...villageForm, lat: spread.lat.toFixed(6), lng: spread.lng.toFixed(6) });
    } else {
      getCurrentLocation();
    }
  };

  const useGpsForHospital = () => {
    const base = gps || realLocation;
    if (base) {
      const spread = spreadLocation(base.lat, base.lng, 4);
      setHospitalForm({ ...hospitalForm, lat: spread.lat.toFixed(6), lng: spread.lng.toFixed(6) });
    } else {
      getCurrentLocation();
    }
  };

  const useGpsForAmbulance = () => {
    const base = gps || realLocation;
    if (base) {
      const spread = spreadLocation(base.lat, base.lng, 3);
      setAmbulanceForm({ ...ambulanceForm, lat: spread.lat.toFixed(6), lng: spread.lng.toFixed(6), useManualGps: true });
    } else {
      getCurrentLocation();
    }
  };

  const handleAddVillage = () => {
    if (!villageForm.name || !villageForm.lat || !villageForm.lng) return;
    const node: GraphNode = {
      id: `v-${Date.now()}`,
      name: villageForm.name,
      lat: parseFloat(villageForm.lat),
      lng: parseFloat(villageForm.lng),
      type: 'village',
    };
    addNode(node);
    setVillageForm({ name: '', lat: '', lng: '' });
  };

  const handleAddHospital = () => {
    if (!hospitalForm.name || !hospitalForm.lat || !hospitalForm.lng) return;
    const nodeId = `h-${Date.now()}`;
    const node: GraphNode = {
      id: nodeId,
      name: hospitalForm.name,
      lat: parseFloat(hospitalForm.lat),
      lng: parseFloat(hospitalForm.lng),
      type: 'hospital',
    };
    const medicines: Hospital['medicines'] = {};
    Object.entries(hospitalForm.medicines).forEach(([name, qty]) => {
      if (qty > 0) medicines[name] = { available: qty, reserved: 0, total: qty };
    });
    if (Object.keys(medicines).length === 0) medicines['Surgical Kit'] = { available: 10, reserved: 0, total: 10 };

    const hospital: Hospital = {
      id: nodeId,
      nodeId: nodeId,
      name: hospitalForm.name,
      specialists: hospitalForm.specialists.length > 0 ? hospitalForm.specialists : ['General Surgeon'],
      bedsTotal: hospitalForm.beds,
      bedsAvailable: hospitalForm.beds,
      bedsReserved: 0,
      medicines,
      status: 'operational',
    };
    addHospital(hospital, node);
    setHospitalForm({ name: '', lat: '', lng: '', beds: 20, specialists: [], medicines: {} });
  };

  const handleAddRoad = () => {
    if (!roadForm.from || !roadForm.to) return;
    const fromNode = state.graph.getNode(roadForm.from);
    const toNode = state.graph.getNode(roadForm.to);
    if (!fromNode || !toNode) return;
    const dLat = toNode.lat - fromNode.lat;
    const dLng = toNode.lng - fromNode.lng;
    const distKm = Math.sqrt(dLat*dLat + dLng*dLng) * 111;
    const edge: RoadEdge = {
      id: `${roadForm.from}->${roadForm.to}`,
      from: roadForm.from,
      to: roadForm.to,
      travelTime: roadForm.travelTime,
      distance: roadForm.distance || distKm,
      status: 'open',
    };
    addEdge(edge);
    setRoadForm({ from: '', to: '', travelTime: 10, distance: 5 });
  };

  const handleAddAmbulance = () => {
    if (!ambulanceForm.id) return;

    // If manual GPS enabled, create a new node at that location for ambulance
    if (ambulanceForm.useManualGps && ambulanceForm.lat && ambulanceForm.lng) {
      const nodeId = `amb-node-${Date.now()}`;
      const node: GraphNode = {
        id: nodeId,
        name: `Ambulance Base ${ambulanceForm.id}`,
        lat: parseFloat(ambulanceForm.lat),
        lng: parseFloat(ambulanceForm.lng),
        type: 'hospital', // Ambulance base treated as hospital node for routing
      };
      // Add node first
      addNode(node);
      // Then add ambulance at that node
      setTimeout(() => {
        const amb: Ambulance = {
          id: ambulanceForm.id,
          nodeId: nodeId,
          baseNodeId: nodeId,
          status: 'AVAILABLE',
          currentRequestId: null,
        };
        addAmbulance(amb);
      }, 100);
    } else {
      if (!ambulanceForm.nodeId) return;
      const amb: Ambulance = {
        id: ambulanceForm.id,
        nodeId: ambulanceForm.nodeId,
        baseNodeId: ambulanceForm.nodeId,
        status: 'AVAILABLE',
        currentRequestId: null,
      };
      addAmbulance(amb);
    }
    setAmbulanceForm({ id: '', nodeId: '', lat: '', lng: '', useManualGps: false });
  };

  const handleAddDoctor = () => {
    if (!doctorForm.name || !doctorForm.hospitalId) return;
    const doc: Doctor = {
      id: `doc-${Date.now()}`,
      name: doctorForm.name,
      specialty: doctorForm.specialty,
      facilityId: doctorForm.hospitalId,
      shiftStatus: doctorForm.status,
    };
    addDoctor(doc);
    setDoctorForm({ name: '', specialty: SPECIALTIES[0] as string, hospitalId: '', status: 'on-duty' });
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state.rawData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roumi-data-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#EEF4FA] p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-sans text-[26px] font-bold tracking-tight text-[#012D61] flex items-center gap-3">
            <Database className="h-7 w-7 text-[#2582A1]" /> Data Manager
            <span className="rounded-[8px] bg-[#012D61] px-2.5 py-1 font-mono text-[11px] font-bold text-white">Real Data Only</span>
          </h1>
          <p className="mt-1 font-sans text-[13px] text-[#1E4A6E]">Add real hospitals, villages, roads, ambulances, doctors with manual GPS · Each gets unique location so graph & ambulance travel visible</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSample} className="flex h-[40px] items-center gap-2 rounded-[10px] border-2 border-[#B8D0E6] bg-white px-4 font-sans text-[13px] font-medium text-[#1E4A6E] shadow-sm hover:bg-[#F0F7FF]">
            <Upload className="h-4 w-4" /> Load Sample Near GPS
          </button>
          <button onClick={exportData} className="flex h-[40px] items-center gap-2 rounded-[10px] border-2 border-[#B8D0E6] bg-white px-4 font-sans text-[13px] font-medium text-[#1E4A6E] shadow-sm hover:bg-[#F0F7FF]">
            <Download className="h-4 w-4" /> Export JSON
          </button>
          <button onClick={clearAllData} className="flex h-[40px] items-center gap-2 rounded-[10px] bg-[#C41E3A] px-4 font-sans text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(196,30,58,0.2)] hover:bg-[#A51A30]">
            <Trash2 className="h-4 w-4" /> Clear All
          </button>
        </div>
      </div>

      {realLocation && (
        <div className="mb-6 rounded-[12px] border-2 border-[#A7D8B8] bg-[#E6F4EA] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#028752] text-white shadow-sm">
              <Crosshair className="h-5 w-5" />
            </div>
            <div>
              <div className="font-sans text-[13px] font-bold text-[#065F46]">Your Real Location: {realLocation.lat.toFixed(6)}, {realLocation.lng.toFixed(6)}</div>
              <div className="font-mono text-[11px] tabular text-[#1E4A6E]">Accuracy ±{realLocation.accuracy.toFixed(0)}m · Each new entry gets random offset so graph spreads visibly</div>
            </div>
          </div>
          <div className="font-mono text-[11px] text-[#028752] flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-[#028752] animate-pulse" />GPS Active</div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Villages', value: state.graph.getAllNodes().filter(n=>n.type==='village').length, icon: MapPin, color: 'text-[#2582A1]', bg: 'bg-[#E0F0F6]' },
          { label: 'Hospitals', value: state.hospitals.length, icon: Building2, color: 'text-[#028752]', bg: 'bg-[#E6F4EA]' },
          { label: 'Roads', value: state.graph.edgeCount(), icon: Route, color: 'text-[#7C3AED]', bg: 'bg-[#EDE9FE]' },
          { label: 'Ambulances', value: state.ambulances.length, icon: Truck, color: 'text-[#0078BF]', bg: 'bg-[#E0F0F6]' },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-[12px] border-2 border-[#B8D0E6] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-[8px] border-2 ${kpi.bg} border-[#B8D0E6] ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
              <div>
                <div className="font-mono text-[20px] font-bold tabular text-[#012D61]">{kpi.value}</div>
                <div className="font-sans text-[11px] font-medium text-[#1E4A6E]">{kpi.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2 mb-6">
        {[
          { id: 'hospital', label: 'Add Hospital', icon: Building2 },
          { id: 'village', label: 'Add Village', icon: MapPin },
          { id: 'road', label: 'Add Road', icon: Route },
          { id: 'ambulance', label: 'Add Ambulance', icon: Truck },
          { id: 'doctor', label: 'Add Doctor', icon: Stethoscope },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex h-[48px] items-center justify-center gap-2 rounded-[12px] border-2 font-sans text-[13px] font-semibold transition-all ${activeTab === tab.id ? 'bg-[#012D61] border-[#012D61] text-white shadow-[0_4px_12px_rgba(1,45,97,0.2)]' : 'bg-white border-[#B8D0E6] text-[#1E4A6E] hover:border-[#2582A1] hover:bg-[#F0F7FF]'}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-[16px] border-2 border-[#B8D0E6] bg-white shadow-[0_4px_16px_rgba(1,45,97,0.06)] overflow-hidden">
        {activeTab === 'village' && (
          <div className="p-6">
            <h3 className="font-sans text-[16px] font-bold tracking-tight text-[#012D61] flex items-center gap-2"><MapPin className="h-5 w-5 text-[#2582A1]" /> Add Village with Manual GPS</h3>
            <p className="mt-1 font-sans text-[12px] text-[#5A8AB0]">Each village gets unique GPS so graph spreads visibly. Use your real GPS + random offset.</p>
            <div className="mt-5 grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-4">
                <div>
                  <label className="font-sans text-[12px] font-semibold text-[#012D61]">Village Name *</label>
                  <input value={villageForm.name} onChange={e => setVillageForm({ ...villageForm, name: e.target.value })} placeholder="e.g., Khadakwadi, Your Village" className="mt-1.5 h-[44px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Latitude *</label>
                    <input value={villageForm.lat} onChange={e => setVillageForm({ ...villageForm, lat: e.target.value })} placeholder="19.123456" className="mt-1.5 h-[44px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#2582A1]" />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Longitude *</label>
                    <input value={villageForm.lng} onChange={e => setVillageForm({ ...villageForm, lng: e.target.value })} placeholder="74.123456" className="mt-1.5 h-[44px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#2582A1]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={useGpsForVillage} disabled={gpsLoading} className="flex h-[40px] items-center gap-2 rounded-[10px] border-2 border-[#2582A1] bg-[#E0F0F6] px-4 font-sans text-[12px] font-bold text-[#1A5F7A] hover:bg-[#D0E8F2] disabled:opacity-50">
                    <Navigation className="h-4 w-4" /> Use GPS + Random Spread
                  </button>
                  <button type="button" onClick={() => {
                    const base = realLocation || gps;
                    if (base) {
                      const spread = spreadLocation(base.lat, base.lng, 6);
                      setVillageForm({ ...villageForm, lat: spread.lat.toFixed(6), lng: spread.lng.toFixed(6) });
                    }
                  }} className="flex h-[40px] items-center gap-1.5 rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[11px] font-medium text-[#1E4A6E] hover:bg-[#F0F7FF]">
                    <Shuffle className="h-3.5 w-3.5" /> Randomize
                  </button>
                  <button onClick={handleAddVillage} disabled={!villageForm.name || !villageForm.lat || !villageForm.lng} className="flex h-[40px] flex-1 items-center justify-center gap-2 rounded-[10px] bg-[#012D61] font-sans text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(1,45,97,0.2)] hover:bg-[#0A3A7A] disabled:opacity-50">
                    <Plus className="h-4 w-4" /> Add Village
                  </button>
                </div>
                {isPreviewBlocked && <div className="rounded-[8px] border-2 border-[#FED7AA] bg-[#FEF3E2] p-2.5 font-sans text-[11px] text-[#7C2D12] flex gap-2"><Info className="h-4 w-4 text-[#E67E22] shrink-0" />Preview blocks GPS — enter lat/lng manually. In production (Vercel), real GPS works.</div>}
              </div>
              <div className="rounded-[12px] bg-[#F0F7FF] border-2 border-[#B8D0E6] p-4">
                <div className="font-sans text-[12px] font-bold text-[#012D61]">Why manual GPS + spread?</div>
                <ul className="mt-2 space-y-1.5 font-sans text-[11px] leading-[1.4] text-[#1E4A6E]">
                  <li className="flex gap-1.5"><span className="text-[#2582A1] font-bold">•</span> If all GPS same, graph nodes overlap → connections invisible, ambulance travel not seen</li>
                  <li className="flex gap-1.5"><span className="text-[#2582A1] font-bold">•</span> Random spread 3-6km around your real GPS makes graph visible</li>
                  <li className="flex gap-1.5"><span className="text-[#2582A1] font-bold">•</span> Each village/hospital/ambulance gets unique lat/lng → A* routes animate across map</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'hospital' && (
          <div className="p-6">
            <h3 className="font-sans text-[16px] font-bold tracking-tight text-[#012D61] flex items-center gap-2"><Building2 className="h-5 w-5 text-[#028752]" /> Add Hospital with Manual GPS</h3>
            <p className="mt-1 font-sans text-[12px] text-[#5A8AB0]">Add real hospitals with unique GPS locations so graph & ambulance travel visible</p>
            <div className="mt-5 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="font-sans text-[12px] font-semibold text-[#012D61]">Hospital Name *</label>
                  <input value={hospitalForm.name} onChange={e => setHospitalForm({ ...hospitalForm, name: e.target.value })} placeholder="e.g., District Hospital, Your City" className="mt-1.5 h-[44px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] font-medium outline-none focus:border-[#2582A1]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Latitude *</label>
                    <input value={hospitalForm.lat} onChange={e => setHospitalForm({ ...hospitalForm, lat: e.target.value })} placeholder="19.123456" className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#2582A1]" />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Longitude *</label>
                    <input value={hospitalForm.lng} onChange={e => setHospitalForm({ ...hospitalForm, lng: e.target.value })} placeholder="74.123456" className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#2582A1]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={useGpsForHospital} className="flex h-[36px] items-center gap-2 rounded-[10px] border-2 border-[#028752] bg-[#E6F4EA] px-3 font-sans text-[11px] font-bold text-[#065F46] hover:bg-[#D1F0D9]">
                    <Navigation className="h-3.5 w-3.5" /> Use GPS + Spread
                  </button>
                  <button type="button" onClick={() => {
                    const base = realLocation || gps;
                    if (base) {
                      const s = spreadLocation(base.lat, base.lng, 4);
                      setHospitalForm({ ...hospitalForm, lat: s.lat.toFixed(6), lng: s.lng.toFixed(6) });
                    }
                  }} className="flex h-[36px] items-center gap-1.5 rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[11px] font-medium text-[#1E4A6E] hover:bg-[#F0F7FF]">
                    <Shuffle className="h-3.5 w-3.5" /> Randomize
                  </button>
                </div>
                <div>
                  <label className="font-sans text-[12px] font-semibold text-[#012D61]">Total Beds</label>
                  <input type="number" value={hospitalForm.beds} onChange={e => setHospitalForm({ ...hospitalForm, beds: parseInt(e.target.value)||0 })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#2582A1]" />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="font-sans text-[12px] font-semibold text-[#012D61]">Specialists</label>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {SPECIALTIES.map(spec => (
                      <label key={spec} className={`flex items-center gap-2 rounded-[8px] border-2 px-2.5 py-2 cursor-pointer transition-all ${hospitalForm.specialists.includes(spec) ? 'bg-[#E0F0F6] border-[#2582A1] text-[#012D61]' : 'bg-white border-[#B8D0E6] text-[#5A8AB0] hover:border-[#9AB1CB]'}`}>
                        <input type="checkbox" checked={hospitalForm.specialists.includes(spec)} onChange={e => {
                          if (e.target.checked) setHospitalForm({ ...hospitalForm, specialists: [...hospitalForm.specialists, spec] });
                          else setHospitalForm({ ...hospitalForm, specialists: hospitalForm.specialists.filter(s => s !== spec) });
                        }} className="rounded-[4px] border-2 border-[#B8D0E6] text-[#2582A1]" />
                        <span className="font-sans text-[11px] font-medium">{spec}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-sans text-[12px] font-semibold text-[#012D61]">Medicine Stock</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {MEDICINES.slice(0,6).map(med => (
                      <div key={med} className="flex items-center gap-2 rounded-[8px] border-2 border-[#B8D0E6] bg-[#F0F7FF] px-2.5 py-2">
                        <span className="font-sans text-[10px] font-medium text-[#1E4A6E] flex-1 truncate">{med}</span>
                        <input type="number" min={0} value={hospitalForm.medicines[med] || 0} onChange={e => setHospitalForm({ ...hospitalForm, medicines: { ...hospitalForm.medicines, [med]: parseInt(e.target.value)||0 } })} className="h-[28px] w-[50px] rounded-[6px] border-2 border-[#B8D0E6] bg-white px-1.5 font-mono text-[11px] tabular text-center outline-none focus:border-[#2582A1]" />
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={handleAddHospital} disabled={!hospitalForm.name || !hospitalForm.lat || !hospitalForm.lng} className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#028752] font-sans text-[13px] font-bold tracking-tight text-white shadow-[0_4px_12px_rgba(2,135,82,0.25)] hover:bg-[#027A4B] disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Add Hospital with Unique GPS
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'road' && (
          <div className="p-6">
            <h3 className="font-sans text-[16px] font-bold tracking-tight text-[#012D61] flex items-center gap-2"><Route className="h-5 w-5 text-[#7C3AED]" /> Add Road Connection</h3>
            <p className="mt-1 font-sans text-[12px] text-[#5A8AB0]">Connect your real villages/hospitals with roads — makes graph visible and A* routing work</p>
            <div className="mt-5 grid grid-cols-2 gap-4 max-w-[600px]">
              <div>
                <label className="font-sans text-[12px] font-semibold text-[#012D61]">From Node</label>
                <select value={roadForm.from} onChange={e => setRoadForm({ ...roadForm, from: e.target.value })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]">
                  <option value="">Select origin</option>
                  {state.graph.getAllNodes().map(n => <option key={n.id} value={n.id}>{n.name} ({n.type}) · {n.lat.toFixed(3)},{n.lng.toFixed(3)}</option>)}
                </select>
              </div>
              <div>
                <label className="font-sans text-[12px] font-semibold text-[#012D61]">To Node</label>
                <select value={roadForm.to} onChange={e => setRoadForm({ ...roadForm, to: e.target.value })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]">
                  <option value="">Select destination</option>
                  {state.graph.getAllNodes().map(n => <option key={n.id} value={n.id}>{n.name} ({n.type}) · {n.lat.toFixed(3)},{n.lng.toFixed(3)}</option>)}
                </select>
              </div>
              <div>
                <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Travel Time (minutes)</label>
                <input type="number" value={roadForm.travelTime} onChange={e => setRoadForm({ ...roadForm, travelTime: parseInt(e.target.value)||0 })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#2582A1]" />
              </div>
              <div>
                <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Distance (km)</label>
                <input type="number" step={0.1} value={roadForm.distance} onChange={e => setRoadForm({ ...roadForm, distance: parseFloat(e.target.value)||0 })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#2582A1]" />
              </div>
              <button onClick={handleAddRoad} disabled={!roadForm.from || !roadForm.to} className="col-span-2 flex h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#7C3AED] font-sans text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:bg-[#6D28D9] disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add Road — Makes Graph Visible
              </button>
            </div>
            {state.graph.nodeCount() > 1 && state.graph.edgeCount() === 0 && (
              <div className="mt-4 rounded-[10px] border-2 border-[#FDE68A] bg-[#FFFBEB] p-3 font-sans text-[11px] text-[#92400E]">You have {state.graph.nodeCount()} nodes but 0 roads — add roads to connect them, otherwise A* cannot find routes and ambulance travel won't be visible.</div>
            )}
          </div>
        )}

        {activeTab === 'ambulance' && (
          <div className="p-6">
            <h3 className="font-sans text-[16px] font-bold tracking-tight text-[#012D61] flex items-center gap-2"><Truck className="h-5 w-5 text-[#0078BF]" /> Add Ambulance with Manual GPS</h3>
            <p className="mt-1 font-sans text-[12px] text-[#5A8AB0]">Each ambulance needs unique GPS so travel is visible — not same location for everyone</p>
            <div className="mt-5 space-y-4 max-w-[600px]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-sans text-[12px] font-semibold text-[#012D61]">Ambulance ID *</label>
                  <input value={ambulanceForm.id} onChange={e => setAmbulanceForm({ ...ambulanceForm, id: e.target.value })} placeholder="AMB-01, AMB-02" className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] font-bold tabular outline-none focus:border-[#2582A1]" />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer rounded-[10px] border-2 border-[#B8D0E6] bg-[#F0F7FF] px-3 h-[40px] w-full">
                    <input type="checkbox" checked={ambulanceForm.useManualGps} onChange={e => setAmbulanceForm({ ...ambulanceForm, useManualGps: e.target.checked })} className="rounded-[4px] border-2 border-[#B8D0E6] text-[#0078BF]" />
                    <span className="font-sans text-[12px] font-semibold text-[#012D61]">Use Manual GPS (not same as hospital)</span>
                  </label>
                </div>
              </div>

              {ambulanceForm.useManualGps ? (
                <div className="space-y-3 rounded-[12px] border-2 border-[#B8D0E6] bg-[#F0F7FF] p-4">
                  <div className="font-sans text-[11px] font-bold uppercase tracking-wide text-[#1E4A6E]">Manual GPS for Ambulance — Makes Travel Visible</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Latitude *</label>
                      <input value={ambulanceForm.lat} onChange={e => setAmbulanceForm({ ...ambulanceForm, lat: e.target.value })} placeholder="19.123456" className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#0078BF]" />
                    </div>
                    <div>
                      <label className="font-mono text-[11px] uppercase font-semibold text-[#1E4A6E]">Longitude *</label>
                      <input value={ambulanceForm.lng} onChange={e => setAmbulanceForm({ ...ambulanceForm, lng: e.target.value })} placeholder="74.123456" className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-mono text-[13px] tabular outline-none focus:border-[#0078BF]" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={useGpsForAmbulance} className="flex h-[36px] items-center gap-2 rounded-[10px] border-2 border-[#0078BF] bg-white px-3 font-sans text-[11px] font-bold text-[#005A8C] hover:bg-[#F0F7FF]">
                      <Navigation className="h-3.5 w-3.5" /> Use My GPS + Random Spread
                    </button>
                    <button type="button" onClick={() => {
                      const base = realLocation || gps;
                      if (base) {
                        const s = spreadLocation(base.lat, base.lng, 3);
                        setAmbulanceForm({ ...ambulanceForm, lat: s.lat.toFixed(6), lng: s.lng.toFixed(6) });
                      }
                    }} className="flex h-[36px] items-center gap-1.5 rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[11px] font-medium text-[#1E4A6E] hover:bg-[#F0F7FF]">
                      <Shuffle className="h-3.5 w-3.5" /> Randomize Near Me
                    </button>
                  </div>
                  <div className="font-sans text-[10px] leading-[1.3] text-[#5A8AB0]">Creates a new base node at this GPS for ambulance — so ambulance starts at unique location, travel animation visible across map, not same as everyone.</div>
                </div>
              ) : (
                <div>
                  <label className="font-sans text-[12px] font-semibold text-[#012D61]">Base Hospital / Location *</label>
                  <select value={ambulanceForm.nodeId} onChange={e => setAmbulanceForm({ ...ambulanceForm, nodeId: e.target.value })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#0078BF]">
                    <option value="">Select base hospital</option>
                    {state.graph.getAllNodes().filter(n=>n.type==='hospital').map(n => <option key={n.id} value={n.id}>{n.name} · {n.lat.toFixed(3)},{n.lng.toFixed(3)}</option>)}
                  </select>
                  <div className="mt-1 font-sans text-[10px] text-[#5A8AB0]">If no hospitals yet, use Manual GPS above to create unique ambulance base.</div>
                </div>
              )}

              <button onClick={handleAddAmbulance} disabled={!ambulanceForm.id || (!ambulanceForm.useManualGps && !ambulanceForm.nodeId) || (ambulanceForm.useManualGps && (!ambulanceForm.lat || !ambulanceForm.lng))} className="flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#0078BF] font-sans text-[13px] font-bold tracking-tight text-white shadow-[0_4px_12px_rgba(0,120,191,0.25)] hover:bg-[#0069A8] disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add Ambulance with Unique GPS — Travel Will Be Visible
              </button>

              {isPreviewBlocked && <div className="rounded-[8px] border-2 border-[#FED7AA] bg-[#FEF3E2] p-2.5 font-sans text-[11px] text-[#7C2D12] flex gap-2"><Info className="h-4 w-4 text-[#E67E22] shrink-0" />Preview blocks GPS — enter lat/lng manually. In production (Vercel), real GPS works.</div>}
            </div>
          </div>
        )}

        {activeTab === 'doctor' && (
          <div className="p-6">
            <h3 className="font-sans text-[16px] font-bold tracking-tight text-[#012D61] flex items-center gap-2"><Stethoscope className="h-5 w-5 text-[#0E9F6E]" /> Add Doctor (Per-Hospital On/Off Duty)</h3>
            <p className="mt-1 font-sans text-[12px] text-[#5A8AB0]">Doctors affect hospital eligibility — off-duty doctor removes specialty from hospital in real-time</p>
            <div className="mt-5 grid grid-cols-2 gap-4 max-w-[600px]">
              <div>
                <label className="font-sans text-[12px] font-semibold text-[#012D61]">Doctor Name *</label>
                <input value={doctorForm.name} onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })} placeholder="Dr. Priya Sharma" className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]" />
              </div>
              <div>
                <label className="font-sans text-[12px] font-semibold text-[#012D61]">Specialty *</label>
                <select value={doctorForm.specialty} onChange={e => setDoctorForm({ ...doctorForm, specialty: e.target.value as string })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]">
                  {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="font-sans text-[12px] font-semibold text-[#012D61]">Hospital *</label>
                <select value={doctorForm.hospitalId} onChange={e => setDoctorForm({ ...doctorForm, hospitalId: e.target.value })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]">
                  <option value="">Select hospital</option>
                  {state.hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="font-sans text-[12px] font-semibold text-[#012D61]">Shift Status</label>
                <select value={doctorForm.status} onChange={e => setDoctorForm({ ...doctorForm, status: e.target.value as any })} className="mt-1.5 h-[40px] w-full rounded-[10px] border-2 border-[#B8D0E6] bg-white px-3 font-sans text-[13px] outline-none focus:border-[#2582A1]">
                  <option value="on-duty">On Duty</option>
                  <option value="off-duty">Off Duty</option>
                </select>
              </div>
              <button onClick={handleAddDoctor} disabled={!doctorForm.name || !doctorForm.hospitalId} className="col-span-2 flex h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#0E9F6E] font-sans text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(14,159,110,0.25)] hover:bg-[#0B8A5E] disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add Doctor to Hospital Roster
              </button>
            </div>
          </div>
        )}
      </div>

      {state.graph.nodeCount() === 0 && (
        <div className="mt-6 rounded-[12px] border-2 border-dashed border-[#F5C2C7] bg-[#FDF0F1] p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-[#C41E3A] mx-auto" />
          <div className="mt-2 font-sans text-[14px] font-bold text-[#7A1A1A]">No Data Yet — Add Real Data with Unique GPS</div>
          <div className="mt-1 font-sans text-[12px] text-[#9A2A2A]">Your network is empty. Use your real GPS + Random Spread to add villages and hospitals at different locations near you — so graph connections and ambulance travel become visible on map.</div>
        </div>
      )}
    </div>
  );
}
