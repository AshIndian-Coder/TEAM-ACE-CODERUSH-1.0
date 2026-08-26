/**
 * AmbulanceRegistry - State machine AVAILABLE -> ASSIGNED -> EN_ROUTE -> ARRIVED
 */

import type { Ambulance, AmbulanceStatus } from '../domain/types';

export class AmbulanceRegistry {
  private ambulances: Map<string, Ambulance> = new Map();

  constructor(initial: Ambulance[] = []) {
    for (const a of initial) this.ambulances.set(a.id, { ...a });
  }

  getAll(): Ambulance[] {
    return Array.from(this.ambulances.values()).map((a) => ({ ...a }));
  }

  getById(id: string): Ambulance | undefined {
    const a = this.ambulances.get(id);
    return a ? { ...a } : undefined;
  }

  getAvailable(): Ambulance[] {
    return this.getAll().filter((a) => a.status === 'AVAILABLE');
  }

  getByNodeId(nodeId: string): Ambulance[] {
    return this.getAll().filter((a) => a.nodeId === nodeId);
  }

  add(ambulance: Ambulance): void {
    this.ambulances.set(ambulance.id, { ...ambulance });
  }

  // State machine transitions with validation
  private canTransition(from: AmbulanceStatus, to: AmbulanceStatus): boolean {
    const allowed: Record<AmbulanceStatus, AmbulanceStatus[]> = {
      AVAILABLE: ['ASSIGNED'],
      ASSIGNED: ['EN_ROUTE', 'AVAILABLE'], // can be released back
      EN_ROUTE: ['ARRIVED', 'AVAILABLE'], // can be rerouted/released
      ARRIVED: ['AVAILABLE'],
    };
    return allowed[from]?.includes(to) ?? false;
  }

  updateStatus(id: string, newStatus: AmbulanceStatus): boolean {
    const a = this.ambulances.get(id);
    if (!a) return false;
    if (!this.canTransition(a.status, newStatus)) {
      // Allow force reset to AVAILABLE for simulation
      if (newStatus !== 'AVAILABLE') return false;
    }
    a.status = newStatus;
    if (newStatus === 'AVAILABLE') a.currentRequestId = null;
    return true;
  }

  assign(id: string, requestId: string): boolean {
    const a = this.ambulances.get(id);
    if (!a) return false;
    if (a.status !== 'AVAILABLE') return false;
    a.status = 'ASSIGNED';
    a.currentRequestId = requestId;
    return true;
  }

  setEnRoute(id: string): boolean {
    return this.updateStatus(id, 'EN_ROUTE');
  }

  setArrived(id: string): boolean {
    return this.updateStatus(id, 'ARRIVED');
  }

  release(id: string): boolean {
    const a = this.ambulances.get(id);
    if (!a) return false;
    a.status = 'AVAILABLE';
    a.currentRequestId = null;
    return true;
  }

  moveToNode(id: string, nodeId: string): void {
    const a = this.ambulances.get(id);
    if (a) a.nodeId = nodeId;
  }

  // Simulation helpers
  occupyAll(): void {
    for (const a of this.ambulances.values()) {
      if (a.status === 'AVAILABLE') {
        a.status = 'ASSIGNED';
        a.currentRequestId = `sim-occupied-${a.id}`;
      }
    }
  }

  freeAll(): void {
    for (const a of this.ambulances.values()) {
      a.status = 'AVAILABLE';
      a.currentRequestId = null;
    }
  }

  reset(initial: Ambulance[]): void {
    this.ambulances.clear();
    for (const a of initial) this.ambulances.set(a.id, { ...a });
  }
}
