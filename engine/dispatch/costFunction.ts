

import type { FilterResult, ScoredHospital } from '../domain/types';

export interface CostWeights {
  alpha: number;
  beta: number;
}

export const DEFAULT_WEIGHTS: CostWeights = {
  alpha: 0.6,
  beta: 0.4,
};

export function scoreFacilities(
  filtered: FilterResult[],
  weights: CostWeights = DEFAULT_WEIGHTS
): ScoredHospital[] {
  const feasible = filtered.filter((f) => f.passed && f.travelTime !== undefined);

  if (feasible.length === 0) return [];

 
  const maxTravel = Math.max(...feasible.map((f) => f.travelTime!), 1);
 
  const maxWait = Math.max(
    ...feasible.map((f) => f.hospital.bedsReserved + f.hospital.bedsTotal - f.hospital.bedsAvailable),
    1
  );

  const scored: ScoredHospital[] = feasible.map((f) => {
    const travel = f.travelTime!;
    const wait = f.hospital.bedsReserved + (f.hospital.bedsTotal - f.hospital.bedsAvailable);

    const normalizedTravel = travel / maxTravel;
    const normalizedWait = wait / maxWait;

    const score = weights.alpha * normalizedTravel + weights.beta * normalizedWait;

    return {
      ...f,
      score,
      normalizedTravel,
      normalizedWait,
    };
  });

 
  scored.sort((a, b) => a.score - b.score);

  return scored;
}
