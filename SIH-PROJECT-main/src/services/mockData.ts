import type { Machine, MachineType, MachineZone, AnomalyEvent, ControlAction, BillingProfile, MaintenanceRecord } from '../types/energy';

const MACHINE_TYPES: MachineType[] = [
  'CNC Machine',
  'Hydraulic Press',
  'Air Compressor',
  'Injection Molding',
  'Conveyor System',
  'Stamping Mill',
  'Industrial Oven',
  'HVAC Chiller'
];

const ZONES: MachineZone[] = [
  'Shop Floor A',
  'Shop Floor B',
  'Assembly Line 1',
  'Heavy Machining',
  'Packaging Bay'
];

const MAINTENANCE_TYPES: MaintenanceRecord['type'][] = ['Preventive', 'Corrective', 'Predictive', 'Emergency'];

const MAINTENANCE_DESCRIPTIONS: Record<MaintenanceRecord['type'], string[]> = {
  Preventive: [
    'Scheduled lubrication and bearing inspection',
    'Filter replacement and airflow calibration',
    'Belt tension adjustment and alignment check',
    'Coolant flush and refill cycle',
  ],
  Corrective: [
    'Motor winding repair after overload event',
    'Replaced faulty pressure sensor',
    'Fixed hydraulic leak in primary cylinder',
    'Repaired broken drive chain linkage',
  ],
  Predictive: [
    'Vibration analysis flagged bearing wear — preemptive swap',
    'Thermal imaging detected hotspot — insulation repaired',
    'Oil particle analysis triggered gearbox service',
    'Current signature analysis — capacitor bank replaced',
  ],
  Emergency: [
    'Emergency shutdown — catastrophic belt failure',
    'Electrical fault trip — contactor replaced',
    'Coolant system failure — emergency pump swap',
    'Overheating shutdown — fan motor replaced',
  ],
};

const TECHNICIANS = [
  'Ramesh Kumar',
  'Suresh Patel',
  'Anita Sharma',
  'Vikram Mehta',
  'Priya Singh',
  'Deepak Yadav',
];

const PARTS = [
  'Drive Belt', 'Ball Bearing SKF-6205', 'Contactor LC1-D25', 'Hydraulic Seal Kit',
  'Oil Filter Element', 'Coolant Pump', 'Capacitor Bank 50kVAR', 'Thermal Fuse 250V',
  'Motor Winding Set', 'Fan Motor 1HP', 'Pressure Sensor PT100', 'Drive Chain 10B',
];

function generateMaintenanceHistory(machineIndex: number): MaintenanceRecord[] {
  const records: MaintenanceRecord[] = [];
  const numRecords = 2 + (machineIndex % 3); // 2–4 records per machine
  const now = Date.now();

  for (let j = 0; j < numRecords; j++) {
    const daysAgo = 15 + j * 30 + Math.floor(Math.random() * 20);
    const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
    const mType = MAINTENANCE_TYPES[(machineIndex + j) % MAINTENANCE_TYPES.length];
    const descriptions = MAINTENANCE_DESCRIPTIONS[mType];

    const partsCount = 1 + (j % 2);
    const parts: string[] = [];
    for (let p = 0; p < partsCount; p++) {
      parts.push(PARTS[(machineIndex * 3 + j + p) % PARTS.length]);
    }

    records.push({
      id: `MNT-${String(machineIndex).padStart(2, '0')}${String(j + 1).padStart(2, '0')}`,
      date: date.toISOString().slice(0, 10),
      type: mType,
      description: descriptions[(machineIndex + j) % descriptions.length],
      technician: TECHNICIANS[(machineIndex + j) % TECHNICIANS.length],
      partsReplaced: parts,
      durationHours: Number((1 + Math.random() * 7).toFixed(1)),
      cost: Number((2000 + Math.random() * 15000).toFixed(0)),
      status: 'Completed',
    });
  }

  return records.sort((a, b) => b.date.localeCompare(a.date));
}

function generateNextMaintenanceDate(machineIndex: number): string {
  const now = Date.now();
  const daysAhead = 7 + (machineIndex * 5) % 45;
  const date = new Date(now + daysAhead * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function generateInstallDate(machineIndex: number): string {
  const base = new Date('2022-01-15');
  base.setMonth(base.getMonth() + (machineIndex * 2) % 24);
  return base.toISOString().slice(0, 10);
}

function generateWarrantyExpiry(installDate: string): string {
  const d = new Date(installDate);
  d.setFullYear(d.getFullYear() + 3);
  return d.toISOString().slice(0, 10);
}

export const INITIAL_BILLING_PROFILE: BillingProfile = {
  monthlyBudgetINR: 48000,
  currentSpendINR: 38250,
  projectedSpendINR: 42900,
  tariffPerKWhINR: 8.50,
  activeMachinesCount: 7,
  totalMachinesCount: 10,
  billingCycleDaysRemaining: 6,
};

export function generateInitialMachines(): Machine[] {
  const machines: Machine[] = [];

  // Always put 5V DC Motor Fan (MCH-007) as the FIRST machine in the list
  machines.push({
    id: 'MCH-007',
    name: '5V DC Motor Fan',
    type: '5V DC Motor Fan' as MachineType,
    zone: 'Shop Floor A',
    ratedPowerKW: 0.005, // 5 Watts
    status: 'active',
    currentKW: 0.0026,  // 2.6 Watts
    baselineKW: 0.0025, // 2.5 Watts
    temperatureC: 32,
    powerFactor: 0.95,
    voltageV: 5.0,
    currentAmps: 0.52,
    efficiencyScore: 95,
    lastUpdated: new Date().toLocaleTimeString(),
    sparkline: [0.0025, 0.0026, 0.0027, 0.0025, 0.0026, 0.0026, 0.0025, 0.0027, 0.0026, 0.0026],
    maintenanceHistory: generateMaintenanceHistory(7),
    nextMaintenanceDate: generateNextMaintenanceDate(7),
    installDate: generateInstallDate(7),
    warrantyExpiry: generateWarrantyExpiry(generateInstallDate(7)),
  });

  for (let i = 1; i <= 10; i++) {
    if (i === 7) continue; // MCH-007 is added above
    const id = `MCH-${String(i).padStart(3, '0')}`;
    const type = MACHINE_TYPES[(i - 1) % MACHINE_TYPES.length];
    const zone = ZONES[(i - 1) % ZONES.length];
    
    const ratedPowerKW = 20 + ((i * 17) % 95);
    
    let status: Machine['status'] = 'active';
    if (i === 3) status = 'idle';
    else if (i === 10) status = 'offline';

    const baselineKW = Number((ratedPowerKW * 0.65).toFixed(1));
    let currentKW = baselineKW;

    if (status === 'active') {
      currentKW = Number((baselineKW + (Math.random() * 4 - 2)).toFixed(1));
    } else if (status === 'idle') {
      currentKW = Number((ratedPowerKW * 0.08).toFixed(1));
    } else {
      currentKW = 0;
    }

    const voltageV = 415 + Math.floor(Math.random() * 8 - 4);
    const currentAmps = Number(((currentKW * 1000) / (Math.sqrt(3) * voltageV * 0.88)).toFixed(1));
    const powerFactor = status === 'offline' ? 0 : Number((0.85 + Math.random() * 0.1).toFixed(2));
    const temperatureC = status === 'offline' ? 24 : Math.floor(45 + Math.random() * 30);
    const efficiencyScore = Math.floor(82 + Math.random() * 15);

    const sparkline: number[] = [];
    for (let j = 0; j < 10; j++) {
      sparkline.push(Number((currentKW + (Math.random() * 3 - 1.5)).toFixed(1)));
    }

    machines.push({
      id,
      name: `${type.toUpperCase().replace(/\s+/g, '-')}-${String(i).padStart(2, '0')}`,
      type,
      zone,
      ratedPowerKW,
      status,
      currentKW,
      baselineKW,
      temperatureC,
      powerFactor,
      voltageV,
      currentAmps,
      efficiencyScore,
      lastUpdated: new Date().toLocaleTimeString(),
      sparkline,
      maintenanceHistory: generateMaintenanceHistory(i),
      nextMaintenanceDate: generateNextMaintenanceDate(i),
      installDate: generateInstallDate(i),
      warrantyExpiry: generateWarrantyExpiry(generateInstallDate(i)),
    });
  }

  return machines;
}

export const INITIAL_ANOMALIES: AnomalyEvent[] = [];

export const INITIAL_CONTROL_ACTIONS: ControlAction[] = [
  {
    id: 'ACT-401',
    machineId: 'MCH-005',
    machineName: 'CONVEYOR-SYSTEM-05',
    action: 'REMOTE_KILL_SWITCH',
    performedBy: 'Vikram Mehta (Plant Manager)',
    role: 'Plant Manager',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toLocaleTimeString(),
    confirmationMethod: 'TYPED_MACHINE_NAME',
    status: 'SUCCESS',
    machineLoadAtActionKW: 88.5,
    reason: 'Emergency power cutoff due to critical lubricant line pressure failure.'
  },
  {
    id: 'ACT-398',
    machineId: 'MCH-010',
    machineName: 'HVAC-CHILLER-10',
    action: 'REMOTE_KILL_SWITCH',
    performedBy: 'Anita Sharma (Energy Auditor)',
    role: 'Energy Auditor',
    timestamp: new Date(Date.now() - 120 * 60 * 1000).toLocaleTimeString(),
    confirmationMethod: 'TYPED_MACHINE_NAME',
    status: 'SUCCESS',
    machineLoadAtActionKW: 64.2,
    reason: 'Overnight non-operational load reduction.'
  }
];
