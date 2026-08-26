/**
 * EventEngine - Programmatic triggers for simulation
 * Block road, reopen, set specialist, fill beds, deplete medicine, occupy/free ambulance, generate requests
 */

import { Graph } from '../graph/Graph';
import { HospitalRegistry } from '../resources/HospitalRegistry';
import { AmbulanceRegistry } from '../resources/AmbulanceRegistry';
import { DispatchEngine } from '../dispatch/DispatchEngine';
import { DecisionLog } from '../decisionLog/DecisionLog';
import type { PatientRequest, Urgency } from '../domain/types';
import { SPECIALTIES, MEDICINES, EMERGENCY_TYPES } from '../domain/types';

export class EventEngine {
  private graph: Graph;
  private hospitalRegistry: HospitalRegistry;
  private ambulanceRegistry: AmbulanceRegistry;
  private dispatchEngine: DispatchEngine;
  private decisionLog: DecisionLog;

  constructor(
    graph: Graph,
    hospitalRegistry: HospitalRegistry,
    ambulanceRegistry: AmbulanceRegistry,
    dispatchEngine: DispatchEngine,
    decisionLog: DecisionLog
  ) {
    this.graph = graph;
    this.hospitalRegistry = hospitalRegistry;
    this.ambulanceRegistry = ambulanceRegistry;
    this.dispatchEngine = dispatchEngine;
    this.decisionLog = decisionLog;
  }

  blockRoad(edgeId?: string): string | null {
    const edges = this.graph.getAllEdges().filter((e) => e.status === 'open');
    if (edges.length === 0) return null;
    const edge = edgeId ? this.graph.getEdge(edgeId) : edges[Math.floor(Math.random() * edges.length)];
    if (!edge) return null;
    this.graph.closeEdge(edge.id);
    this.decisionLog.logEdgeBlocked(edge.id, edge.from, edge.to);
    this.dispatchEngine.handleConditionChange({ type: 'road_closed', edgeId: edge.id });
    return edge.id;
  }

  reopenRoad(edgeId?: string): string | null {
    const edges = this.graph.getAllEdges().filter((e) => e.status === 'closed');
    if (edges.length === 0) return null;
    const edge = edgeId ? this.graph.getEdge(edgeId) : edges[Math.floor(Math.random() * edges.length)];
    if (!edge) return null;
    this.graph.openEdge(edge.id);
    this.decisionLog.logEdgeReopened(edge.id, edge.from, edge.to);
    return edge.id;
  }

  setSpecialistStatus(hospitalId: string, specialty: string, available: boolean): void {
    const hosp = this.hospitalRegistry.getById(hospitalId);
    if (!hosp) return;
    let specialists = [...hosp.specialists];
    if (available) {
      if (!specialists.includes(specialty)) specialists.push(specialty);
    } else {
      specialists = specialists.filter((s) => s !== specialty);
    }
    this.hospitalRegistry.setSpecialists(hospitalId, specialists);
    this.decisionLog.logSimulationEvent(
      `Specialist ${specialty} ${available ? 'ON-DUTY' : 'OFF-DUTY'} @ ${hosp.name}`,
      { hospitalId, specialty, available }
    );
    if (!available) {
      this.dispatchEngine.handleConditionChange({ type: 'specialist_off', hospitalId });
    }
  }

  fillBeds(hospitalId?: string): string | null {
    const hospitals = this.hospitalRegistry.getAll();
    if (hospitals.length === 0) return null;
    const target = hospitalId
      ? this.hospitalRegistry.getById(hospitalId)
      : hospitals[Math.floor(Math.random() * hospitals.length)];
    if (!target) return null;
    this.hospitalRegistry.fillBeds(target.id);
    this.decisionLog.logSimulationEvent(`Beds FILLED @ ${target.name} (${target.bedsTotal} beds now occupied)`, {
      hospitalId: target.id,
    });
    this.dispatchEngine.handleConditionChange({ type: 'beds_full', hospitalId: target.id });
    return target.id;
  }

  depleteMedicine(hospitalId?: string, medicine?: string): { hospitalId: string; medicine: string } | null {
    const hospitals = this.hospitalRegistry.getAll();
    if (hospitals.length === 0) return null;
    const target = hospitalId
      ? this.hospitalRegistry.getById(hospitalId)
      : hospitals[Math.floor(Math.random() * hospitals.length)];
    if (!target) return null;
    const med = medicine || Object.keys(target.medicines)[Math.floor(Math.random() * Object.keys(target.medicines).length)];
    if (!med) return null;
    this.hospitalRegistry.depleteMedicine(target.id, med);
    this.decisionLog.logSimulationEvent(`Medicine DEPLETED ${med} @ ${target.name}`, {
      hospitalId: target.id,
      medicine: med,
    });
    this.dispatchEngine.handleConditionChange({ type: 'medicine_depleted', hospitalId: target.id });
    return { hospitalId: target.id, medicine: med };
  }

  occupyAmbulance(ambulanceId?: string): string | null {
    const available = this.ambulanceRegistry.getAvailable();
    if (available.length === 0) return null;
    const target = ambulanceId
      ? this.ambulanceRegistry.getById(ambulanceId)
      : available[Math.floor(Math.random() * available.length)];
    if (!target) return null;
    this.ambulanceRegistry.assign(target.id, `sim-occupy-${Date.now()}`);
    this.decisionLog.logSimulationEvent(`Ambulance ${target.id} OCCUPIED (simulated)`, { ambulanceId: target.id });
    return target.id;
  }

  freeAmbulance(ambulanceId?: string): string | null {
    const all = this.ambulanceRegistry.getAll().filter((a) => a.status !== 'AVAILABLE');
    if (all.length === 0) return null;
    const target = ambulanceId
      ? this.ambulanceRegistry.getById(ambulanceId)
      : all[Math.floor(Math.random() * all.length)];
    if (!target) return null;
    this.ambulanceRegistry.release(target.id);
    this.decisionLog.logSimulationEvent(`Ambulance ${target.id} FREED`, { ambulanceId: target.id });
    return target.id;
  }

  generateRequest(originNodeId?: string, urgency?: Urgency): PatientRequest {
    const nodes = this.graph.getAllNodes().filter((n) => n.type === 'village');
    if (nodes.length === 0) throw new Error('No village nodes');
    const origin = originNodeId
      ? nodes.find((n) => n.id === originNodeId) || nodes[0]
      : nodes[Math.floor(Math.random() * nodes.length)];

    const urgencies: Urgency[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const chosenUrgency = urgency || urgencies[Math.floor(Math.random() * urgencies.length)];
    const specialtyIdx = Math.floor(Math.random() * SPECIALTIES.length);

    const req: PatientRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      patientId: `pat-${Math.random().toString(36).slice(2, 8)}`,
      originNode: origin.id,
      originName: origin.name,
      emergencyType: EMERGENCY_TYPES[specialtyIdx] || 'General Emergency',
      urgency: chosenUrgency,
      specialtyRequired: SPECIALTIES[specialtyIdx],
      medicineRequired: MEDICINES[specialtyIdx],
      medicineQty: 1,
      createdAt: Date.now(),
      status: 'QUEUED',
    };

    this.dispatchEngine.handleRequest(req);
    return req;
  }

  generateConcurrentBurst(count: number): PatientRequest[] {
    const requests: PatientRequest[] = [];
    // Fire N requests in same tick to stress-test queue and resource locking
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      const nodes = this.graph.getAllNodes().filter((n) => n.type === 'village');
      const origin = nodes[Math.floor(Math.random() * nodes.length)];
      const urgencies: Urgency[] = i < 2 ? ['CRITICAL', 'CRITICAL'] : ['HIGH', 'MEDIUM', 'LOW'];
      const urgency = urgencies[Math.floor(Math.random() * urgencies.length)] as Urgency;
      const specialtyIdx = Math.floor(Math.random() * SPECIALTIES.length);

      const req: PatientRequest = {
        id: `burst-${now}-${i}-${Math.random().toString(36).slice(2, 4)}`,
        patientId: `pat-burst-${i}`,
        originNode: origin.id,
        originName: origin.name,
        emergencyType: EMERGENCY_TYPES[specialtyIdx],
        urgency,
        specialtyRequired: SPECIALTIES[specialtyIdx],
        medicineRequired: MEDICINES[specialtyIdx],
        medicineQty: 1,
        createdAt: now + i, // slight increment for deterministic tie-break but same tick
        status: 'QUEUED',
      };
      requests.push(req);
    }

    // Enqueue all without immediate processing, then process in priority order
    // Simulate concurrent calls
    for (const req of requests) {
      this.dispatchEngine.handleRequest(req);
    }

    this.decisionLog.logSimulationEvent(`CONCURRENT BURST: ${count} requests fired in same tick`, {
      count,
      criticalCount: requests.filter((r) => r.urgency === 'CRITICAL').length,
    });

    return requests;
  }

  reset(): void {
    this.decisionLog.logSimulationEvent('SIMULATION RESET triggered');
  }
}
