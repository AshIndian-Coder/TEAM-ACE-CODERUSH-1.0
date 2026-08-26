/**
 * RouMi Backend — Render Deployable
 * Express + Socket.IO hosting the SAME engine package
 * In-memory only, no DB (as per MVP scope), but with persistence to JSON file for Render
 * Role-based: presenter can control, viewer only watches
 * 
 * Deploy to Render:
 * 1. Push to GitHub
 * 2. Render → New Web Service → Connect repo → Root: server → Build: npm install && npm run build → Start: npm start
 * 3. Set env PORT (auto) and CORS_ORIGIN=https://your-frontend.vercel.app
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Engine imports (same package frontend uses) - relative to server folder
import { Graph } from '../../engine/graph/Graph.js';
import { HospitalRegistry } from '../../engine/resources/HospitalRegistry.js';
import { AmbulanceRegistry } from '../../engine/resources/AmbulanceRegistry.js';
import { DecisionLog } from '../../engine/decisionLog/DecisionLog.js';
import { DispatchEngine } from '../../engine/dispatch/DispatchEngine.js';
import { EventEngine } from '../../engine/simulation/EventEngine.js';
import { runBenchmark } from '../../engine/benchmark/runBenchmark.js';
import type { GraphNode, RoadEdge, Hospital, Ambulance, PatientRequest } from '../../engine/domain/types.js';
import type { Doctor } from '../../engine/domain/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// CORS — allow frontend (Vercel) + local
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));

// Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// In-memory engine state (single instance for all clients — as per optional backend spec)
let graph = new Graph();
let hospitalRegistry = new HospitalRegistry([]);
let ambulanceRegistry = new AmbulanceRegistry([]);
let decisionLog = new DecisionLog();
let dispatchEngine: DispatchEngine;
let eventEngine: EventEngine;
let doctors: Doctor[] = [];

const DATA_FILE = path.join(__dirname, '../data.json');

function loadPersistedData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      console.log(`[RouMi] Loaded persisted data: ${data.nodes?.length || 0} nodes, ${data.hospitals?.length || 0} hospitals`);
      return data;
    }
  } catch (e) {
    console.warn('[RouMi] No persisted data or failed to load', e);
  }
  return null;
}

function persistData() {
  try {
    const data = {
      nodes: graph.getAllNodes(),
      edges: graph.getAllEdges(),
      hospitals: hospitalRegistry.getAll(),
      ambulances: ambulanceRegistry.getAll(),
      doctors,
      center: null,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('[RouMi] Failed to persist', e);
  }
}

function initEngine() {
  const persisted = loadPersistedData();
  
  graph = new Graph();
  if (persisted && persisted.nodes?.length > 0) {
    persisted.nodes.forEach((n: GraphNode) => graph.addNode(n));
    persisted.edges?.forEach((e: RoadEdge) => graph.addEdge(e));
    hospitalRegistry = new HospitalRegistry(persisted.hospitals || []);
    ambulanceRegistry = new AmbulanceRegistry(persisted.ambulances || []);
    doctors = persisted.doctors || [];
  } else {
    // Start empty for real data - no demo, as user requested
    console.log('[RouMi] No persisted data, starting empty (user will add real data via Data Manager)');
    hospitalRegistry = new HospitalRegistry([]);
    ambulanceRegistry = new AmbulanceRegistry([]);
    doctors = [];
  }

  decisionLog = new DecisionLog();
  dispatchEngine = new DispatchEngine(graph, hospitalRegistry, ambulanceRegistry, decisionLog);
  eventEngine = new EventEngine(graph, hospitalRegistry, ambulanceRegistry, dispatchEngine, decisionLog);

  decisionLog.logSimulationEvent(`RouMi Backend initialized — ${graph.nodeCount()} nodes, ${hospitalRegistry.getAll().length} hospitals, ${ambulanceRegistry.getAll().length} ambulances | Render deploy ready | O((V+E) log V)`);

  // Subscribe to broadcast state changes
  dispatchEngine.subscribe((event) => {
    io.emit('state:update', {
      type: event.type,
      request: event.request,
      result: event.result,
      timestamp: event.timestamp,
      state: getFullState(),
    });
  });

  decisionLog.subscribe((logEntry) => {
    io.emit('log:new', logEntry);
  });
}

function getFullState() {
  return {
    nodes: graph.getAllNodes(),
    edges: graph.getAllEdges(),
    hospitals: hospitalRegistry.getAll(),
    ambulances: ambulanceRegistry.getAll(),
    doctors,
    requests: dispatchEngine?.getRequests() || [],
    queue: dispatchEngine?.getQueue() || [],
    logs: decisionLog?.getAll().slice(-100) || [],
    graphStats: {
      nodes: graph.nodeCount(),
      edges: graph.edgeCount(),
    },
  };
}

initEngine();

// REST API — for Render deployment + frontend integration
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'RouMi Backend', 
    version: '1.0.0',
    engine: 'O((V+E) log V) · Atomic reservation · A* primary · Dijkstra oracle',
    state: getFullState().graphStats,
    timestamp: new Date().toISOString(),
    deploy: 'Render ready',
  });
});

app.get('/api/state', (req, res) => {
  res.json(getFullState());
});

app.get('/api/hospitals', (req, res) => {
  res.json(hospitalRegistry.getAll());
});

app.post('/api/hospitals', (req, res) => {
  const { hospital, node } = req.body;
  if (!hospital || !node) return res.status(400).json({ error: 'hospital and node required' });
  
  graph.addNode(node);
  hospitalRegistry.add(hospital);
  persistData();
  
  io.emit('state:update', { type: 'hospital_added', hospital, node, state: getFullState() });
  res.json({ success: true, hospital, node });
});

app.get('/api/nodes', (req, res) => {
  res.json({ nodes: graph.getAllNodes(), edges: graph.getAllEdges() });
});

app.post('/api/nodes', (req, res) => {
  const node: GraphNode = req.body;
  if (!node.id || !node.lat || !node.lng) return res.status(400).json({ error: 'id, lat, lng required' });
  graph.addNode(node);
  persistData();
  io.emit('state:update', { type: 'node_added', node, state: getFullState() });
  res.json({ success: true, node });
});

app.post('/api/roads', (req, res) => {
  const edge: RoadEdge = req.body;
  if (!edge.from || !edge.to) return res.status(400).json({ error: 'from, to required' });
  try {
    graph.addEdge(edge);
    persistData();
    io.emit('state:update', { type: 'road_added', edge, state: getFullState() });
    res.json({ success: true, edge });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/ambulances', (req, res) => {
  res.json(ambulanceRegistry.getAll());
});

app.post('/api/ambulances', (req, res) => {
  const amb: Ambulance = req.body;
  if (!amb.id || !amb.nodeId) return res.status(400).json({ error: 'id, nodeId required' });
  ambulanceRegistry.add(amb);
  persistData();
  io.emit('state:update', { type: 'ambulance_added', ambulance: amb, state: getFullState() });
  res.json({ success: true, ambulance: amb });
});

app.get('/api/doctors', (req, res) => {
  res.json(doctors);
});

app.post('/api/doctors', (req, res) => {
  const doc: Doctor = req.body;
  if (!doc.name || !doc.facilityId) return res.status(400).json({ error: 'name, facilityId required' });
  doctors.push(doc);
  // Add specialty to hospital if on-duty
  if (doc.shiftStatus === 'on-duty') {
    const hosp = hospitalRegistry.getById(doc.facilityId);
    if (hosp && !hosp.specialists.includes(doc.specialty)) {
      hospitalRegistry.setSpecialists(hosp.id, [...hosp.specialists, doc.specialty]);
    }
  }
  persistData();
  io.emit('state:update', { type: 'doctor_added', doctor: doc, state: getFullState() });
  res.json({ success: true, doctor: doc });
});

app.post('/api/doctors/:id/toggle', (req, res) => {
  const { id } = req.params;
  const doc = doctors.find(d => d.id === id);
  if (!doc) return res.status(404).json({ error: 'Doctor not found' });
  
  doc.shiftStatus = doc.shiftStatus === 'on-duty' ? 'off-duty' : 'on-duty';
  eventEngine.setSpecialistStatus(doc.facilityId, doc.specialty, doc.shiftStatus === 'on-duty');
  persistData();
  
  io.emit('state:update', { type: 'doctor_toggled', doctor: doc, state: getFullState() });
  res.json({ success: true, doctor: doc });
});

app.get('/api/requests', (req, res) => {
  res.json(dispatchEngine.getRequests());
});

app.post('/api/requests', (req, res) => {
  const request: PatientRequest = req.body;
  if (!request.id || !request.originNode) return res.status(400).json({ error: 'id, originNode required' });
  
  const result = dispatchEngine.handleRequest(request);
  persistData();
  res.json({ success: true, result, state: getFullState() });
});

app.post('/api/dispatch/compare', (req, res) => {
  const request: PatientRequest = req.body;
  const comparison = dispatchEngine.compareWithNaive(request);
  res.json({ success: true, comparison });
});

app.post('/api/benchmark', (req, res) => {
  const { size = 1000 } = req.body;
  const result = runBenchmark(size, 50, Date.now() % 10000);
  decisionLog.logBenchmarkRun(size, result.aStar.avgMs, result.dijkstra.avgMs, result.costsMatch);
  res.json({ success: true, benchmark: result });
});

app.post('/api/simulation/:action', (req, res) => {
  const { action } = req.params;
  const { hospitalId, specialty, edgeId, count } = req.body;
  
  let result: any = null;
  switch (action) {
    case 'block-road':
      result = eventEngine.blockRoad(edgeId);
      break;
    case 'reopen-road':
      result = eventEngine.reopenRoad(edgeId);
      break;
    case 'fill-beds':
      result = eventEngine.fillBeds(hospitalId);
      break;
    case 'deplete-medicine':
      result = eventEngine.depleteMedicine(hospitalId);
      break;
    case 'occupy-ambulance':
      result = eventEngine.occupyAmbulance();
      break;
    case 'free-ambulance':
      result = eventEngine.freeAmbulance();
      break;
    case 'generate-emergency':
      result = eventEngine.generateRequest(undefined, req.body.urgency);
      break;
    case 'generate-burst':
      result = eventEngine.generateConcurrentBurst(count || 5);
      break;
    case 'reset':
      dispatchEngine.reset();
      result = 'reset';
      break;
    default:
      return res.status(400).json({ error: `Unknown action ${action}` });
  }
  
  persistData();
  res.json({ success: true, result, state: getFullState() });
});

app.delete('/api/data', (req, res) => {
  try { fs.unlinkSync(DATA_FILE); } catch {}
  initEngine();
  res.json({ success: true, message: 'All data cleared', state: getFullState() });
});

// Socket.IO — Real-time sync for presenter/viewer
io.on('connection', (socket) => {
  const role = (socket.handshake.auth?.role || socket.handshake.query?.role || 'viewer') as string;
  console.log(`[RouMi] Client connected: ${socket.id} role=${role}`);

  // Send full state snapshot on join
  socket.emit('state:snapshot', getFullState());

  // Presenter-only control events (rejected server-side for viewers)
  socket.on('control:action', (payload) => {
    if (role !== 'presenter') {
      socket.emit('error', { message: 'Viewers cannot control simulation — only presenter role allowed' });
      return;
    }

    const { action, data } = payload;
    console.log(`[RouMi] Presenter action: ${action}`, data);

    // Relay to all clients via engine
    switch (action) {
      case 'generate-emergency':
        eventEngine.generateRequest(data?.originNodeId, data?.urgency);
        break;
      case 'block-road':
        eventEngine.blockRoad(data?.edgeId);
        break;
      case 'fill-beds':
        eventEngine.fillBeds(data?.hospitalId);
        break;
      case 'add-hospital':
        if (data?.hospital && data?.node) {
          graph.addNode(data.node);
          hospitalRegistry.add(data.hospital);
        }
        break;
      case 'add-doctor':
        if (data?.doctor) {
          doctors.push(data.doctor);
        }
        break;
      default:
        console.warn(`[RouMi] Unknown presenter action ${action}`);
    }

    persistData();
    io.emit('state:update', { type: `presenter:${action}`, data, state: getFullState() });
  });

  socket.on('disconnect', () => {
    console.log(`[RouMi] Client disconnected: ${socket.id}`);
  });
});

// Frontend static serve (if frontend built into server/public)
const publicPath = path.join(__dirname, '../../dist');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
      res.sendFile(path.join(publicPath, 'index.html'));
    }
  });
}

const PORT = parseInt(process.env.PORT || '3001', 10);
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🏥 RouMi Backend running on port ${PORT}`);
  console.log(`📊 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.IO: ws://localhost:${PORT} (presenter/viewer roles)`);
  console.log(`🌍 CORS Origin: ${CORS_ORIGIN}`);
  console.log(`💾 Data file: ${DATA_FILE}`);
  console.log(`🚀 Render deploy: Build=npm install && npm run build, Start=npm start\n`);
});
