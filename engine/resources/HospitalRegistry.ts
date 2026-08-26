/**
 * HospitalRegistry - CRUD + atomic reserve/release/consume
 * Resource reservation model: available -> reserved -> consumed/occupied
 */

import type { Hospital } from '../domain/types';

export class HospitalRegistry {
  private hospitals: Map<string, Hospital> = new Map();

  constructor(initial: Hospital[] = []) {
    for (const h of initial) this.hospitals.set(h.id, this.cloneHospital(h));
  }

  private cloneHospital(h: Hospital): Hospital {
    return {
      ...h,
      specialists: [...h.specialists],
      medicines: Object.fromEntries(
        Object.entries(h.medicines).map(([k, v]) => [k, { ...v }])
      ),
    };
  }

  getAll(): Hospital[] {
    return Array.from(this.hospitals.values()).map((h) => this.cloneHospital(h));
  }

  getById(id: string): Hospital | undefined {
    const h = this.hospitals.get(id);
    return h ? this.cloneHospital(h) : undefined;
  }

  getByNodeId(nodeId: string): Hospital | undefined {
    for (const h of this.hospitals.values()) {
      if (h.nodeId === nodeId) return this.cloneHospital(h);
    }
    return undefined;
  }

  add(hospital: Hospital): void {
    this.hospitals.set(hospital.id, this.cloneHospital(hospital));
  }

  update(id: string, patch: Partial<Hospital>): Hospital | undefined {
    const existing = this.hospitals.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    if (patch.specialists) updated.specialists = [...patch.specialists];
    if (patch.medicines) {
      updated.medicines = Object.fromEntries(
        Object.entries(patch.medicines).map(([k, v]) => [k, { ...v }])
      );
    }
    this.hospitals.set(id, updated);
    return this.cloneHospital(updated);
  }

  // ATOMIC reserve - moves 1 unit from available to reserved
  // Returns true if succeeded, false if insufficient
  reserveBed(hospitalId: string): boolean {
    const h = this.hospitals.get(hospitalId);
    if (!h) return false;
    if (h.bedsAvailable <= 0) return false;
    // Atomic operation
    h.bedsAvailable -= 1;
    h.bedsReserved += 1;
    return true;
  }

  reserveMedicine(hospitalId: string, medicine: string, qty: number = 1): boolean {
    const h = this.hospitals.get(hospitalId);
    if (!h) return false;
    const med = h.medicines[medicine];
    if (!med) return false;
    if (med.available < qty) return false;
    med.available -= qty;
    med.reserved += qty;
    return true;
  }

  // Atomic reserve both bed + medicine if required
  reserve(hospitalId: string, medicine?: string, qty?: number): boolean {
    const h = this.hospitals.get(hospitalId);
    if (!h) return false;

    // Check feasibility first (no partial reservation)
    if (h.bedsAvailable <= 0) return false;
    if (medicine && qty) {
      const med = h.medicines[medicine];
      if (!med || med.available < qty) return false;
    }

    // Now reserve atomically
    h.bedsAvailable -= 1;
    h.bedsReserved += 1;
    if (medicine && qty) {
      const med = h.medicines[medicine]!;
      med.available -= qty;
      med.reserved += qty;
    }
    return true;
  }

  // Release reserved back to available (on reroute/cancel)
  release(hospitalId: string, medicine?: string, qty?: number): boolean {
    const h = this.hospitals.get(hospitalId);
    if (!h) return false;
    if (h.bedsReserved > 0) {
      h.bedsReserved -= 1;
      h.bedsAvailable += 1;
    }
    if (medicine && qty) {
      const med = h.medicines[medicine];
      if (med && med.reserved >= qty) {
        med.reserved -= qty;
        med.available += qty;
      }
    }
    return true;
  }

  // Consume reserved -> occupied/consumed (on arrival)
  consume(hospitalId: string, medicine?: string, qty?: number): boolean {
    const h = this.hospitals.get(hospitalId);
    if (!h) return false;
    if (h.bedsReserved > 0) {
      h.bedsReserved -= 1;
      // bedsTotal stays same, available doesn't increase, reserved decreases -> occupied implicitly
    }
    if (medicine && qty) {
      const med = h.medicines[medicine];
      if (med && med.reserved >= qty) {
        med.reserved -= qty;
        med.total -= qty; // consumed
      }
    }
    return true;
  }

  // Simulation helpers
  setSpecialists(hospitalId: string, specialists: string[]): void {
    const h = this.hospitals.get(hospitalId);
    if (h) h.specialists = [...specialists];
  }

  fillBeds(hospitalId: string): void {
    const h = this.hospitals.get(hospitalId);
    if (h) {
      h.bedsAvailable = 0;
      h.bedsReserved = h.bedsTotal;
    }
  }

  freeBeds(hospitalId: string, count: number = 1): void {
    const h = this.hospitals.get(hospitalId);
    if (h) {
      const free = Math.min(count, h.bedsTotal - h.bedsAvailable - h.bedsReserved);
      h.bedsAvailable += free;
    }
  }

  depleteMedicine(hospitalId: string, medicine: string): void {
    const h = this.hospitals.get(hospitalId);
    if (h?.medicines[medicine]) {
      h.medicines[medicine].available = 0;
      h.medicines[medicine].reserved = 0;
    }
  }

  restockMedicine(hospitalId: string, medicine: string, qty: number): void {
    const h = this.hospitals.get(hospitalId);
    if (h?.medicines[medicine]) {
      h.medicines[medicine].available += qty;
      h.medicines[medicine].total += qty;
    }
  }

  setStatus(hospitalId: string, status: Hospital['status']): void {
    const h = this.hospitals.get(hospitalId);
    if (h) h.status = status;
  }

  reset(initial: Hospital[]): void {
    this.hospitals.clear();
    for (const h of initial) this.hospitals.set(h.id, this.cloneHospital(h));
  }
}
