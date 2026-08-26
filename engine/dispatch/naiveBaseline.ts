/**
 * naiveBaseline - Distance-only assignment ignoring specialty/bed/medicine
 * Used ONLY by comparison view to show what would have gone wrong
 */

import type { Hospital, PatientRequest } from '../domain/types';
import type { Graph } from '../graph/Graph';
import { astar } from '../graph/astar';

export interface NaiveResult {
  hospital: Hospital | null;
  distance: number;
  feasible: boolean;
  violatedConstraint?: string;
  reason: string;
  route?: { path: string[]; totalCost: number; feasible: boolean };
}

function euclideanDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111;
}

export function naiveNearestHospitalAssign(
  request: PatientRequest,
  hospitals: Hospital[],
  graph: Graph
): NaiveResult {
  if (hospitals.length === 0) {
    return {
      hospital: null,
      distance: Infinity,
      feasible: false,
      reason: 'No hospitals available',
    };
  }

  const originNode = graph.getNode(request.originNode);
  if (!originNode) {
    return {
      hospital: null,
      distance: Infinity,
      feasible: false,
      reason: `Origin node ${request.originNode} not found`,
    };
  }

  // Find nearest by straight-line distance only
  let nearest: Hospital | null = null;
  let minDist = Infinity;

  for (const h of hospitals) {
    const hNode = graph.getNode(h.nodeId);
    if (!hNode) continue;
    const dist = euclideanDistanceKm(originNode.lat, originNode.lng, hNode.lat, hNode.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = h;
    }
  }

  if (!nearest) {
    return {
      hospital: null,
      distance: Infinity,
      feasible: false,
      reason: 'No hospital nodes found in graph',
    };
  }

  // Now check what constraints it violates (for UI explanation)
  let violated: string | undefined;
  let reason: string;

  if (!nearest.specialists.includes(request.specialtyRequired)) {
    violated = 'specialist';
    reason = `Nearest hospital ${nearest.name} (${minDist.toFixed(1)}km) lacks required specialist: ${request.specialtyRequired}. Would have dispatched patient to a facility incapable of treating them.`;
  } else if (nearest.bedsAvailable <= 0) {
    violated = 'bed';
    reason = `Nearest hospital ${nearest.name} (${minDist.toFixed(1)}km) has no beds available (${nearest.bedsTotal} total, ${nearest.bedsAvailable} free). Patient would arrive with nowhere to be admitted.`;
  } else if (
    request.medicineRequired &&
    request.medicineQty &&
    (!nearest.medicines[request.medicineRequired] ||
      nearest.medicines[request.medicineRequired].available < request.medicineQty)
  ) {
    violated = 'medicine';
    reason = `Nearest hospital ${nearest.name} (${minDist.toFixed(1)}km) lacks required medicine: ${request.medicineRequired} x${request.medicineQty}. Treatment would be impossible on arrival.`;
  } else {
    // Check reachability
    const route = astar(graph, request.originNode, nearest.nodeId);
    if (!route.feasible) {
      violated = 'reachability';
      reason = `Nearest hospital ${nearest.name} (${minDist.toFixed(1)}km) is unreachable due to road closures. Naive system would have no fallback.`;
      return {
        hospital: nearest,
        distance: minDist,
        feasible: false,
        violatedConstraint: violated,
        reason,
        route,
      };
    }
    reason = `Nearest hospital ${nearest.name} (${minDist.toFixed(1)}km) happens to be feasible, but this is coincidental - naive system doesn't verify constraints.`;
    return {
      hospital: nearest,
      distance: minDist,
      feasible: true,
      reason,
      route,
    };
  }

  // Try to get route for distance display
  const route = astar(graph, request.originNode, nearest.nodeId);

  return {
    hospital: nearest,
    distance: minDist,
    feasible: false,
    violatedConstraint: violated,
    reason,
    route: route.feasible ? route : undefined,
  };
}
