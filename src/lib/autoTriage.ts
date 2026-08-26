/**
 * Automatic Critical Level Setter - Clinical Decision Support
 * Inspired by real triage systems (ESI, Manchester Triage)
 * Auto-assigns urgency based on emergency type, vitals, age, symptoms
 */

import type { Urgency } from '../../engine/domain/types';

export interface Vitals {
  age: number;
  heartRate?: number; // bpm
  bloodPressureSystolic?: number; // mmHg
  bloodPressureDiastolic?: number;
  oxygenSaturation?: number; // %
  temperature?: number; // C
  respiratoryRate?: number; // per min
  consciousness: 'alert' | 'verbal' | 'pain' | 'unresponsive'; // AVPU
  painLevel?: number; // 0-10
}

export interface TriageInput {
  emergencyType: string;
  specialtyRequired: string;
  vitals: Vitals;
  symptoms: string[];
  medicalHistory?: string[];
}

export interface TriageResult {
  urgency: Urgency;
  score: number; // 0-100, higher = more critical
  reasons: string[];
  recommendedActions: string[];
  estimatedResponseTime: string; // e.g., "Immediate (<5 min)"
}

const EMERGENCY_BASE_SCORES: Record<string, number> = {
  'Cardiac Emergency': 85,
  'Neuro Emergency': 80,
  'Respiratory Distress': 82,
  'Road Accident': 75,
  'Maternal Emergency': 78,
  'Surgical Emergency': 65,
  'Fracture': 45,
  'Pediatric Emergency': 70,
};

export function autoTriage(input: TriageInput): TriageResult {
  const reasons: string[] = [];
  let score = EMERGENCY_BASE_SCORES[input.emergencyType] || 50;

  // Age factor
  if (input.vitals.age < 2 || input.vitals.age > 75) {
    score += 10;
    reasons.push(`Age ${input.vitals.age} is high-risk group`);
  } else if (input.vitals.age > 60) {
    score += 5;
    reasons.push(`Age ${input.vitals.age} increases risk`);
  }

  // Vitals scoring (based on NEWS2 + clinical rules)
  if (input.vitals.heartRate) {
    if (input.vitals.heartRate > 130 || input.vitals.heartRate < 40) {
      score += 15;
      reasons.push(`Critical heart rate: ${input.vitals.heartRate} bpm`);
    } else if (input.vitals.heartRate > 110 || input.vitals.heartRate < 50) {
      score += 8;
      reasons.push(`Abnormal heart rate: ${input.vitals.heartRate} bpm`);
    }
  }

  if (input.vitals.oxygenSaturation) {
    if (input.vitals.oxygenSaturation < 90) {
      score += 20;
      reasons.push(`Severe hypoxia: SpO2 ${input.vitals.oxygenSaturation}%`);
    } else if (input.vitals.oxygenSaturation < 94) {
      score += 10;
      reasons.push(`Low oxygen: SpO2 ${input.vitals.oxygenSaturation}%`);
    }
  }

  if (input.vitals.bloodPressureSystolic) {
    if (input.vitals.bloodPressureSystolic > 180 || input.vitals.bloodPressureSystolic < 80) {
      score += 15;
      reasons.push(`Critical BP: ${input.vitals.bloodPressureSystolic}/${input.vitals.bloodPressureDiastolic} mmHg`);
    } else if (input.vitals.bloodPressureSystolic > 160 || input.vitals.bloodPressureSystolic < 90) {
      score += 7;
      reasons.push(`Abnormal BP: ${input.vitals.bloodPressureSystolic} mmHg systolic`);
    }
  }

  if (input.vitals.respiratoryRate) {
    if (input.vitals.respiratoryRate > 30 || input.vitals.respiratoryRate < 8) {
      score += 15;
      reasons.push(`Critical respiratory rate: ${input.vitals.respiratoryRate}/min`);
    } else if (input.vitals.respiratoryRate > 24) {
      score += 6;
      reasons.push(`Elevated respiratory rate: ${input.vitals.respiratoryRate}/min`);
    }
  }

  if (input.vitals.temperature) {
    if (input.vitals.temperature > 39.5 || input.vitals.temperature < 35) {
      score += 10;
      reasons.push(`Critical temperature: ${input.vitals.temperature}°C`);
    }
  }

  // Consciousness (AVPU)
  if (input.vitals.consciousness === 'unresponsive') {
    score += 25;
    reasons.push('Patient unresponsive (AVPU: U)');
  } else if (input.vitals.consciousness === 'pain') {
    score += 15;
    reasons.push('Responds only to pain (AVPU: P)');
  } else if (input.vitals.consciousness === 'verbal') {
    score += 8;
    reasons.push('Responds only to verbal (AVPU: V)');
  }

  if (input.vitals.painLevel && input.vitals.painLevel >= 8) {
    score += 8;
    reasons.push(`Severe pain: ${input.vitals.painLevel}/10`);
  }

  // Symptoms
  const criticalSymptoms = ['chest pain', 'difficulty breathing', 'unconscious', 'severe bleeding', 'stroke', 'seizure'];
  const highRiskSymptoms = ['high fever', 'vomiting blood', 'severe headache', 'abdominal pain'];

  for (const symptom of input.symptoms) {
    const lower = symptom.toLowerCase();
    if (criticalSymptoms.some(cs => lower.includes(cs))) {
      score += 12;
      reasons.push(`Critical symptom: ${symptom}`);
    } else if (highRiskSymptoms.some(hrs => lower.includes(hrs))) {
      score += 6;
      reasons.push(`High-risk symptom: ${symptom}`);
    }
  }

  // Medical history
  if (input.medicalHistory) {
    const criticalHistory = ['heart disease', 'stroke', 'diabetes', 'hypertension'];
    for (const hist of input.medicalHistory) {
      if (criticalHistory.some(ch => hist.toLowerCase().includes(ch))) {
        score += 3;
      }
    }
  }

  // Clamp score
  score = Math.min(100, Math.max(0, score));

  // Determine urgency based on score (ESI-like)
  let urgency: Urgency;
  let estimatedResponseTime: string;
  let recommendedActions: string[];

  if (score >= 85) {
    urgency = 'CRITICAL';
    estimatedResponseTime = 'Immediate (<3 min)';
    recommendedActions = [
      'Dispatch nearest ALS ambulance immediately',
      'Alert receiving hospital — prepare resuscitation bay',
      'Continuous vitals monitoring en-route',
      'Consider air ambulance if ground ETA >15 min',
    ];
  } else if (score >= 65) {
    urgency = 'HIGH';
    estimatedResponseTime = 'Very Urgent (<10 min)';
    recommendedActions = [
      'Dispatch ALS ambulance',
      'Pre-notify hospital specialty team',
      'Oxygen and IV access en-route',
    ];
  } else if (score >= 40) {
    urgency = 'MEDIUM';
    estimatedResponseTime = 'Urgent (<30 min)';
    recommendedActions = [
      'Dispatch BLS ambulance',
      'Monitor vitals every 15 min',
      'Transport to nearest capable facility',
    ];
  } else {
    urgency = 'LOW';
    estimatedResponseTime = 'Standard (<60 min)';
    recommendedActions = [
      'Schedule transport',
      'Outpatient follow-up if stable',
    ];
  }

  // Add base reason
  if (reasons.length === 0) {
    reasons.push(`${input.emergencyType} baseline risk: ${EMERGENCY_BASE_SCORES[input.emergencyType] || 50} points`);
  }

  return {
    urgency,
    score,
    reasons,
    recommendedActions,
    estimatedResponseTime,
  };
}

// Quick helper for existing emergency types
export function quickTriage(emergencyType: string, age: number = 35): TriageResult {
  return autoTriage({
    emergencyType,
    specialtyRequired: 'General',
    vitals: {
      age,
      consciousness: 'alert',
    },
    symptoms: [emergencyType],
  });
}
