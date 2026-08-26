/**
 * Data Store - No demo data, user adds everything
 * Persists to localStorage, uses real GPS location as center
 */

import type { GraphNode, Hospital, Ambulance, RoadEdge } from '../../engine/domain/types';
import type { Doctor } from '../../engine/domain/types';

export interface RouMiData {
  nodes: GraphNode[];
  edges: RoadEdge[];
  hospitals: Hospital[];
  ambulances: Ambulance[];
  doctors: Doctor[];
  center?: { lat: number; lng: number };
}

const STORAGE_KEY = 'roumi_data_v2';

export function loadData(): RouMiData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed;
    }
  } catch {}
  return {
    nodes: [],
    edges: [],
    hospitals: [],
    ambulances: [],
    doctors: [],
  };
}

export function saveData(data: RouMiData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data', e);
  }
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function addNode(data: RouMiData, node: GraphNode): RouMiData {
  const newData = { ...data, nodes: [...data.nodes, node] };
  saveData(newData);
  return newData;
}

export function addEdge(data: RouMiData, edge: RoadEdge): RouMiData {
  const newData = { ...data, edges: [...data.edges, edge] };
  saveData(newData);
  return newData;
}

export function addHospital(data: RouMiData, hospital: Hospital): RouMiData {
  const newData = { ...data, hospitals: [...data.hospitals, hospital] };
  // Also add hospital node if not exists
  if (!newData.nodes.find(n => n.id === hospital.nodeId)) {
    newData.nodes.push({
      id: hospital.nodeId,
      lat: 0,
      lng: 0,
      type: 'hospital',
      name: hospital.name,
    });
  }
  saveData(newData);
  return newData;
}

export function addAmbulance(data: RouMiData, amb: Ambulance): RouMiData {
  const newData = { ...data, ambulances: [...data.ambulances, amb] };
  saveData(newData);
  return newData;
}

export function addDoctor(data: RouMiData, doc: Doctor): RouMiData {
  const newData = { ...data, doctors: [...data.doctors, doc] };
  saveData(newData);
  return newData;
}

// Sample data loader (optional, for testing)
export function loadSampleData(realCenter?: { lat: number; lng: number }): RouMiData {
  const baseLat = realCenter?.lat || 19.25;
  const baseLng = realCenter?.lng || 74.1;

  const nodes: GraphNode[] = [
    { id: 'v-01', lat: baseLat + 0.05, lng: baseLng - 0.05, type: 'village', name: 'Village Near You 1' },
    { id: 'v-02', lat: baseLat + 0.08, lng: baseLng + 0.02, type: 'village', name: 'Village Near You 2' },
    { id: 'v-03', lat: baseLat - 0.03, lng: baseLng - 0.08, type: 'village', name: 'Village Near You 3' },
    { id: 'h-01', lat: baseLat + 0.02, lng: baseLng + 0.05, type: 'hospital', name: 'Hospital Near You' },
  ];

  const edges: RoadEdge[] = [
    { id: 'v-01->h-01', from: 'v-01', to: 'h-01', travelTime: 12, distance: 8, status: 'open' },
    { id: 'v-02->h-01', from: 'v-02', to: 'h-01', travelTime: 10, distance: 7, status: 'open' },
    { id: 'v-03->v-01', from: 'v-03', to: 'v-01', travelTime: 15, distance: 10, status: 'open' },
  ];

  const hospitals: Hospital[] = [
    {
      id: 'h-01',
      nodeId: 'h-01',
      name: 'Hospital Near You',
      specialists: ['General Surgeon', 'Cardiologist', 'Trauma Specialist'],
      bedsTotal: 20,
      bedsAvailable: 12,
      bedsReserved: 0,
      medicines: {
        'Surgical Kit': { available: 15, reserved: 0, total: 15 },
        'Cardiac Drug X': { available: 10, reserved: 0, total: 10 },
        'Trauma Pack': { available: 12, reserved: 0, total: 12 },
      },
      status: 'operational',
    },
  ];

  const ambulances: Ambulance[] = [
    { id: 'AMB-01', nodeId: 'h-01', baseNodeId: 'h-01', status: 'AVAILABLE', currentRequestId: null },
  ];

  const doctors: Doctor[] = [
    { id: 'doc-01', name: 'Dr. Sample', specialty: 'General Surgeon', facilityId: 'h-01', shiftStatus: 'on-duty' },
  ];

  const data: RouMiData = { nodes, edges, hospitals, ambulances, doctors, center: { lat: baseLat, lng: baseLng } };
  saveData(data);
  return data;
}
