/**
 * RuralCare Route - Domain Types
 * All entity interfaces as specified in Final MVP Blueprint §7
 */

export type NodeType = 'village' | 'hospital';
export type RoadStatus = 'open' | 'closed';
export type Urgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RequestStatus = 'QUEUED' | 'ASSIGNED' | 'EN_ROUTE' | 'COMPLETED' | 'REROUTING';
export type AmbulanceStatus = 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED';
export type ShiftStatus = 'on-duty' | 'off-duty';
export type HospitalStatus = 'operational' | 'overloaded' | 'closed';

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  type: NodeType;
  name?: string;
}

export interface RoadEdge {
  from: string;
  to: string;
  travelTime: number; // minutes
  distance: number; // km
  status: RoadStatus;
  id: string; // from-to composite
}

export interface Hospital {
  id: string;
  nodeId: string;
  name: string;
  specialists: string[];
  bedsTotal: number;
  bedsAvailable: number;
  bedsReserved: number;
  medicines: Record<string, { available: number; reserved: number; total: number }>;
  status: HospitalStatus;
}

export interface Doctor {
  id: string;
  specialty: string;
  facilityId: string;
  shiftStatus: ShiftStatus;
  name: string;
}

export interface Ambulance {
  id: string;
  nodeId: string;
  status: AmbulanceStatus;
  currentRequestId: string | null;
  baseNodeId: string;
}

export interface PatientRequest {
  id: string;
  patientId: string;
  originNode: string;
  originName?: string;
  emergencyType: string;
  urgency: Urgency;
  specialtyRequired: string;
  medicineRequired?: string;
  medicineQty?: number;
  createdAt: number; // epoch ms
  status: RequestStatus;
  assignedHospitalId?: string;
  assignedAmbulanceId?: string;
  route?: string[]; // node ids
  routeCost?: number;
}

export interface PathResult {
  path: string[];
  totalCost: number;
  visitedNodes: number;
  executionTimeMs: number;
  feasible: boolean;
}

export interface FilterResult {
  hospital: Hospital;
  passed: boolean;
  failedConstraint?: 'specialist' | 'bed' | 'medicine' | 'reachability';
  travelTime?: number;
  route?: PathResult;
}

export interface ScoredHospital extends FilterResult {
  score: number;
  normalizedTravel: number;
  normalizedWait: number;
}

export interface DispatchResult {
  request: PatientRequest;
  selectedHospital: Hospital | null;
  evaluated: FilterResult[];
  scored: ScoredHospital[];
  ambulance?: Ambulance;
  route?: PathResult;
  success: boolean;
  reason?: string;
}

export interface ComparisonResult {
  naive: {
    hospital: Hospital | null;
    violatedConstraint?: string;
    distance: number;
    feasible: boolean;
    reason: string;
  };
  optimized: DispatchResult;
}

export const URGENCY_RANK: Record<Urgency, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const SPECIALTIES = [
  'Cardiologist',
  'Neurologist',
  'Orthopedic',
  'Pediatrician',
  'General Surgeon',
  'Pulmonologist',
  'Gynaecologist',
  'Trauma Specialist',
] as const;

export const MEDICINES = [
  'Cardiac Drug X',
  'Neuro Aid',
  'Ortho Kit',
  'Pediatric Serum',
  'Surgical Kit',
  'Ventilator Support',
  'Oxytocin',
  'Trauma Pack',
] as const;

export const EMERGENCY_TYPES = [
  'Cardiac Emergency',
  'Neuro Emergency',
  'Fracture',
  'Pediatric Emergency',
  'Surgical Emergency',
  'Respiratory Distress',
  'Maternal Emergency',
  'Road Accident',
] as const;
