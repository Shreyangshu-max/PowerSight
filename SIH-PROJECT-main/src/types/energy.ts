export type MachineStatus = 'active' | 'idle' | 'flagged' | 'offline';

export type MachineType = 
  | 'CNC Machine' 
  | 'Hydraulic Press' 
  | 'Air Compressor' 
  | 'Injection Molding' 
  | 'Conveyor System' 
  | 'Stamping Mill' 
  | 'Industrial Oven'
  | 'HVAC Chiller';

export type MachineZone = 
  | 'Shop Floor A' 
  | 'Shop Floor B' 
  | 'Assembly Line 1' 
  | 'Heavy Machining' 
  | 'Packaging Bay';

export interface MaintenanceRecord {
  id: string;
  date: string;
  type: 'Preventive' | 'Corrective' | 'Predictive' | 'Emergency';
  description: string;
  technician: string;
  partsReplaced?: string[];
  durationHours: number;
  cost: number;
  status: 'Completed' | 'In Progress' | 'Scheduled';
}

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  zone: MachineZone;
  ratedPowerKW: number;
  status: MachineStatus;
  currentKW: number;
  baselineKW: number;
  temperatureC: number;
  powerFactor: number;
  voltageV: number;
  currentAmps: number;
  efficiencyScore: number; // 0 - 100
  lastUpdated: string;
  sparkline: number[];
  maintenanceHistory: MaintenanceRecord[];
  nextMaintenanceDate: string;
  installDate: string;
  warrantyExpiry: string;
}

export interface TelemetryReading {
  timestamp: string; // HH:mm:ss.SSS or HH:mm:ss
  machineId: string;
  powerKW: number;
  baselineKW: number;
  currentAmps: number;
  voltageV: number;
  powerFactor: number;
  isStale?: boolean; // Surfaces connectivity gaps (NFR 9.2)
  isTurbo?: boolean;
  isSpike?: boolean;
}

export type AnomalyType = 
  | 'INRUSH_CURRENT' 
  | 'BEARING_DRAG' 
  | 'MOTOR_OVERLOAD' 
  | 'SENSOR_FAULT'
  | 'BREACH_SPIKE'
  | 'DRAG_SPIKE'
  | 'JUMP_SPIKE'
  | 'INRUSH_SUSTAINED'
  // 7 MSME AI Diagnostic Signatures
  | 'SIG_MECHANICAL_FRICTION_DRIFT'
  | 'SIG_CYCLIC_INTERFERENCE_PULSE'
  | 'SIG_STRUCTURAL_SHEAR_JUMP'
  | 'SIG_IDLE_RUN_OFFSET'
  | 'SIG_RESONANT_MICRO_JITTER'
  | 'SIG_THERMAL_FRICTION_DECAYING_TAIL'
  | 'SIG_DECOUPLED_FREEWHEEEL_STEP_DOWN';

export type AnomalySeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface AnomalyEvent {
  id: string;
  machineId: string;
  machineName: string;
  zone: MachineZone;
  timestamp: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  peakKW: number;
  baselineKW: number;
  excessKW: number;
  excessCostINR: number; // Live calculation based on peak kW & tariff
  confidenceScore: number; // 0 - 100%
  rootCauseDescription: string;
  title?: string;
  description?: string;
  recommendedAction: string;
  slaDeadlineMs: number; // SLA countdown target timestamp
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED';
  classification?: 'INTENDED' | 'UNINTENDED';
  operatorComment?: string;
  operatorName?: string;
  responseTimestamp?: string;
}

export interface OperatorResponse {
  id: string;
  anomalyId: string;
  machineId: string;
  machineName: string;
  operatorName: string;
  operatorRole: string;
  classification: 'INTENDED' | 'UNINTENDED';
  comment: string;
  timestamp: string;
}

export interface ControlAction {
  id: string;
  machineId: string;
  machineName: string;
  action: 'REMOTE_KILL_SWITCH' | 'POWER_RESTORE';
  performedBy: string;
  role: string;
  timestamp: string;
  confirmationMethod: 'TYPED_MACHINE_NAME';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  machineLoadAtActionKW: number;
  reason: string;
}

export interface BillingProfile {
  monthlyBudgetINR: number;
  currentSpendINR: number;
  projectedSpendINR: number;
  tariffPerKWhINR: number;
  activeMachinesCount: number;
  totalMachinesCount: number;
  billingCycleDaysRemaining: number;
}
