import { useEngine } from '../context/EngineContext';
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap, Marker } from 'react-leaflet';
import { useEffect, useMemo, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// Bearing calculation for ambulance direction
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function createAmbulanceIcon(bearingDeg: number, isEnRoute: boolean, id: string) {
  const color = isEnRoute ? '#F76B15' : '#12A594';
  return L.divIcon({
    className: 'ambulance-marker',
    html: `
      <div style="transform: rotate(${bearingDeg}deg); transition: transform 0.3s ease;">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#shadow)">
            <path d="M11 2L18.5 8.5V18C18.5 19.1 17.6 20 16.5 20H5.5C4.4 20 3.5 19.1 3.5 18V8.5L11 2Z" fill="${color}" stroke="#E8ECF1" stroke-width="1.2"/>
            <path d="M11 6L11 14M7 10L15 10" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="11" cy="11" r="2.5" fill="white" fill-opacity="0.9"/>
          </g>
          <defs>
            <filter id="shadow" x="-2" y="-2" width="26" height="26" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
              <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="black" flood-opacity="0.6"/>
            </filter>
          </defs>
        </svg>
        <div style="position:absolute; top:-4px; left:50%; transform:translateX(-50%); font-family:'JetBrains Mono'; font-size:7px; font-weight:600; color:#E8ECF1; background:${color}; padding:0 2px; border-radius:2px; white-space:nowrap; letter-spacing:0.02em;">${id}</div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function createHospitalIcon(hasCapacity: boolean, isSelected: boolean, isFlashing: boolean) {
  const ringColor = hasCapacity ? (isSelected ? '#12A594' : '#2FBF71') : '#E5484D';
  const bg = hasCapacity ? '#12161D' : '#1A2029';
  const size = isSelected ? 28 : 22;
  return L.divIcon({
    className: 'hospital-marker',
    html: `
      <div style="width:${size}px; height:${size}px; position:relative;">
        <div style="
          width:100%; height:100%; 
          background:${bg}; 
          border: ${isSelected ? '3px' : '2px'} solid ${ringColor}; 
          border-radius:3px; 
          display:flex; align-items:center; justify-content:center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          ${isFlashing ? 'animation: flashCritical 400ms ease-in-out;' : ''}
          ${isSelected ? 'animation: drawRing 500ms cubic-bezier(0.22,1,0.36,1);' : ''}
        ">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1V11M1 6H11" stroke="${ringColor}" stroke-width="1.5" stroke-linecap="square"/>
          </svg>
        </div>
        ${isSelected ? `<div style="position:absolute; inset:-3px; border:1px solid ${ringColor}; border-radius:4px; opacity:0.4; pointer-events:none;"></div>` : ''}
      </div>
      <style>
        @keyframes flashCritical { 0% { border-color:${ringColor}; } 50% { border-color:#E5484D; box-shadow:0 0 8px #E5484D; } 100% { border-color:${ringColor}; } }
        @keyframes drawRing { 0% { stroke-dasharray:0 100; } 100% { stroke-dasharray:100 0; } }
      </style>
    `,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
}

export function MapPanel() {
  const { state } = useEngine();
  const [selectedRoad, setSelectedRoad] = useState<string | null>(null);
  const [animatedPositions, setAnimatedPositions] = useState<Map<string, { lat: number; lng: number; bearing: number }>>(new Map());
  const [flashHospitals, setFlashHospitals] = useState<Set<string>>(new Set());
  const animationRef = useRef<number>(0);
  const lastTickRef = useRef<Map<string, { progress: number; startTime: number; path: [number, number][] }>>(new Map());

  const center: [number, number] = useMemo(() => {
    const nodes = state.graph.getAllNodes();
    if (nodes.length === 0) return [19.25, 74.1];
    const avgLat = nodes.reduce((s, n) => s + n.lat, 0) / nodes.length;
    const avgLng = nodes.reduce((s, n) => s + n.lng, 0) / nodes.length;
    return [avgLat, avgLng];
  }, [state.graph]);

  const villages = state.graph.getAllNodes().filter(n => n.type === 'village');
  const hospitals = state.graph.getAllNodes().filter(n => n.type === 'hospital');
  const edges = state.graph.getAllEdges();

  const activeRoutes = useMemo(() => {
    return state.requests
      .filter(r => r.route && r.route.length > 1 && (r.status === 'EN_ROUTE' || r.status === 'ASSIGNED' || r.status === 'REROUTING'))
      .map(r => {
        const path = r.route!.map(id => {
          const node = state.graph.getNode(id);
          return node ? [node.lat, node.lng] as [number, number] : null;
        }).filter(Boolean) as [number, number][];
        const hospitalNode = r.assignedHospitalId ? state.graph.getNode(state.hospitals.find(h => h.id === r.assignedHospitalId)?.nodeId || '') : null;
        return { request: r, path, hospitalNode };
      });
  }, [state.requests, state.graph, state.hospitals]);

  // Detect reroutes to flash hospital
  useEffect(() => {
    const rerouting = state.requests.filter(r => r.status === 'REROUTING');
    if (rerouting.length > 0) {
      const newFlashes = new Set<string>();
      rerouting.forEach(r => {
        if (r.assignedHospitalId) {
          const hosp = state.hospitals.find(h => h.id === r.assignedHospitalId);
          if (hosp) newFlashes.add(hosp.nodeId);
        }
      });
      setFlashHospitals(newFlashes);
      const t = setTimeout(() => setFlashHospitals(new Set()), 600);
      return () => clearTimeout(t);
    }
  }, [state.requests, state.hospitals]);

  // Animate ambulances along routes with rAF — speed proportional to travelTime
  useEffect(() => {
    const animate = (now: number) => {
      const newPositions = new Map<string, { lat: number; lng: number; bearing: number }>();

      activeRoutes.forEach(({ request, path }) => {
        if (!request.assignedAmbulanceId || path.length < 2) return;

        const ambId = request.assignedAmbulanceId;
        const existing = lastTickRef.current.get(ambId);

        // Initialize or reset if route changed
        if (!existing || existing.path.length !== path.length || existing.path[0][0] !== path[0][0]) {
          lastTickRef.current.set(ambId, { progress: 0, startTime: now, path });
          newPositions.set(ambId, { lat: path[0][0], lng: path[0][1], bearing: bearing(path[0][0], path[0][1], path[1][0], path[1][1]) });
          return;
        }

        // Calculate total travel time for scaling — full demo route 5-12s on screen
        const totalCost = request.routeCost || 30;
        const durationMs = Math.max(5000, Math.min(12000, totalCost * 300)); // scale: 1 min travel = 300ms screen, clamped 5-12s
        const elapsed = now - existing.startTime;
        let progress = Math.min(elapsed / durationMs, 0.98); // leave 2% before arrival

        // If completed, keep at end
        if (request.status === 'COMPLETED') progress = 1;

        // Interpolate along path
        const totalSegments = path.length - 1;
        const segmentProgress = progress * totalSegments;
        const segIdx = Math.min(Math.floor(segmentProgress), totalSegments - 1);
        const segT = segmentProgress - segIdx;

        const [lat1, lng1] = path[segIdx];
        const [lat2, lng2] = path[segIdx + 1] || path[segIdx];

        const lat = lat1 + (lat2 - lat1) * segT;
        const lng = lng1 + (lng2 - lng1) * segT;
        const brg = bearing(lat1, lng1, lat2, lng2);

        newPositions.set(ambId, { lat, lng, bearing: brg });
        lastTickRef.current.set(ambId, { ...existing, progress });
      });

      // Also include idle ambulances at their nodes
      state.ambulances.forEach(amb => {
        if (!newPositions.has(amb.id)) {
          const node = state.graph.getNode(amb.nodeId);
          if (node) {
            newPositions.set(amb.id, { lat: node.lat, lng: node.lng, bearing: 0 });
          }
        }
      });

      setAnimatedPositions(newPositions);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [activeRoutes, state.ambulances, state.graph]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[12px] border-2 border-[#D6E0EB] bg-[#F0F6FB] shadow-[0_4px_16px_rgba(1,45,97,0.08)]">
      <MapContainer
        center={center}
        zoom={11}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapUpdater center={center} />

        {/* Roads - thin hairline, closed dashed with X */}
        {edges.map((edge) => {
          const from = state.graph.getNode(edge.from);
          const to = state.graph.getNode(edge.to);
          if (!from || !to) return null;
          const isClosed = edge.status === 'closed';
          const isSelected = selectedRoad === edge.id;
          return (
            <Polyline
              key={edge.id}
              positions={[[from.lat, from.lng], [to.lat, to.lng]]}
              pathOptions={{
                color: isClosed ? '#4B5563' : isSelected ? '#12A594' : '#1E2631',
                weight: isSelected ? 2.5 : isClosed ? 1.2 : 1,
                opacity: isClosed ? 0.5 : isSelected ? 0.9 : 0.6,
                dashArray: isClosed ? '5 7' : undefined,
                lineCap: 'butt',
              }}
              eventHandlers={{ click: () => setSelectedRoad(edge.id) }}
            >
              <Tooltip>
                <div className="font-mono text-[10px] leading-[1.3]">
                  <div className="font-medium text-[11px]">{from.name} ↔ {to.name}</div>
                  <div className="tabular">{edge.distance.toFixed(1)}km · {edge.travelTime.toFixed(1)}m · <span className={isClosed ? 'text-[#E5484D]' : 'text-[#2FBF71]'}>{edge.status}</span></div>
                  <div className="text-[9px] opacity-60 mt-0.5">{edge.id}</div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Active routes - with draw-on effect via increasing weight opacity */}
        {activeRoutes.map(({ request, path }) => {
          const isRerouting = request.status === 'REROUTING';
          const isCritical = request.urgency === 'CRITICAL';
          return (
            <Polyline
              key={`route-${request.id}-${isRerouting ? 'reroute' : 'normal'}`}
              positions={path}
              pathOptions={{
                color: isCritical ? '#E5484D' : '#12A594',
                weight: isRerouting ? 3 : 3.5,
                opacity: isRerouting ? 0.7 : 0.85,
                dashArray: isRerouting ? '8 8' : undefined,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            >
              <Tooltip sticky>
                <div className="font-mono text-[10px] leading-[1.4] min-w-[180px]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[11px]">{request.id.slice(0, 8)}</span>
                    <span className={`px-1 py-0.5 rounded-[2px] text-[8px] uppercase border ${isCritical ? 'border-[#E5484D]/30 bg-[#E5484D]/15 text-[#E5484D]' : 'border-[#12A594]/30 bg-[#12A594]/15 text-[#12A594]'}`}>{request.urgency}</span>
                  </div>
                  <div className="mt-1">{request.emergencyType} → {state.hospitals.find(h => h.id === request.assignedHospitalId)?.name || request.assignedHospitalId}</div>
                  <div className="tabular mt-1 flex gap-3 text-[9px] opacity-70">
                    <span>{request.routeCost?.toFixed(1)}m</span>
                    <span>{request.specialtyRequired}</span>
                    <span className={isRerouting ? 'text-[#E5484D]' : ''}>{request.status}</span>
                  </div>
                </div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Villages - small, tertiary, precise */}
        {villages.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={3.5}
            pathOptions={{
              fillColor: '#2A3441',
              fillOpacity: 0.9,
              color: '#1A2029',
              weight: 0.5,
            }}
          >
            <Tooltip>
              <div className="font-mono text-[10px]">
                <div className="font-medium">{v.name}</div>
                <div className="text-[9px] opacity-60 tabular">{v.id} · {v.lat.toFixed(3)},{v.lng.toFixed(3)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Hospitals - square markers with status ring */}
        {hospitals.map((hNode) => {
          const hosp = state.hospitals.find(h => h.nodeId === hNode.id);
          const hasCapacity = hosp && hosp.bedsAvailable > 0;
          const isSelected = state.requests.some(r => r.assignedHospitalId === hosp?.id && r.status !== 'COMPLETED');
          const isFlashing = flashHospitals.has(hNode.id);
          if (!hosp) return null;
          return (
            <Marker
              key={hNode.id}
              position={[hNode.lat, hNode.lng]}
              icon={createHospitalIcon(!!hasCapacity, isSelected, isFlashing)}
            >
              <Tooltip>
                <div className="font-mono text-[10px] leading-[1.4] min-w-[200px]">
                  <div className="font-medium text-[11px] flex items-center gap-1.5">
                    {hNode.name}
                    <span className={`h-1.5 w-1.5 rounded-full ${hasCapacity ? 'bg-[#2FBF71]' : 'bg-[#E5484D]'}`} />
                  </div>
                  <div className="mt-1 grid grid-cols-3 gap-2 tabular text-[9px]">
                    <div><span className="opacity-60">Beds</span> <span className="text-[#E8ECF1]">{hosp.bedsAvailable}/{hosp.bedsTotal}</span></div>
                    <div><span className="opacity-60">Res</span> <span className="text-[#F76B15]">{hosp.bedsReserved}</span></div>
                    <div><span className="opacity-60">Meds</span> <span className="text-[#E8ECF1]">{Object.values(hosp.medicines).reduce((s,m)=>s+m.available,0)}</span></div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {hosp.specialists.slice(0, 4).map(s => (
                      <span key={s} className="px-1 py-0.5 rounded-[2px] bg-[#1A2029] border border-[#232A35] text-[8px] uppercase tracking-wide">{s.slice(0,4)}</span>
                    ))}
                  </div>
                  <div className="mt-1 text-[8px] opacity-50 tabular">{hosp.id} · {hNode.lat.toFixed(4)},{hNode.lng.toFixed(4)}</div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Ambulances - custom SVG that points direction of travel */}
        {Array.from(animatedPositions.entries()).map(([ambId, pos]) => {
          const amb = state.ambulances.find(a => a.id === ambId);
          if (!amb) return null;
          const isEnRoute = amb.status === 'EN_ROUTE' || amb.status === 'ASSIGNED';
          return (
            <Marker
              key={`amb-${ambId}`}
              position={[pos.lat, pos.lng]}
              icon={createAmbulanceIcon(pos.bearing, isEnRoute, ambId)}
              zIndexOffset={1000}
            >
              <Tooltip>
                <div className="font-mono text-[10px] leading-[1.3]">
                  <div className="font-medium">{amb.id} · {amb.status}</div>
                  <div className="tabular text-[9px] opacity-70">{pos.lat.toFixed(4)},{pos.lng.toFixed(4)} · {pos.bearing.toFixed(0)}°</div>
                  {amb.currentRequestId && <div className="text-[9px] mt-0.5">→ {amb.currentRequestId.slice(0,8)}</div>}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Top-left: dense legend, ops style */}
      <div className="pointer-events-none absolute left-2.5 top-2.5 z-[400] rounded-[6px] border border-[#232A35] bg-[#12161D]/90 px-2.5 py-2 shadow-[0_1px_0_0_#232A35,0_1px_2px_rgba(0,0,0,0.3)] backdrop-blur-[2px]">
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-[#2FBF71] animate-pulse" />
          <span className="font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#8B96A5]">Live Network</span>
          <span className="font-mono text-[9px] tabular text-[#57616F]">{villages.length}V · {hospitals.length}H · {edges.length}E</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[10px] leading-[1.2]">
          <div className="flex items-center gap-1.5"><span className="h-[3px] w-[3px] rounded-full bg-[#2A3441] border border-[#232A35]" /> <span className="text-[#57616F]">Village</span></div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] border-[1.5px] border-[#2FBF71] bg-[#12161D]" /> <span className="text-[#8B96A5]">Hosp OK</span></div>
          <div className="flex items-center gap-1.5"><span className="h-[2px] w-3 bg-[#12A594]" /> <span className="text-[#8B96A5]">Active</span></div>
          <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] border-[1.5px] border-[#E5484D] bg-[#1A2029]" /> <span className="text-[#8B96A5]">Hosp Full</span></div>
          <div className="flex items-center gap-1.5"><span className="h-[2px] w-3 bg-[#E5484D]" /> <span className="text-[#8B96A5]">Critical</span></div>
          <div className="flex items-center gap-1.5"><span className="h-[1px] w-3 border-t border-dashed border-[#4B5563]" /> <span className="text-[#57616F]">Closed</span></div>
        </div>
      </div>

      {/* Bottom: status strip, tabular, dense */}
      <div className="pointer-events-none absolute bottom-2 left-2.5 right-2.5 z-[400] flex items-center justify-between rounded-[6px] border border-[#232A35] bg-[#12161D]/90 px-2.5 py-1.5 font-mono text-[10px] tabular shadow-[0_1px_0_0_#232A35]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#4B5563]" />{edges.filter(e => e.status === 'closed').length} closed</span>
          <span className="text-[#313A48]">·</span>
          <span className="flex items-center gap-1"><span className="h-[2px] w-2 bg-[#12A594] inline-block" />{activeRoutes.length} active</span>
          <span className="text-[#313A48]">·</span>
          <span className="text-[#57616F] tabular">O((V+E) log V) · {state.requests.filter(r=>r.status!=='COMPLETED').length} in-flight</span>
        </div>
        <div className="flex items-center gap-2 text-[#57616F]">
          <span className="tabular">{new Date().toISOString().slice(11,19)} IST</span>
          <span className="h-2 w-px bg-[#232A35]" />
          <span className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-[#2FBF71] animate-pulse" />live</span>
        </div>
      </div>

      {/* Center flash for reroute beat - the 150ms intentional nothing */}
      {activeRoutes.some(r => r.request.status === 'REROUTING') && (
        <div className="pointer-events-none absolute inset-0 z-[399] flex items-center justify-center">
          <div className="rounded-[6px] border border-[#E5484D]/30 bg-[#0A0E13]/80 px-3 py-1.5 font-mono text-[11px] text-[#E5484D] backdrop-blur-sm">
            REROUTING — detecting new feasible hospital...
          </div>
        </div>
      )}
    </div>
  );
}
