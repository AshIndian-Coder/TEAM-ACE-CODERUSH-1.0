

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

   
    if (hospital.bedsAvailable <= 0) {
      results.push({
        hospital,
        passed: false,
        failedConstraint: 'bed',
      });
      continue;
    }

    
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

    
    const route = astar(graph, request.originNode, hospital.nodeId);
    if (!route.feasible) {
      results.push({
        hospital,
        passed: false,
        failedConstraint: 'reachability',
      });
      continue;
    }

   
    results.push({
      hospital,
      passed: true,
      travelTime: route.totalCost,
      route,
    });
  }

  return results;
}
