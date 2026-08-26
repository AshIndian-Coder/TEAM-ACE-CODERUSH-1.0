import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { Graph } from '../../engine/graph/Graph';
import { HospitalRegistry } from '../../engine/resources/HospitalRegistry';
import { AmbulanceRegistry } from '../../engine/resources/AmbulanceRegistry';
import { DecisionLog, type DecisionLogEntry } from '../../engine/decisionLog/DecisionLog';
import { DispatchEngine, type DispatchEvent } from '../../engine/dispatch/DispatchEngine';
import { EventEngine } from '../../engine/simulation/EventEngine';
import type { PatientRequest, DispatchResult, ComparisonResult, GraphNode, RoadEdge, Hospital, Ambulance, Doctor } from '../../engine/domain/types';
import { runBenchmark, type BenchmarkResult } from '../../engine/benchmark/runBenchmark';
import { playDispatchTone, playCriticalAlert } from '../lib/sound';
import { loadData, saveData, clearData, loadSampleData, type RouMiData } from '../lib/dataStore';
import { useRealLocation } from '../hooks/useRealLocation';
import { isBackendEnabled, apiGet, apiPost, apiDelete } from '../lib/api';
import { io, type Socket } from 'socket.io-client';

type EngineState = {
  graph: Graph;
  hospitals: Hospital[];
  ambulances: Ambulance[];
  doctors: Doctor[];
  requests: PatientRequest[];
  queue: PatientRequest[];
  results: Map<string, DispatchResult>;
  logs: DecisionLogEntry[];
  selectedRequestId: string | null;
  comparison: ComparisonResult | null;
  benchmark: BenchmarkResult | null;
  isBenchmarking: boolean;
  presentationMode: boolean;
  rawData: RouMiData;
  realCenter: { lat: number; lng: number } | null;
  backendStatus: 'local' | 'connected' | 'error';
};

type Action =
  | { type: 'STATE_UPDATE'; payload: Partial<EngineState> }
  | { type: 'SET_SELECTED'; payload: string | null }
  | { type: 'SET_COMPARISON'; payload: ComparisonResult | null }
  | { type: 'SET_BENCHMARK'; payload: BenchmarkResult | null }
  | { type: 'SET_BENCHMARKING'; payload: boolean }
  | { type: 'TOGGLE_PRESENTATION' }
  | { type: 'SET_LOGS'; payload: DecisionLogEntry[] }
  | { type: 'SET_RAW_DATA'; payload: RouMiData };

function reducer(state: EngineState, action: Action): EngineState {
  switch (action.type) {
    case 'STATE_UPDATE':
      return { ...state, ...action.payload };
    case 'SET_SELECTED':
      return { ...state, selectedRequestId: action.payload };
    case 'SET_COMPARISON':
      return { ...state, comparison: action.payload };
    case 'SET_BENCHMARK':
      return { ...state, benchmark: action.payload };
    case 'SET_BENCHMARKING':
      return { ...state, isBenchmarking: action.payload };
    case 'TOGGLE_PRESENTATION':
      return { ...state, presentationMode: !state.presentationMode };
    case 'SET_LOGS':
      return { ...state, logs: action.payload };
    case 'SET_RAW_DATA':
      return { ...state, rawData: action.payload };
    default:
      return state;
  }
}

interface EngineContextValue {
  state: EngineState;
  dispatch: React.Dispatch<Action>;
  engine: DispatchEngine;
  eventEngine: EventEngine;
  graph: Graph;
  hospitalRegistry: HospitalRegistry;
  ambulanceRegistry: AmbulanceRegistry;
  decisionLog: DecisionLog;
  handleNewRequest: (req: PatientRequest) => DispatchResult | Promise<DispatchResult>;
  compareRequest: (req: PatientRequest) => ComparisonResult | Promise<ComparisonResult>;
  runBenchmark: (size: number) => Promise<BenchmarkResult>;
  blockRandomRoad: () => void;
  reopenRandomRoad: () => void;
  fillRandomBeds: () => void;
  depleteRandomMedicine: () => void;
  setDoctorOffDuty: (hospitalId: string, specialty: string) => void;
  setDoctorOnDuty: (hospitalId: string, specialty: string) => void;
  occupyAmbulance: () => void;
  freeAmbulance: () => void;
  generateEmergency: (urgency?: PatientRequest['urgency']) => void;
  generateBurst: (count: number) => void;
  resetSimulation: () => void;
  completeRequest: (id: string) => void;
  addNode: (node: GraphNode) => void;
  addEdge: (edge: RoadEdge) => void;
  addHospital: (hospital: Hospital, node: GraphNode) => void;
  addAmbulance: (amb: Ambulance) => void;
  addDoctor: (doc: Doctor) => void;
  clearAllData: () => void;
  loadSample: () => void;
  realLocation: { lat: number; lng: number; accuracy: number } | null;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const { location: realLoc } = useRealLocation();
  const initialData = loadData();

  const graphRef = useRef<Graph>(new Graph());
  const hospitalRegistryRef = useRef<HospitalRegistry>(new HospitalRegistry(initialData.hospitals));
  const ambulanceRegistryRef = useRef<AmbulanceRegistry>(new AmbulanceRegistry(initialData.ambulances));
  const decisionLogRef = useRef<DecisionLog>(new DecisionLog());
  const dispatchEngineRef = useRef<DispatchEngine | null>(null);
  const eventEngineRef = useRef<EventEngine | null>(null);
  const rawDataRef = useRef<RouMiData>(initialData);
  const socketRef = useRef<Socket | null>(null);

  if (graphRef.current.nodeCount() === 0 && initialData.nodes.length > 0) {
    for (const n of initialData.nodes) graphRef.current.addNode(n);
    for (const e of initialData.edges) graphRef.current.addEdge(e);
  }

  if (!dispatchEngineRef.current) {
    dispatchEngineRef.current = new DispatchEngine(graphRef.current, hospitalRegistryRef.current, ambulanceRegistryRef.current, decisionLogRef.current);
    eventEngineRef.current = new EventEngine(graphRef.current, hospitalRegistryRef.current, ambulanceRegistryRef.current, dispatchEngineRef.current, decisionLogRef.current);
  }

  const [state, dispatch] = useReducer(reducer, {
    graph: graphRef.current,
    hospitals: hospitalRegistryRef.current.getAll(),
    ambulances: ambulanceRegistryRef.current.getAll(),
    doctors: initialData.doctors,
    requests: [],
    queue: [],
    results: new Map(),
    logs: decisionLogRef.current.getAll(),
    selectedRequestId: null,
    comparison: null,
    benchmark: null,
    isBenchmarking: false,
    presentationMode: false,
    rawData: initialData,
    realCenter: initialData.center || null,
    backendStatus: isBackendEnabled ? 'connected' : 'local',
  } as EngineState);

  const [tick, setTick] = useState(0);

  // Backend Socket.IO sync (for Render deployment)
  useEffect(() => {
    if (!isBackendEnabled) return;

    const API_URL = import.meta.env.VITE_API_URL;
    console.log(`[RouMi] Connecting to backend ${API_URL} as presenter`);
    const socket = io(API_URL, {
      auth: { role: 'presenter' },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[RouMi] Backend connected', socket.id);
      dispatch({ type: 'STATE_UPDATE', payload: { backendStatus: 'connected' } });
    });

    socket.on('state:snapshot', (fullState: any) => {
      console.log('[RouMi] Received state snapshot from backend', fullState.graphStats);
      // Rebuild local graph from backend snapshot for map display
      const g = new Graph();
      fullState.nodes?.forEach((n: GraphNode) => g.addNode(n));
      fullState.edges?.forEach((e: RoadEdge) => g.addEdge(e));
      graphRef.current = g;
      hospitalRegistryRef.current = new HospitalRegistry(fullState.hospitals || []);
      ambulanceRegistryRef.current = new AmbulanceRegistry(fullState.ambulances || []);
      rawDataRef.current = {
        nodes: fullState.nodes || [],
        edges: fullState.edges || [],
        hospitals: fullState.hospitals || [],
        ambulances: fullState.ambulances || [],
        doctors: fullState.doctors || [],
      };
      dispatch({
        type: 'STATE_UPDATE',
        payload: {
          graph: g,
          hospitals: fullState.hospitals || [],
          ambulances: fullState.ambulances || [],
          doctors: fullState.doctors || [],
          requests: fullState.requests || [],
          queue: fullState.queue || [],
          logs: fullState.logs || [],
          rawData: rawDataRef.current,
        },
      });
    });

    socket.on('state:update', (update: any) => {
      if (update.state) {
        const g = new Graph();
        update.state.nodes?.forEach((n: GraphNode) => g.addNode(n));
        update.state.edges?.forEach((e: RoadEdge) => g.addEdge(e));
        graphRef.current = g;
        hospitalRegistryRef.current = new HospitalRegistry(update.state.hospitals || []);
        ambulanceRegistryRef.current = new AmbulanceRegistry(update.state.ambulances || []);
        dispatch({
          type: 'STATE_UPDATE',
          payload: {
            graph: g,
            hospitals: update.state.hospitals || [],
            ambulances: update.state.ambulances || [],
            doctors: update.state.doctors || [],
            requests: update.state.requests || [],
            queue: update.state.queue || [],
            logs: update.state.logs || [],
          },
        });
      }
    });

    socket.on('log:new', (logEntry: DecisionLogEntry) => {
      dispatch({ type: 'SET_LOGS', payload: [...decisionLogRef.current.getAll(), logEntry] });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'STATE_UPDATE', payload: { backendStatus: 'error' } });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Local engine events (when no backend)
  useEffect(() => {
    if (isBackendEnabled) return; // Backend handles events via socket

    const engine = dispatchEngineRef.current!;
    const log = decisionLogRef.current!;

    const unsubEngine = engine.subscribe((ev: DispatchEvent) => {
      if (ev.type === 'request_assigned') playDispatchTone();
      if (ev.type === 'request_queued' && ev.request.urgency === 'CRITICAL') playCriticalAlert();
      setTick(t => t + 1);
    });

    const unsubLog = log.subscribe(() => {
      dispatch({ type: 'SET_LOGS', payload: log.getAll() });
    });

    if (initialData.nodes.length === 0) {
      log.logSimulationEvent('RouMi initialized with NO demo data — add real hospitals/villages via Data Manager. Real GPS will be used as center. Backend mode: ' + (isBackendEnabled ? 'Render connected' : 'Local in-memory'));
    } else {
      log.logSimulationEvent(`RouMi loaded ${initialData.nodes.length} nodes, ${initialData.hospitals.length} hospitals from local storage`);
    }

    const interval = setInterval(() => setTick(t => t + 1), 1000);

    return () => {
      unsubEngine();
      unsubLog();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isBackendEnabled) return;
    const engine = dispatchEngineRef.current!;
    dispatch({
      type: 'STATE_UPDATE',
      payload: {
        hospitals: hospitalRegistryRef.current.getAll(),
        ambulances: ambulanceRegistryRef.current.getAll(),
        requests: engine.getRequests(),
        queue: engine.getQueue(),
        results: new Map(engine.getRequests().map(r => [r.id, engine.getDispatchResult(r.id)]).filter(([, v]) => !!v) as [string, DispatchResult][]),
        rawData: rawDataRef.current,
        realCenter: rawDataRef.current.center || (realLoc ? { lat: realLoc.lat, lng: realLoc.lng } : null),
      },
    });
  }, [tick, realLoc]);

  const rebuildGraph = (data: RouMiData) => {
    const g = new Graph();
    for (const n of data.nodes) g.addNode(n);
    for (const e of data.edges) g.addEdge(e);
    graphRef.current = g;
    hospitalRegistryRef.current = new HospitalRegistry(data.hospitals);
    ambulanceRegistryRef.current = new AmbulanceRegistry(data.ambulances);
    dispatchEngineRef.current = new DispatchEngine(g, hospitalRegistryRef.current, ambulanceRegistryRef.current, decisionLogRef.current);
    eventEngineRef.current = new EventEngine(g, hospitalRegistryRef.current, ambulanceRegistryRef.current, dispatchEngineRef.current, decisionLogRef.current);
    rawDataRef.current = data;
    saveData(data);
    setTick(t => t + 1);
  };

  const addNode = useCallback((node: GraphNode) => {
    if (isBackendEnabled) {
      apiPost('/api/nodes', node).then(() => setTick(t => t + 1));
    } else {
      const newData = { ...rawDataRef.current, nodes: [...rawDataRef.current.nodes, node] };
      rebuildGraph(newData);
      decisionLogRef.current.logSimulationEvent(`Added ${node.type} ${node.name} @ ${node.lat.toFixed(4)},${node.lng.toFixed(4)}`);
    }
  }, []);

  const addEdge = useCallback((edge: RoadEdge) => {
    if (isBackendEnabled) {
      apiPost('/api/roads', edge).then(() => setTick(t => t + 1));
    } else {
      const newData = { ...rawDataRef.current, edges: [...rawDataRef.current.edges, edge] };
      rebuildGraph(newData);
      decisionLogRef.current.logSimulationEvent(`Added road ${edge.from} ↔ ${edge.to}`);
    }
  }, []);

  const addHospital = useCallback((hospital: Hospital, node: GraphNode) => {
    if (isBackendEnabled) {
      apiPost('/api/hospitals', { hospital, node }).then(() => setTick(t => t + 1));
    } else {
      const newData: RouMiData = {
        ...rawDataRef.current,
        nodes: rawDataRef.current.nodes.find(n => n.id === node.id) ? rawDataRef.current.nodes : [...rawDataRef.current.nodes, node],
        hospitals: [...rawDataRef.current.hospitals, hospital],
      };
      rebuildGraph(newData);
      decisionLogRef.current.logSimulationEvent(`Added hospital ${hospital.name}`);
    }
  }, []);

  const addAmbulance = useCallback((amb: Ambulance) => {
    if (isBackendEnabled) {
      apiPost('/api/ambulances', amb).then(() => setTick(t => t + 1));
    } else {
      const newData = { ...rawDataRef.current, ambulances: [...rawDataRef.current.ambulances, amb] };
      rebuildGraph(newData);
      decisionLogRef.current.logSimulationEvent(`Added ambulance ${amb.id}`);
    }
  }, []);

  const addDoctor = useCallback((doc: Doctor) => {
    if (isBackendEnabled) {
      apiPost('/api/doctors', doc).then(() => setTick(t => t + 1));
    } else {
      const newData = { ...rawDataRef.current, doctors: [...rawDataRef.current.doctors, doc] };
      rawDataRef.current = newData;
      saveData(newData);
      if (doc.shiftStatus === 'on-duty') {
        const hosp = hospitalRegistryRef.current.getById(doc.facilityId);
        if (hosp && !hosp.specialists.includes(doc.specialty)) {
          hospitalRegistryRef.current.setSpecialists(hosp.id, [...hosp.specialists, doc.specialty]);
        }
      }
      dispatch({ type: 'STATE_UPDATE', payload: { doctors: newData.doctors } });
      decisionLogRef.current.logSimulationEvent(`Added doctor ${doc.name} · ${doc.specialty} @ ${doc.facilityId}`);
      setTick(t => t + 1);
    }
  }, []);

  const clearAllData = useCallback(() => {
    if (isBackendEnabled) {
      apiDelete('/api/data').then(() => setTick(t => t + 1));
    } else {
      clearData();
      const empty: RouMiData = { nodes: [], edges: [], hospitals: [], ambulances: [], doctors: [] };
      rebuildGraph(empty);
      decisionLogRef.current.clear();
      decisionLogRef.current.logSimulationEvent('All data cleared — add real data with GPS');
      dispatch({ type: 'STATE_UPDATE', payload: { doctors: [], requests: [], queue: [], results: new Map(), logs: decisionLogRef.current.getAll() } });
    }
  }, []);

  const loadSample = useCallback(() => {
    if (isBackendEnabled) {
      // Backend will handle sample loading
      fetch(`${import.meta.env.VITE_API_URL}/api/state`).then(() => setTick(t => t + 1));
      return;
    }
    const center = realLoc ? { lat: realLoc.lat, lng: realLoc.lng } : undefined;
    const sample = loadSampleData(center);
    rebuildGraph(sample);
    dispatch({ type: 'STATE_UPDATE', payload: { doctors: sample.doctors } });
    decisionLogRef.current.logSimulationEvent('Loaded sample data around real location');
  }, [realLoc]);

  const handleNewRequest = useCallback((req: PatientRequest) => {
    if (isBackendEnabled) {
      apiPost('/api/requests', req).then((res: any) => {
        if (res?.result) dispatch({ type: 'SET_COMPARISON', payload: null });
        setTick(t => t + 1);
      });
      return { success: true, request: req, selectedHospital: null, evaluated: [], scored: [] } as any;
    }
    if (graphRef.current.nodeCount() === 0) {
      decisionLogRef.current.logSimulationEvent('Cannot dispatch — no nodes/hospitals added yet. Add data in Data Manager first.');
      return { success: false, reason: 'No data', request: req, selectedHospital: null, evaluated: [], scored: [] } as DispatchResult;
    }
    const res = dispatchEngineRef.current!.handleRequest(req);
    setTick(t => t + 1);
    return res;
  }, []);

  const compareRequest = useCallback((req: PatientRequest) => {
    if (isBackendEnabled) {
      apiPost('/api/dispatch/compare', req).then((res: any) => {
        if (res?.comparison) dispatch({ type: 'SET_COMPARISON', payload: res.comparison });
      });
      return null as any;
    }
    const comp = dispatchEngineRef.current!.compareWithNaive(req);
    dispatch({ type: 'SET_COMPARISON', payload: comp });
    return comp;
  }, []);

  const runBenchmarkFn = useCallback(async (size: number) => {
    if (isBackendEnabled) {
      dispatch({ type: 'SET_BENCHMARKING', payload: true });
      const res: any = await apiPost('/api/benchmark', { size });
      dispatch({ type: 'SET_BENCHMARK', payload: res.benchmark });
      dispatch({ type: 'SET_BENCHMARKING', payload: false });
      return res.benchmark;
    }
    dispatch({ type: 'SET_BENCHMARKING', payload: true });
    await new Promise(r => setTimeout(r, 50));
    const result = runBenchmark(size, 50, Date.now() % 10000);
    decisionLogRef.current.logBenchmarkRun(size, result.aStar.avgMs, result.dijkstra.avgMs, result.costsMatch);
    dispatch({ type: 'SET_BENCHMARK', payload: result });
    dispatch({ type: 'SET_BENCHMARKING', payload: false });
    return result;
  }, []);

  const blockRandomRoad = useCallback(() => {
    if (isBackendEnabled) apiPost('/api/simulation/block-road', {}).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.blockRoad(); setTick(t => t + 1); }
  }, []);
  const reopenRandomRoad = useCallback(() => {
    if (isBackendEnabled) apiPost('/api/simulation/reopen-road', {}).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.reopenRoad(); setTick(t => t + 1); }
  }, []);
  const fillRandomBeds = useCallback(() => {
    if (isBackendEnabled) apiPost('/api/simulation/fill-beds', {}).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.fillBeds(); setTick(t => t + 1); }
  }, []);
  const depleteRandomMedicine = useCallback(() => {
    if (isBackendEnabled) apiPost('/api/simulation/deplete-medicine', {}).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.depleteMedicine(); setTick(t => t + 1); }
  }, []);
  const setDoctorOffDuty = useCallback((hospitalId: string, specialty: string) => {
    if (isBackendEnabled) {
      // Find doctor with this specialty at hospital and toggle
      const doc = state.doctors.find(d => d.facilityId === hospitalId && d.specialty === specialty && d.shiftStatus === 'on-duty');
      if (doc) apiPost(`/api/doctors/${doc.id}/toggle`, {}).then(() => setTick(t => t + 1));
    } else {
      eventEngineRef.current!.setSpecialistStatus(hospitalId, specialty, false);
      setTick(t => t + 1);
    }
  }, [state.doctors]);
  const setDoctorOnDuty = useCallback((hospitalId: string, specialty: string) => {
    if (isBackendEnabled) {
      const doc = state.doctors.find(d => d.facilityId === hospitalId && d.specialty === specialty && d.shiftStatus === 'off-duty');
      if (doc) apiPost(`/api/doctors/${doc.id}/toggle`, {}).then(() => setTick(t => t + 1));
    } else {
      eventEngineRef.current!.setSpecialistStatus(hospitalId, specialty, true);
      setTick(t => t + 1);
    }
  }, [state.doctors]);
  const occupyAmbulance = useCallback(() => {
    if (isBackendEnabled) apiPost('/api/simulation/occupy-ambulance', {}).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.occupyAmbulance(); setTick(t => t + 1); }
  }, []);
  const freeAmbulance = useCallback(() => {
    if (isBackendEnabled) apiPost('/api/simulation/free-ambulance', {}).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.freeAmbulance(); setTick(t => t + 1); }
  }, []);
  const generateEmergency = useCallback((urgency?: PatientRequest['urgency']) => {
    if (isBackendEnabled) apiPost('/api/simulation/generate-emergency', { urgency }).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.generateRequest(undefined, urgency); setTick(t => t + 1); }
  }, []);
  const generateBurst = useCallback((count: number) => {
    if (isBackendEnabled) apiPost('/api/simulation/generate-burst', { count }).then(() => setTick(t => t + 1));
    else { eventEngineRef.current!.generateConcurrentBurst(count); setTick(t => t + 1); }
  }, []);
  const resetSimulation = useCallback(() => {
    if (isBackendEnabled) apiPost('/api/simulation/reset', {}).then(() => setTick(t => t + 1));
    else { dispatchEngineRef.current!.reset(); decisionLogRef.current.logSimulationEvent('Simulation reset — requests cleared'); setTick(t => t + 1); }
  }, []);
  const completeRequest = useCallback((id: string) => {
    if (isBackendEnabled) {
      // Backend handles via socket
      setTick(t => t + 1);
    } else {
      dispatchEngineRef.current!.completeRequest(id);
      setTick(t => t + 1);
    }
  }, []);

  const value: EngineContextValue = {
    state,
    dispatch,
    engine: dispatchEngineRef.current!,
    eventEngine: eventEngineRef.current!,
    graph: graphRef.current,
    hospitalRegistry: hospitalRegistryRef.current,
    ambulanceRegistry: ambulanceRegistryRef.current,
    decisionLog: decisionLogRef.current,
    handleNewRequest,
    compareRequest,
    runBenchmark: runBenchmarkFn,
    blockRandomRoad,
    reopenRandomRoad,
    fillRandomBeds,
    depleteRandomMedicine,
    setDoctorOffDuty,
    setDoctorOnDuty,
    occupyAmbulance,
    freeAmbulance,
    generateEmergency,
    generateBurst,
    resetSimulation,
    completeRequest,
    addNode,
    addEdge,
    addHospital,
    addAmbulance,
    addDoctor,
    clearAllData,
    loadSample,
    realLocation: realLoc ? { lat: realLoc.lat, lng: realLoc.lng, accuracy: realLoc.accuracy } : null,
  };

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error('useEngine must be used within EngineProvider');
  return ctx;
}
