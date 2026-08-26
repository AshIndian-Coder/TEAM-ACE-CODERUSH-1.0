/**
 * DecisionLog - Append-only, typed log entries generated FROM REAL ENGINE OUTPUT ONLY
 * Never hardcode a log string anywhere
 */

export type LogEventType =
  | 'REQUEST_RECEIVED'
  | 'FILTER_START'
  | 'HOSPITAL_REJECTED'
  | 'HOSPITAL_SELECTED'
  | 'BED_RESERVED'
  | 'MEDICINE_RESERVED'
  | 'AMBULANCE_ASSIGNED'
  | 'ROUTE_COMPUTED'
  | 'DISPATCHED'
  | 'REROUTE_TRIGGERED'
  | 'RESERVATION_RELEASED'
  | 'RE_FILTER'
  | 'RE_SELECTED'
  | 'RE_ROUTED'
  | 'ARRIVED'
  | 'BENCHMARK_RUN'
  | 'EDGE_BLOCKED'
  | 'EDGE_REOPENED'
  | 'SIMULATION_EVENT';

export interface DecisionLogEntry {
  id: string;
  timestamp: number;
  requestId: string;
  type: LogEventType;
  message: string;
  data?: Record<string, any>;
  // For UI rendering
  level: 'info' | 'warn' | 'error' | 'success';
}

export class DecisionLog {
  private entries: DecisionLogEntry[] = [];
  private listeners: Set<(entry: DecisionLogEntry) => void> = new Set();
  private maxEntries = 500;

  append(entry: Omit<DecisionLogEntry, 'id' | 'timestamp'> & { timestamp?: number }): DecisionLogEntry {
    const full: DecisionLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: entry.timestamp ?? Date.now(),
      ...entry,
    };
    this.entries.push(full);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    for (const l of this.listeners) l(full);
    return full;
  }

  // Templated log generators from real engine output - never hardcoded elsewhere
  logRequestReceived(requestId: string, urgency: string, specialty: string, origin: string): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'REQUEST_RECEIVED',
      level: 'info',
      message: `REQ ${requestId.slice(0, 8)} | ${urgency} | ${specialty} @ ${origin} - entering triage queue`,
      data: { urgency, specialty, origin },
    });
  }

  logFilterStart(requestId: string, totalHospitals: number): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'FILTER_START',
      level: 'info',
      message: `Evaluating ${totalHospitals} hospitals against hard constraints [specialist → bed → medicine → reachability]`,
      data: { totalHospitals },
    });
  }

  logHospitalRejected(
    requestId: string,
    hospitalName: string,
    constraint: string,
    distance?: number,
    travelTime?: number
  ): DecisionLogEntry {
    const distStr = distance !== undefined ? ` (${distance.toFixed(1)}km)` : '';
    const timeStr = travelTime !== undefined ? ` travel=${travelTime.toFixed(1)}m` : '';
    return this.append({
      requestId,
      type: 'HOSPITAL_REJECTED',
      level: 'warn',
      message: `REJECT ${hospitalName}${distStr} - failed: ${constraint}${timeStr}`,
      data: { hospitalName, constraint, distance, travelTime },
    });
  }

  logHospitalSelected(
    requestId: string,
    hospitalName: string,
    score: number,
    travelTime: number,
    bedsAvailable: number
  ): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'HOSPITAL_SELECTED',
      level: 'success',
      message: `SELECT ${hospitalName} | cost=${score.toFixed(3)} | travel=${travelTime.toFixed(1)}m | beds=${bedsAvailable} → reserving`,
      data: { hospitalName, score, travelTime, bedsAvailable },
    });
  }

  logBedReserved(requestId: string, hospitalName: string): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'BED_RESERVED',
      level: 'success',
      message: `RESERVE bed @ ${hospitalName} for ${requestId.slice(0, 8)} (available → reserved)`,
      data: { hospitalName },
    });
  }

  logMedicineReserved(requestId: string, hospitalName: string, medicine: string, qty: number): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'MEDICINE_RESERVED',
      level: 'success',
      message: `RESERVE medicine ${medicine} x${qty} @ ${hospitalName}`,
      data: { hospitalName, medicine, qty },
    });
  }

  logAmbulanceAssigned(requestId: string, ambulanceId: string, eta: number): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'AMBULANCE_ASSIGNED',
      level: 'info',
      message: `AMBULANCE ${ambulanceId} assigned | ETA ${eta.toFixed(1)}m to patient`,
      data: { ambulanceId, eta },
    });
  }

  logRouteComputed(requestId: string, pathLength: number, totalCost: number, visited: number, ms: number): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'ROUTE_COMPUTED',
      level: 'info',
      message: `ROUTE A* computed: ${pathLength} hops | cost=${totalCost.toFixed(1)}m | visited=${visited} nodes | ${ms.toFixed(2)}ms`,
      data: { pathLength, totalCost, visited, ms },
    });
  }

  logDispatched(requestId: string, hospitalName: string, ambulanceId: string): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'DISPATCHED',
      level: 'success',
      message: `DISPATCHED ${requestId.slice(0, 8)} → ${hospitalName} via ${ambulanceId} | EN_ROUTE`,
      data: { hospitalName, ambulanceId },
    });
  }

  logRerouteTriggered(requestId: string, reason: string, oldHospital: string): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'REROUTE_TRIGGERED',
      level: 'error',
      message: `REROUTE TRIGGERED for ${requestId.slice(0, 8)} | ${oldHospital} infeasible: ${reason} | releasing reservation`,
      data: { reason, oldHospital },
    });
  }

  logReservationReleased(requestId: string, hospitalName: string): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'RESERVATION_RELEASED',
      level: 'warn',
      message: `RELEASE reservation @ ${hospitalName} for ${requestId.slice(0, 8)} (reserved → available)`,
      data: { hospitalName },
    });
  }

  logReFilter(requestId: string, remaining: number): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'RE_FILTER',
      level: 'info',
      message: `RE-FILTER after invalidation: ${remaining} candidates remain`,
      data: { remaining },
    });
  }

  logReSelected(requestId: string, newHospital: string, score: number): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'RE_SELECTED',
      level: 'success',
      message: `RE-SELECT ${newHospital} | new cost=${score.toFixed(3)} | reserving`,
      data: { newHospital, score },
    });
  }

  logReRouted(requestId: string, newHospital: string, cost: number): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'RE_ROUTED',
      level: 'success',
      message: `RE-ROUTED ${requestId.slice(0, 8)} → ${newHospital} | new route cost=${cost.toFixed(1)}m`,
      data: { newHospital, cost },
    });
  }

  logArrived(requestId: string, hospitalName: string): DecisionLogEntry {
    return this.append({
      requestId,
      type: 'ARRIVED',
      level: 'success',
      message: `ARRIVED ${requestId.slice(0, 8)} @ ${hospitalName} | reserved → consumed | COMPLETED`,
      data: { hospitalName },
    });
  }

  logEdgeBlocked(edgeId: string, from: string, to: string): DecisionLogEntry {
    return this.append({
      requestId: 'SYSTEM',
      type: 'EDGE_BLOCKED',
      level: 'warn',
      message: `ROAD CLOSED ${from} ↔ ${to} (${edgeId}) | A* will structurally skip`,
      data: { edgeId, from, to },
    });
  }

  logEdgeReopened(edgeId: string, from: string, to: string): DecisionLogEntry {
    return this.append({
      requestId: 'SYSTEM',
      type: 'EDGE_REOPENED',
      level: 'info',
      message: `ROAD REOPENED ${from} ↔ ${to} (${edgeId})`,
      data: { edgeId, from, to },
    });
  }

  logSimulationEvent(msg: string, data?: any): DecisionLogEntry {
    return this.append({
      requestId: 'SYSTEM',
      type: 'SIMULATION_EVENT',
      level: 'info',
      message: msg,
      data,
    });
  }

  logBenchmarkRun(size: number, aStarAvg: number, dijkstraAvg: number, match: boolean): DecisionLogEntry {
    return this.append({
      requestId: 'BENCHMARK',
      type: 'BENCHMARK_RUN',
      level: match ? 'success' : 'error',
      message: `BENCHMARK ${size} nodes | A* avg=${aStarAvg.toFixed(2)}ms | Dijkstra avg=${dijkstraAvg.toFixed(2)}ms | costs match=${match}`,
      data: { size, aStarAvg, dijkstraAvg, match },
    });
  }

  getAll(): DecisionLogEntry[] {
    return [...this.entries];
  }

  getByRequestId(requestId: string): DecisionLogEntry[] {
    return this.entries.filter((e) => e.requestId === requestId);
  }

  clear(): void {
    this.entries = [];
  }

  subscribe(fn: (entry: DecisionLogEntry) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
