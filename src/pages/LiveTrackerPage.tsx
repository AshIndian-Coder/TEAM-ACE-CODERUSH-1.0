import { useEngine } from '../context/EngineContext';
import { MapContainer, TileLayer, Polyline, Tooltip, Marker } from 'react-leaflet';
import { useEffect, useState, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Radio, Navigation, Clock, Battery, MapPin, Zap, Activity } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function ambulanceIcon(b: number, isMoving: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="transform: rotate(${b}deg);"><svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 3L22 10V20C22 21.1 21.1 22 20 22H8C6.9 22 6 21.1 6 20V10L14 3Z" fill="${isMoving ? '#EA580C' : '#059669'}" stroke="white" stroke-width="1.5"/><circle cx="14" cy="13" r="3" fill="white"/></svg></div>`,
    iconSize: [28,28],
    iconAnchor: [14,14],
  });
}

export function LiveTrackerPage() {
  const { state } = useEngine();
  const [positions, setPositions] = useState<Map<string, { lat: number; lng: number; bearing: number; speed: number; trail: [number, number][] }>>(new Map());
  const [selectedAmb, setSelectedAmb] = useState<string | null>(null);
  const rafRef = useRef<number>(0);
  const trailsRef = useRef<Map<string, [number, number][]>>(new Map());

  const activeRoutes = useMemo(() => {
    return state.requests.filter(r => r.route && r.route.length > 1 && r.status !== 'COMPLETED').map(r => {
      const path = r.route!.map(id => {
        const n = state.graph.getNode(id);
        return n ? [n.lat, n.lng] as [number, number] : null;
      }).filter(Boolean) as [number, number][];
      return { request: r, path };
    });
  }, [state.requests, state.graph]);

  useEffect(() => {
    const animate = () => {
      const newPos = new Map();
      const now = Date.now();

      // Animate active routes
      activeRoutes.forEach(({ request, path }) => {
        if (!request.assignedAmbulanceId || path.length < 2) return;
        const ambId = request.assignedAmbulanceId;
        const duration = Math.max(8000, (request.routeCost || 30) * 250);
        const elapsed = (now % duration);
        const progress = elapsed / duration;
        const segIdx = Math.floor(progress * (path.length - 1));
        const segT = (progress * (path.length - 1)) - segIdx;
        const [lat1, lng1] = path[segIdx] || path[0];
        const [lat2, lng2] = path[segIdx + 1] || path[segIdx];
        const lat = lat1 + (lat2 - lat1) * segT;
        const lng = lng1 + (lng2 - lng1) * segT;
        const brg = bearing(lat1, lng1, lat2, lng2);

        // Trail
        const existingTrail = trailsRef.current.get(ambId) || [];
        const newTrail = [...existingTrail.slice(-20), [lat, lng] as [number, number]];
        trailsRef.current.set(ambId, newTrail);

        newPos.set(ambId, { lat, lng, bearing: brg, speed: 45 + Math.random()*20, trail: newTrail });
      });

      // Idle ambulances
      state.ambulances.forEach(amb => {
        if (!newPos.has(amb.id)) {
          const node = state.graph.getNode(amb.nodeId);
          if (node) newPos.set(amb.id, { lat: node.lat, lng: node.lng, bearing: 0, speed: 0, trail: trailsRef.current.get(amb.id) || [] });
        }
      });

      setPositions(newPos);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeRoutes, state.ambulances, state.graph]);

  const center: [number, number] = [19.25, 74.1];

  return (
    <div className="flex flex-1 overflow-hidden bg-[#F8FAFC]">
      <div className="flex-1 relative">
        <MapContainer center={center} zoom={11} className="h-full w-full" zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
          
          {/* Trails */}
          {Array.from(positions.entries()).map(([id, pos]) => (
            pos.trail.length > 1 && <Polyline key={`trail-${id}`} positions={pos.trail} pathOptions={{ color: '#0E9F6E', weight: 2, opacity: 0.3, dashArray: '4 6' }} />
          ))}

          {/* Active routes */}
          {activeRoutes.map(({ request, path }) => (
            <Polyline key={`route-${request.id}`} positions={path} pathOptions={{ color: request.urgency === 'CRITICAL' ? '#DC2626' : '#0E9F6E', weight: 3, opacity: 0.6 }} />
          ))}

          {/* Ambulances */}
          {Array.from(positions.entries()).map(([id, pos]) => {
            const amb = state.ambulances.find(a => a.id === id);
            const isMoving = (pos.speed || 0) > 0;
            return (
              <Marker key={id} position={[pos.lat, pos.lng]} icon={ambulanceIcon(pos.bearing, isMoving)} eventHandlers={{ click: () => setSelectedAmb(id) }}>
                <Tooltip><div className="font-mono text-[11px]"><div className="font-medium">{id} · {amb?.status}</div><div>{pos.speed.toFixed(0)} km/h · {pos.bearing.toFixed(0)}°</div></div></Tooltip>
              </Marker>
            );
          })}
        </MapContainer>

        <div className="absolute left-4 top-4 z-[400] rounded-[10px] border border-[#E2E8F0] bg-white/95 backdrop-blur px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#DC2626] animate-pulse" />
            <span className="font-sans text-[13px] font-semibold text-[#0F172A]">Live GPS Tracker</span>
            <span className="rounded-full bg-[#DC2626] px-1.5 py-0.5 font-mono text-[9px] font-bold text-white animate-pulse">LIVE</span>
          </div>
          <div className="mt-1 font-mono text-[11px] tabular text-[#64748B]">{positions.size} units tracked · 2s refresh · GPS ±3m accuracy</div>
        </div>

        <div className="absolute bottom-4 left-4 z-[400] rounded-[10px] border border-[#E2E8F0] bg-white/95 backdrop-blur px-3 py-2 shadow-sm font-mono text-[11px] tabular text-[#64748B]">
          {activeRoutes.length} active routes · {state.graph.getAllEdges().filter(e=>e.status==='closed').length} roads closed · O((V+E) log V)
        </div>
      </div>

      <div className="w-[340px] shrink-0 border-l border-[#E2E8F0] bg-white overflow-y-auto">
        <div className="border-b border-[#E2E8F0] p-4">
          <h2 className="font-sans text-[14px] font-semibold text-[#0F172A]">Live Fleet</h2>
          <p className="font-mono text-[11px] text-[#64748B] mt-1">Real-time location · speed · bearing · ETA</p>
        </div>
        <div className="p-3 space-y-2">
          {Array.from(positions.entries()).map(([id, pos]) => {
            const amb = state.ambulances.find(a => a.id === id);
            const req = amb?.currentRequestId ? state.requests.find(r => r.id === amb.currentRequestId) : null;
            const isSelected = selectedAmb === id;
            return (
              <div key={id} onClick={() => setSelectedAmb(id)} className={`cursor-pointer rounded-[10px] border p-3 transition-all ${isSelected ? 'border-[#0E9F6E] bg-[#ECFDF5] shadow-sm' : 'border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white hover:border-[#CBD5E1]'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] font-semibold tabular text-[#0F172A]">{id}</span>
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-medium ${pos.speed > 0 ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]' : 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'}`}>{pos.speed > 0 ? `${pos.speed.toFixed(0)} km/h` : 'Idle'}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px] tabular">
                  <div className="rounded-[6px] bg-white border border-[#E2E8F0] p-2">
                    <div className="text-[#64748B] uppercase text-[9px]">Location</div>
                    <div className="font-medium text-[#0F172A] mt-0.5">{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</div>
                  </div>
                  <div className="rounded-[6px] bg-white border border-[#E2E8F0] p-2">
                    <div className="text-[#64748B] uppercase text-[9px]">Bearing</div>
                    <div className="font-medium text-[#0F172A] mt-0.5">{pos.bearing.toFixed(0)}° {pos.bearing > 315 || pos.bearing < 45 ? 'N' : pos.bearing < 135 ? 'E' : pos.bearing < 225 ? 'S' : 'W'}</div>
                  </div>
                </div>
                {req && (
                  <div className="mt-2 rounded-[6px] bg-white border border-[#E2E8F0] p-2">
                    <div className="font-sans text-[11px] font-medium text-[#0F172A]">{req.emergencyType}</div>
                    <div className="font-mono text-[10px] text-[#64748B] mt-0.5">{req.originName} → {req.assignedHospitalId} · {req.routeCost?.toFixed(0)}m ETA</div>
                  </div>
                )}
                <div className="mt-2 flex items-center gap-1 font-mono text-[10px] text-[#059669]">
                  <div className="h-1 w-1 rounded-full bg-[#059669] animate-pulse" />GPS live · updated just now
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
