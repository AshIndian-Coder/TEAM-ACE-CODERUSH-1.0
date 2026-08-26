/**
 * facilityFilter - Hard-constraint filter, exact order, short-circuit
 * Order: (1) specialist available (2) bed available (3) medicine available (4) reachable
 * Excludes before scoring, never down-weights after
 */

import type { Hospital, PatientRequest, FilterResult } from '../domain/types';
import type { Graph } from '../graph/Graph';
import { astar } from '../graph/astar';

export function filterFacilities(
  request: PatientRequest,
  hospitals: Hospital[],
  graph: Graph
): FilterResult[] {
  const results: FilterResult[] = [];

  for (const hospital of hospitals) {
    // (1) Specialist available
    if (!hospital.specialists.includes(request.specialtyRequired)) {
      results.push({
        hospital,
        passed: false,
        failedConstraint: 'specialist',
      });
      continue;
    }

    // (2) Bed available (check available OR reserved? For filter, need available >0)
    // Note: if already reserved for this request, we should allow it, but for general filter we check availability
    if (hospital.bedsAvailable <= 0) {
      results.push({
        hospital,
        passed: false,
        failedConstraint: 'bed',
      });
      continue;
    }

    // (3) Medicine available if required
    if (request.medicineRequired && request.medicineQty) {
      const med = hospital.medicines[request.medicineRequired];
      if (!med || med.available < request.medicineQty) {
        results.push({
          hospital,
          passed: false,
          failedConstraint: 'medicine',
        });
        continue;
      }
    }

    // (4) Reachable - astar returns path, structurally skips closed edges
    const route = astar(graph, request.originNode, hospital.nodeId);
    if (!route.feasible) {
      results.push({
        hospital,
        passed: false,
        failedConstraint: 'reachability',
      });
      continue;
    }

    // Passed all
    results.push({
      hospital,
      passed: true,
      travelTime: route.totalCost,
      route,
    });
  }

  return results;
}
