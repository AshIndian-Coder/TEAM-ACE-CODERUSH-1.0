
import { Graph } from '../graph/Graph';
import { HospitalRegistry } from '../resources/HospitalRegistry';
import { AmbulanceRegistry } from '../resources/AmbulanceRegistry';
import { PriorityQueue } from '../domain/PriorityQueue';
import { DecisionLog } from '../decisionLog/DecisionLog';
import { filterFacilities } from './facilityFilter';
import { scoreFacilities, DEFAULT_WEIGHTS, type CostWeights } from './costFunction';
import { naiveNearestHospitalAssign, type NaiveResult } from './naiveBaseline';
import { astar } from '../graph/astar';
import type {
  PatientRequest,
  DispatchResult,
  ComparisonResult,
  Hospital,
} from '../domain/types';

export type DispatchEventType =
  | 'request_queued'
  | 'request_assigned'
  | 'request_en_route'
  | 'request_rerouting'
  | 'request_completed'
  | 'request_failed'
  | 'state_changed';

export interface DispatchEvent {
  type: DispatchEventType;
  request: PatientRequest;
  result?: DispatchResult;
  timestamp: number;
}

export class DispatchEngine {
  private graph: Graph;
  private hospitalRegistry: HospitalRegistry;
  private ambulanceRegistry: AmbulanceRegistry;
  private queue: PriorityQueue;
  private decisionLog: DecisionLog;
  private requests: Map<string, PatientRequest> = new Map();
  private dispatchResults: Map<string, DispatchResult> = new Map();
  private subscribers: Set<(event: DispatchEvent) => void> = new Set();
  private weights: CostWeights;

  constructor(
    graph: Graph,
    hospitalRegistry: HospitalRegistry,
    ambulanceRegistry: AmbulanceRegistry,
    decisionLog: DecisionLog,
    weights: CostWeights = DEFAULT_WEIGHTS
  ) {
    this.graph = graph;
    this.hospitalRegistry = hospitalRegistry;
    this.ambulanceRegistry = ambulanceRegistry;
    this.decisionLog = decisionLog;
    this.queue = new PriorityQueue();
    this.weights = { ...weights };
  }

  subscribe(fn: (event: DispatchEvent) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private emit(event: DispatchEvent): void {
    for (const sub of this.subscribers) sub(event);
  }

  setWeights(weights: CostWeights): void {
    this.weights = { ...weights };
  }

  getWeights(): CostWeights {
    return { ...this.weights };
  }

  // Intake
  handleRequest(request: PatientRequest): DispatchResult {
    // Validate
    request.createdAt = request.createdAt || Date.now();
    request.status = 'QUEUED';

    this.requests.set(request.id, { ...request });
    this.queue.enqueue(request);
    this.decisionLog.logRequestReceived(request.id, request.urgency, request.specialtyRequired, request.originNode);

    this.emit({ type: 'request_queued', request, timestamp: Date.now() });

    // Try immediate dispatch
    const result = this.processQueue();

    // If this specific request was processed, return its result, otherwise return queued state
    const res = this.dispatchResults.get(request.id);
    if (res) return res;

    // Still queued
    return {
      request,
      selectedHospital: null,
      evaluated: [],
      scored: [],
      success: false,
      reason: 'Queued - no feasible hospital or ambulance currently available',
    };
  }

  private processQueue(): DispatchResult | null {
    if (this.queue.isEmpty()) return null;

    // Peek highest priority
    const request = this.queue.peek();
    if (!request) return null;

    const result = this.dispatchForRequest(request);

    if (result.success) {
      this.queue.remove(request.id);
      this.requests.set(request.id, result.request);
      this.dispatchResults.set(request.id, result);
      this.emit({ type: 'request_assigned', request: result.request, result, timestamp: Date.now() });

      // Simulate immediate en-route after assignment
      setTimeout(() => {
        const req = this.requests.get(request.id);
        if (req && req.status === 'ASSIGNED') {
          req.status = 'EN_ROUTE';
          this.requests.set(req.id, req);
          if (req.assignedAmbulanceId) {
            this.ambulanceRegistry.setEnRoute(req.assignedAmbulanceId);
          }
          this.emit({ type: 'request_en_route', request: req, result, timestamp: Date.now() });
        }
      }, 100);

      return result;
    } else {
      // Keep in queue, but log
      return result;
    }
  }

  private dispatchForRequest(request: PatientRequest): DispatchResult {
    const hospitals = this.hospitalRegistry.getAll();
    this.decisionLog.logFilterStart(request.id, hospitals.length);

    const filtered = filterFacilities(request, hospitals, this.graph);

    // Log rejections from real output
    for (const f of filtered) {
      if (!f.passed) {
        const hNode = this.graph.getNode(f.hospital.nodeId);
        const oNode = this.graph.getNode(request.originNode);
        let dist: number | undefined;
        if (hNode && oNode) {
          const dLat = hNode.lat - oNode.lat;
          const dLng = hNode.lng - oNode.lng;
          dist = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
        }
        this.decisionLog.logHospitalRejected(
          request.id,
          f.hospital.name,
          f.failedConstraint!,
          dist,
          f.travelTime
        );
      }
    }

    const scored = scoreFacilities(filtered, this.weights);

    if (scored.length === 0) {
      const reason = 'No feasible hospital after hard-constraint filter';
      return {
        request,
        selectedHospital: null,
        evaluated: filtered,
        scored: [],
        success: false,
        reason,
      };
    }

    // Try to reserve best hospital
    let selected: (typeof scored)[0] | null = null;
    let reservationSuccess = false;

    for (const candidate of scored) {
      const ok = this.hospitalRegistry.reserve(
        candidate.hospital.id,
        request.medicineRequired,
        request.medicineQty
      );
      if (ok) {
        selected = candidate;
        reservationSuccess = true;
        break;
      } else {
        // Log contention
        this.decisionLog.logHospitalRejected(
          candidate.hospital.id,
          candidate.hospital.name,
          'bed', // contention
          undefined,
          candidate.travelTime
        );
      }
    }

    if (!selected || !reservationSuccess) {
      return {
        request,
        selectedHospital: null,
        evaluated: filtered,
        scored,
        success: false,
        reason: 'All feasible hospitals failed atomic reservation (contention)',
      };
    }

   
    const freshHospital = this.hospitalRegistry.getById(selected.hospital.id)!;
    this.decisionLog.logHospitalSelected(
      request.id,
      freshHospital.name,
      selected.score,
      selected.travelTime!,
      freshHospital.bedsAvailable
    );
    this.decisionLog.logBedReserved(request.id, freshHospital.name);
    if (request.medicineRequired) {
      this.decisionLog.logMedicineReserved(
        request.id,
        freshHospital.name,
        request.medicineRequired,
        request.medicineQty!
      );
    }

   
    const ambulance = this.findNearestAmbulance(request.originNode);
    if (!ambulance) {
      
      this.hospitalRegistry.release(
        freshHospital.id,
        request.medicineRequired,
        request.medicineQty
      );
      this.decisionLog.logReservationReleased(request.id, freshHospital.name);
      return {
        request,
        selectedHospital: freshHospital,
        evaluated: filtered,
        scored,
        success: false,
        reason: 'No available ambulance',
      };
    }

    this.ambulanceRegistry.assign(ambulance.id, request.id);
    const routeToPatient = astar(this.graph, ambulance.nodeId, request.originNode);
    const etaToPatient = routeToPatient.feasible ? routeToPatient.totalCost : 10;

    this.decisionLog.logAmbulanceAssigned(request.id, ambulance.id, etaToPatient);

   
    const route = astar(this.graph, request.originNode, freshHospital.nodeId);

    if (!route.feasible) {
      this.hospitalRegistry.release(freshHospital.id, request.medicineRequired, request.medicineQty);
      this.ambulanceRegistry.release(ambulance.id);
      return {
        request,
        selectedHospital: freshHospital,
        evaluated: filtered,
        scored,
        success: false,
        reason: 'Route to hospital became infeasible after reservation',
      };
    }

    this.decisionLog.logRouteComputed(
      request.id,
      route.path.length,
      route.totalCost,
      route.visitedNodes,
      route.executionTimeMs
    );

    // Update request
    const updatedRequest: PatientRequest = {
      ...request,
      status: 'ASSIGNED',
      assignedHospitalId: freshHospital.id,
      assignedAmbulanceId: ambulance.id,
      route: route.path,
      routeCost: route.totalCost,
    };

    const result: DispatchResult = {
      request: updatedRequest,
      selectedHospital: freshHospital,
      evaluated: filtered,
      scored,
      ambulance: this.ambulanceRegistry.getById(ambulance.id),
      route,
      success: true,
    };

    this.decisionLog.logDispatched(request.id, freshHospital.name, ambulance.id);

    return result;
  }

  private findNearestAmbulance(originNodeId: string) {
    const available = this.ambulanceRegistry.getAvailable();
    if (available.length === 0) return null;

    let best: typeof available[0] | null = null;
    let bestCost = Infinity;

    for (const amb of available) {
      const route = astar(this.graph, amb.nodeId, originNodeId);
      if (route.feasible && route.totalCost < bestCost) {
        bestCost = route.totalCost;
        best = amb;
      }
    }

   
    return best || available[0];
  }


  handleConditionChange(event: { type: string; hospitalId?: string; edgeId?: string }): void {
    const inFlight = Array.from(this.requests.values()).filter(
      (r) => r.status === 'ASSIGNED' || r.status === 'EN_ROUTE' || r.status === 'REROUTING'
    );

    for (const req of inFlight) {
      if (!req.assignedHospitalId) continue;

     
      let affected = false;
      let reason = '';

      if (event.hospitalId && req.assignedHospitalId === event.hospitalId) {
        affected = true;
        reason = `Hospital ${event.hospitalId} status changed`;
      }

      if (event.edgeId) {
        
        if (req.route) {
          for (let i = 0; i < req.route.length - 1; i++) {
            const eId = `${req.route[i]}->${req.route[i + 1]}`;
            const rev = `${req.route[i + 1]}->${req.route[i]}`;
            if (eId === event.edgeId || rev === event.edgeId) {
              affected = true;
              reason = `Road ${event.edgeId} closed on active route`;
              break;
            }
          }
        }
       
        if (!affected && req.assignedHospitalId) {
          const hosp = this.hospitalRegistry.getById(req.assignedHospitalId);
          if (hosp) {
            const route = astar(this.graph, req.originNode, hosp.nodeId);
            if (!route.feasible) {
              affected = true;
              reason = `Hospital ${hosp.name} no longer reachable`;
            }
          }
        }
      }

   
      if (req.assignedHospitalId) {
        const hosp = this.hospitalRegistry.getById(req.assignedHospitalId);
        if (hosp) {
          if (!hosp.specialists.includes(req.specialtyRequired)) {
            affected = true;
            reason = `Specialist ${req.specialtyRequired} off-duty @ ${hosp.name}`;
          } else if (hosp.bedsAvailable < 0 && req.status !== 'ASSIGNED') {
           
            if (hosp.status !== 'operational') {
              affected = true;
              reason = `Hospital ${hosp.name} marked ${hosp.status}`;
            }
          } else if (
            req.medicineRequired &&
            req.medicineQty &&
            (!hosp.medicines[req.medicineRequired] ||
              hosp.medicines[req.medicineRequired].available < 0)
          ) {
            // Medicine check
            const med = hosp.medicines[req.medicineRequired];
            if (!med || med.available + med.reserved < req.medicineQty) {
              affected = true;
              reason = `Medicine ${req.medicineRequired} depleted @ ${hosp.name}`;
            }
          }
        }
      }

      if (affected) {
        this.rerouteRequest(req, reason);
      }
    }

   
    this.processQueue();
  }

  private rerouteRequest(request: PatientRequest, reason: string): void {
    const oldHospitalId = request.assignedHospitalId!;
    const oldHospital = this.hospitalRegistry.getById(oldHospitalId);
    const oldHospitalName = oldHospital?.name || oldHospitalId;

    this.decisionLog.logRerouteTriggered(request.id, reason, oldHospitalName);

   
    if (oldHospital) {
      this.hospitalRegistry.release(oldHospitalId, request.medicineRequired, request.medicineQty);
      this.decisionLog.logReservationReleased(request.id, oldHospitalName);
    }

  
    const ambulanceId = request.assignedAmbulanceId;
    if (ambulanceId) {
     
    }

  
    const reroutingReq: PatientRequest = {
      ...request,
      status: 'REROUTING',
    };
    this.requests.set(reroutingReq.id, reroutingReq);
    this.emit({ type: 'request_rerouting', request: reroutingReq, timestamp: Date.now() });

    // Re-run filter+score+reserve for this request only (full pipeline)
    const hospitals = this.hospitalRegistry.getAll().filter((h) => h.id !== oldHospitalId || true); // include all, filter will handle
    const filtered = filterFacilities(reroutingReq, hospitals, this.graph);

    const feasibleCount = filtered.filter((f) => f.passed).length;
    this.decisionLog.logReFilter(request.id, feasibleCount);

    for (const f of filtered) {
      if (!f.passed) {
        this.decisionLog.logHospitalRejected(request.id, f.hospital.name, f.failedConstraint!);
      }
    }

    const scored = scoreFacilities(filtered, this.weights);

    if (scored.length === 0) {
      reroutingReq.status = 'QUEUED';
      this.requests.set(reroutingReq.id, reroutingReq);
      this.queue.enqueue(reroutingReq);
      this.emit({ type: 'request_failed', request: reroutingReq, timestamp: Date.now() });
      return;
    }

    // Try reserve
    let selected: (typeof scored)[0] | null = null;
    for (const cand of scored) {
      const ok = this.hospitalRegistry.reserve(
        cand.hospital.id,
        reroutingReq.medicineRequired,
        reroutingReq.medicineQty
      );
      if (ok) {
        selected = cand;
        break;
      }
    }

    if (!selected) {
      reroutingReq.status = 'QUEUED';
      this.requests.set(reroutingReq.id, reroutingReq);
      this.queue.enqueue(reroutingReq);
      return;
    }

    const freshHospital = this.hospitalRegistry.getById(selected.hospital.id)!;
    this.decisionLog.logReSelected(request.id, freshHospital.name, selected.score);
    this.decisionLog.logBedReserved(request.id, freshHospital.name);

    const newRoute = astar(this.graph, reroutingReq.originNode, freshHospital.nodeId);
    this.decisionLog.logReRouted(request.id, freshHospital.name, newRoute.totalCost);

    const updated: PatientRequest = {
      ...reroutingReq,
      status: 'EN_ROUTE',
      assignedHospitalId: freshHospital.id,
      route: newRoute.path,
      routeCost: newRoute.totalCost,
    };

    this.requests.set(updated.id, updated);

    const result: DispatchResult = {
      request: updated,
      selectedHospital: freshHospital,
      evaluated: filtered,
      scored,
      ambulance: ambulanceId ? this.ambulanceRegistry.getById(ambulanceId) : undefined,
      route: newRoute,
      success: true,
    };

    this.dispatchResults.set(updated.id, result);
    this.emit({ type: 'request_en_route', request: updated, result, timestamp: Date.now() });
  }

  compareWithNaive(request: PatientRequest): ComparisonResult {
    const hospitals = this.hospitalRegistry.getAll();
    const naive = naiveNearestHospitalAssign(request, hospitals, this.graph);
    const optimized = this.dispatchForRequest({ ...request, id: `${request.id}-opt-${Date.now()}` });
    if (optimized.success && optimized.selectedHospital) {
      this.hospitalRegistry.release(
        optimized.selectedHospital.id,
        request.medicineRequired,
        request.medicineQty
      );
      if (optimized.ambulance) {
        this.ambulanceRegistry.release(optimized.ambulance.id);
      }
    }

    return {
      naive,
      optimized,
    };
  }

  getRequests(): PatientRequest[] {
    return Array.from(this.requests.values());
  }

  getRequestById(id: string): PatientRequest | undefined {
    return this.requests.get(id);
  }

  getDispatchResult(requestId: string): DispatchResult | undefined {
    return this.dispatchResults.get(requestId);
  }

  completeRequest(requestId: string): void {
    const req = this.requests.get(requestId);
    if (!req) return;
    req.status = 'COMPLETED';
    this.requests.set(requestId, req);

    if (req.assignedHospitalId) {
      this.hospitalRegistry.consume(req.assignedHospitalId, req.medicineRequired, req.medicineQty);
    }
    if (req.assignedAmbulanceId) {
      this.ambulanceRegistry.release(req.assignedAmbulanceId);
    }

    const hosp = req.assignedHospitalId ? this.hospitalRegistry.getById(req.assignedHospitalId) : null;
    if (hosp) this.decisionLog.logArrived(requestId, hosp.name);

    this.dispatchResults.delete(requestId);
    this.emit({ type: 'request_completed', request: req, timestamp: Date.now() });

    this.processQueue();
  }

  failRequest(requestId: string, reason: string): void {
    const req = this.requests.get(requestId);
    if (!req) return;
    if (req.assignedHospitalId) {
      this.hospitalRegistry.release(req.assignedHospitalId, req.medicineRequired, req.medicineQty);
    }
    if (req.assignedAmbulanceId) {
      this.ambulanceRegistry.release(req.assignedAmbulanceId);
    }
    this.requests.delete(requestId);
    this.dispatchResults.delete(requestId);
    this.emit({ type: 'request_failed', request: req, timestamp: Date.now() });
  }

  reset(): void {
    this.requests.clear();
    this.dispatchResults.clear();
    this.queue.clear();
  }

  getQueue(): PatientRequest[] {
    return this.queue.toSortedArray();
  }

  getGraph(): Graph {
    return this.graph;
  }

  getHospitalRegistry(): HospitalRegistry {
    return this.hospitalRegistry;
  }

  getAmbulanceRegistry(): AmbulanceRegistry {
    return this.ambulanceRegistry;
  }

  getDecisionLog(): DecisionLog {
    return this.decisionLog;
  }
}


