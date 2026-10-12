import type { Machine, TelemetryReading, AnomalyEvent, AnomalyType } from '../types/energy';

// ─────────────────────────────────────────────────────────────────────────────
// 7 MSME AI Diagnostic Signature Profiles
// Each profile has a 10-point dummy data array (relative kW offsets from baseline)
// and the full diagnostic metadata to feed the AI Insight Panel.
// ─────────────────────────────────────────────────────────────────────────────
export interface SignatureProfile {
  id: number;
  name: string;
  anomalyType: AnomalyType;
  graphProfile: string;
  data: number[];           // Absolute kW values to replay point-by-point
  rootCause: string;
  recommendedAction: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  classification: string;
  badgeLabel: string;
  badgeColor: string;       // Tailwind color key for UI
}

export const SIGNATURE_PROFILES: SignatureProfile[] = [
  {
    id: 1,
    name: 'Mechanical Friction Drift',
    anomalyType: 'SIG_MECHANICAL_FRICTION_DRIFT',
    graphProfile: 'Gradual Linear/Exponential Monotonic Rise',
    data: [10, 11, 12, 13, 15, 17, 20, 24, 29, 35],
    rootCause: 'Gradual ascending friction draw detected. Natural mechanical wear and tear, bearing lubrication loss, belt degradation, or thermal heat/dust buildup causing steadily increasing resistance.',
    recommendedAction: 'Schedule predictive maintenance within 48h. Inspect bearing lubrication, clear heat/dust buildup, and replace degraded belts before critical friction limits are reached.',
    severity: 'WARNING',
    classification: 'Efficiency Loss (Predictive Maintenance Warning)',
    badgeLabel: 'Gradual Drift',
    badgeColor: 'amber',
  },
  {
    id: 2,
    name: 'Cyclic Interference Pulse',
    anomalyType: 'SIG_CYCLIC_INTERFERENCE_PULSE',
    graphProfile: 'Periodic Impulsive Spikes at Fixed Intervals',
    data: [10, 10, 35, 10, 10, 35, 10, 10, 35, 10],
    rootCause: 'Periodic impulsive spikes at fixed cycle intervals. Indicates external mechanical jamming, material feed resistance, or misaligned belt slipping at fixed rotations.',
    recommendedAction: 'Pause the cycle line to inspect material feed track and verify drive belt alignment. Check for jamming obstructions in feed hoppers.',
    severity: 'WARNING',
    classification: 'Process Interruption (Operational Anomaly)',
    badgeLabel: 'Cyclic Pulse',
    badgeColor: 'orange',
  },
  {
    id: 3,
    name: 'Structural Shear Jump',
    anomalyType: 'SIG_STRUCTURAL_SHEAR_JUMP',
    graphProfile: 'Immediate Step-Up + Accelerated Positive Slope',
    data: [10, 10, 10, 25, 27, 30, 34, 39, 45, 52],
    rootCause: 'Near-vertical instantaneous step-increase followed by steeper positive slope. Indicates severe internal mechanical component failure — snapped gear tooth, cracked bearing ball, or broken seal causing ongoing catastrophic friction.',
    recommendedAction: 'IMMEDIATE EMERGENCY SHUTDOWN. Dispatch emergency repair technician. Inspect internal gear casing, drive seals, and bearing race for fracture damage.',
    severity: 'CRITICAL',
    classification: 'Critical Equipment Fault (Immediate Intervention Required)',
    badgeLabel: 'CRITICAL',
    badgeColor: 'rose',
  },
  {
    id: 4,
    name: 'Idle Run Offset',
    anomalyType: 'SIG_IDLE_RUN_OFFSET',
    graphProfile: 'Sustained Flat Plateau at High Baseline',
    data: [10, 10, 30, 30, 30, 30, 30, 30, 30, 30],
    rootCause: 'Immediate upward step-shift to a sustained flat plateau during non-production hours. Operator/human negligence — motors, compressors, hydraulics, or pumps left running unattended during breaks or overnight.',
    recommendedAction: 'Execute automated remote idle shutdown immediately. Alert shift supervisor. Enforce mandatory power-down protocols and install automated idle-detection timers.',
    severity: 'WARNING',
    classification: 'Direct Energy Waste (Operational Negligence)',
    badgeLabel: 'Idle Waste',
    badgeColor: 'yellow',
  },
  {
    id: 5,
    name: 'Resonant Micro-Jitter',
    anomalyType: 'SIG_RESONANT_MICRO_JITTER',
    graphProfile: 'High-Frequency Noise Band (Fuzzy Baseline)',
    data: [10, 14, 8, 13, 9, 12, 8, 14, 9, 11],
    rootCause: 'High-frequency low-amplitude oscillations around mean power line without shifting the median. Dynamic mechanical unbalance, rotor misalignment, loose mounting bolts, or shaft resonance.',
    recommendedAction: 'Deploy vibration analysis tool to active unit. Tighten chassis mounting bolts and verify rotor alignment with laser calibration tools. Check for resonant frequencies.',
    severity: 'WARNING',
    classification: 'Mechanical Stress & Vibration (Frictional Loss)',
    badgeLabel: 'Micro-Jitter',
    badgeColor: 'sky',
  },
  {
    id: 6,
    name: 'Thermal-Friction Decaying Tail',
    anomalyType: 'SIG_THERMAL_FRICTION_DECAYING_TAIL',
    graphProfile: 'Prolonged Exponential Decay Post-Shutdown',
    data: [40, 35, 28, 20, 14, 10, 8, 7, 6, 5],
    rootCause: 'Abnormally elongated slow decay curve post-shutdown, far exceeding nominal decel time. Extreme mechanical drag, dried sludge/debris resistance, or clogged cooling pumps running continuously post-cycle.',
    recommendedAction: 'Flush cooling pump lines and inspect for sludge blockages. Verify the decel/brake mechanism is not seizing during cycle shutdown. Clean debris from cooling channels.',
    severity: 'WARNING',
    classification: 'Residual Friction Drag (System Inefficiency)',
    badgeLabel: 'Decay Tail',
    badgeColor: 'violet',
  },
  {
    id: 7,
    name: 'Decoupled Free-Wheel Step-Down',
    anomalyType: 'SIG_DECOUPLED_FREEWHEEEL_STEP_DOWN',
    graphProfile: 'Instantaneous Step-Drop to Unloaded Plateau',
    data: [30, 30, 30, 8, 8, 8, 8, 8, 8, 8],
    rootCause: 'Sudden downward shift to abnormally low plateau while machine remains active. Mechanical decoupling between drive motor and load — snapped drive belt, broken shear pin, or dry-running pump cavitation.',
    recommendedAction: 'Halt motor immediately to prevent uncoupled runaway. Inspect physical linkage, drive belts, and shear pins for snap failures. Check pump for dry-run cavitation damage.',
    severity: 'CRITICAL',
    classification: 'Unproductive Idle Waste (Zero-Output Operation)',
    badgeLabel: 'Decoupled',
    badgeColor: 'purple',
  },
];

export interface SpikeSimulationState {
  mode: 'DRAG' | 'JUMP' | 'INRUSH_SUSTAINED' | 'NONE' | 'SIGNATURE';
  targetKW: number;
  tickCount: number;
  // Signature replay state
  signatureData?: number[];
  signatureIndex?: number;
  signatureBaseline?: number;
}

export class TelemetryEngine {
  private machines: Machine[];
  private listeners: ((readings: TelemetryReading[], updatedMachines: Machine[]) => void)[] = [];
  private anomalyListeners: ((anomaly: AnomalyEvent) => void)[] = [];
  private intervalId: number | null = null;
  private isNetworkGapActive: boolean = false;
  private readingHistory: Map<string, TelemetryReading[]> = new Map();
  private spikeSimulations: Map<string, SpikeSimulationState> = new Map();

  constructor(initialMachines: Machine[]) {
    this.machines = initialMachines;
    this.initHistory();
  }

  private initHistory() {
    const now = Date.now();
    this.machines.forEach(m => {
      const history: TelemetryReading[] = [];
      for (let i = 20; i >= 0; i--) {
        const timeStr = new Date(now - i * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        history.push({
          timestamp: timeStr,
          machineId: m.id,
          powerKW: m.currentKW,
          baselineKW: m.baselineKW,
          currentAmps: m.currentAmps,
          voltageV: m.voltageV,
          powerFactor: m.powerFactor,
          isStale: false
        });
      }
      this.readingHistory.set(m.id, history);
    });
  }

  public start() {
    if (this.intervalId) return;
    this.intervalId = window.setInterval(() => this.tick(), 1000);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public toggleNetworkGap(active?: boolean): boolean {
    this.isNetworkGapActive = active !== undefined ? active : !this.isNetworkGapActive;
    return this.isNetworkGapActive;
  }

  public getIsNetworkGapActive(): boolean {
    return this.isNetworkGapActive;
  }

  public subscribe(callback: (readings: TelemetryReading[], updatedMachines: Machine[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public subscribeAnomalies(callback: (anomaly: AnomalyEvent) => void) {
    this.anomalyListeners.push(callback);
    return () => {
      this.anomalyListeners = this.anomalyListeners.filter(l => l !== callback);
    };
  }

  public normalize(machineId?: string) {
    const now = Date.now();
    this.machines.forEach(m => {
      if (!machineId || m.id === machineId) {
        m.status = 'active';
        m.currentKW = Number((m.baselineKW + (Math.random() * 2 - 1)).toFixed(1));
        this.spikeSimulations.delete(m.id);

        const history: TelemetryReading[] = [];
        for (let i = 20; i >= 0; i--) {
          const timeStr = new Date(now - i * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const powerKW = Number((m.baselineKW + (Math.random() * 2 - 1)).toFixed(1));
          history.push({
            timestamp: timeStr,
            machineId: m.id,
            powerKW,
            baselineKW: m.baselineKW,
            currentAmps: Number(((powerKW * 1000) / (Math.sqrt(3) * m.voltageV * 0.88)).toFixed(1)),
            voltageV: m.voltageV,
            powerFactor: m.powerFactor,
            isStale: false
          });
        }
        this.readingHistory.set(m.id, history);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SIGNATURE TRIGGER — plays back the 10-point dummy data array from the
  // profile, scaled to the machine's actual baseline kW, one point per tick.
  // After all 10 points are played, loops the last value for sustained effect.
  // ─────────────────────────────────────────────────────────────────────────
  public triggerSignature(machineId: string, signatureId: number): AnomalyEvent | null {
    const machine = this.machines.find(m => m.id === machineId);
    const profile = SIGNATURE_PROFILES.find(p => p.id === signatureId);
    if (!machine || !profile) return null;

    machine.status = 'flagged';

    // Scale the 10-pt profile data relative to machine's real baseline
    // Profile baseline is assumed to be 10 (the starting point of each array)
    const profileBaseline = profile.data[0];
    const scaleFactor = machine.baselineKW / profileBaseline;
    const scaledData = profile.data.map(v => Number((v * scaleFactor).toFixed(1)));

    this.spikeSimulations.set(machineId, {
      mode: 'SIGNATURE',
      targetKW: scaledData[scaledData.length - 1],
      tickCount: 0,
      signatureData: scaledData,
      signatureIndex: 0,
      signatureBaseline: machine.baselineKW,
    });

    // Set first value immediately
    machine.currentKW = scaledData[0];

    return this.injectSignatureAnomaly(machine, profile);
  }

  private injectSignatureAnomaly(machine: Machine, profile: SignatureProfile): AnomalyEvent {
    const peakKW = Math.max(...profile.data.map(v => v * (machine.baselineKW / profile.data[0])));
    const excessKW = Number((peakKW - machine.baselineKW).toFixed(1));
    const excessCostINR = Number((excessKW * (8.5 / 60) * 5).toFixed(2));
    const confidence = Math.floor(88 + Math.random() * 10);

    const anomaly: AnomalyEvent = {
      id: `ANO-${Math.floor(1000 + Math.random() * 9000)}`,
      machineId: machine.id,
      machineName: machine.name,
      zone: machine.zone,
      timestamp: new Date().toLocaleTimeString(),
      type: profile.anomalyType,
      severity: profile.severity,
      peakKW: Number(peakKW.toFixed(1)),
      baselineKW: machine.baselineKW,
      excessKW,
      excessCostINR,
      confidenceScore: confidence,
      rootCauseDescription: `[Sig-${profile.id}: ${profile.name}] ${profile.rootCause}`,
      recommendedAction: profile.recommendedAction,
      slaDeadlineMs: Date.now() + 10 * 60 * 1000,
      status: 'ACTIVE'
    };

    this.anomalyListeners.forEach(l => l(anomaly));
    return anomaly;
  }

  // Legacy spike triggers kept for backward compat
  public triggerDragSpike(machineId: string): AnomalyEvent | null {
    return this.triggerSignature(machineId, 1);
  }

  public triggerJumpSpike(machineId: string): AnomalyEvent | null {
    return this.triggerSignature(machineId, 2);
  }

  public triggerInrushSpike(machineId: string): AnomalyEvent | null {
    return this.triggerSignature(machineId, 4);
  }

  public injectAnomaly(machineId: string, type: AnomalyType): AnomalyEvent | null {
    const machine = this.machines.find(m => m.id === machineId);
    if (!machine) return null;

    machine.status = 'flagged';

    let peakKW = machine.baselineKW * 1.5;
    let severity: AnomalyEvent['severity'] = 'WARNING';
    let rootCause = '';
    let recommendation = '';
    let confidence = Math.floor(85 + Math.random() * 12);

    switch (type) {
      case 'DRAG_SPIKE':
      case 'BEARING_DRAG':
        peakKW = Number((machine.baselineKW * 1.7 + Math.random() * 8).toFixed(1));
        severity = 'CRITICAL';
        rootCause = `Drag Spike: Gradually ascending mechanical friction draw (${peakKW} kW vs ${machine.baselineKW} kW baseline).`;
        recommendation = 'Inspect bearing assembly and lubrication flow before mechanical locking.';
        break;
      case 'JUMP_SPIKE':
      case 'MOTOR_OVERLOAD':
        peakKW = Number((machine.ratedPowerKW * 1.3 + Math.random() * 8).toFixed(1));
        severity = 'CRITICAL';
        rootCause = `Jump Spike: Instant repeating load pulses (${peakKW} kW peak vs ${machine.baselineKW} kW baseline).`;
        recommendation = 'Check intermittent load cycle and verify fast-acting circuit protection settings.';
        break;
      case 'INRUSH_SUSTAINED':
      case 'INRUSH_CURRENT':
        peakKW = Number((machine.baselineKW * 1.65 + Math.random() * 6).toFixed(1));
        severity = 'WARNING';
        rootCause = `Inrush Spike (Sustained): High initial current spike that remains elevated at ${peakKW} kW.`;
        recommendation = 'Inspect soft starter bypass contactor and capacitor bank harmonic filters.';
        break;
      case 'SENSOR_FAULT':
        peakKW = Number((machine.ratedPowerKW * 1.8).toFixed(1));
        severity = 'WARNING';
        confidence = Math.floor(65 + Math.random() * 15);
        rootCause = 'Instantaneous single-point current telemetry anomaly with non-physical step change.';
        recommendation = 'Verify CT transformer calibration and gateway analog sensor wiring connections.';
        break;
      default:
        peakKW = Number((machine.baselineKW * 1.5).toFixed(1));
        severity = 'CRITICAL';
        rootCause = 'Dynamic baseline threshold breach of >30% sustained power draw.';
        recommendation = 'Inspect load conditions and line voltage input stability.';
    }

    machine.currentKW = peakKW;
    machine.currentAmps = Number(((peakKW * 1000) / (Math.sqrt(3) * machine.voltageV * 0.88)).toFixed(1));

    const excessKW = Number((peakKW - machine.baselineKW).toFixed(1));
    const excessCostINR = Number((excessKW * (8.5 / 60) * 5).toFixed(2));

    const anomaly: AnomalyEvent = {
      id: `ANO-${Math.floor(1000 + Math.random() * 9000)}`,
      machineId: machine.id,
      machineName: machine.name,
      zone: machine.zone,
      timestamp: new Date().toLocaleTimeString(),
      type,
      severity,
      peakKW,
      baselineKW: machine.baselineKW,
      excessKW,
      excessCostINR,
      confidenceScore: confidence,
      rootCauseDescription: rootCause,
      recommendedAction: recommendation,
      slaDeadlineMs: Date.now() + 10 * 60 * 1000,
      status: 'ACTIVE'
    };

    this.anomalyListeners.forEach(l => l(anomaly));
    return anomaly;
  }

  private tick() {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentReadings: TelemetryReading[] = [];

    this.machines.forEach(m => {
      const spikeSim = this.spikeSimulations.get(m.id);

      if (spikeSim) {
        spikeSim.tickCount++;

        if (spikeSim.mode === 'SIGNATURE' && spikeSim.signatureData) {
          // Replay signature array point-by-point, one per tick
          const idx = spikeSim.signatureIndex ?? 0;
          const data = spikeSim.signatureData;
          if (idx < data.length) {
            m.currentKW = Number((data[idx] + (Math.random() * 0.4 - 0.2)).toFixed(1));
            spikeSim.signatureIndex = idx + 1;
          } else {
            // Hold last value with slight jitter
            m.currentKW = Number((data[data.length - 1] + (Math.random() * 1 - 0.5)).toFixed(1));
          }
        } else if (spikeSim.mode === 'DRAG') {
          if (m.currentKW < spikeSim.targetKW) {
            m.currentKW = Number((m.currentKW + 2.0 + Math.random() * 0.8).toFixed(1));
          } else {
            m.currentKW = Number((spikeSim.targetKW + (Math.random() * 2 - 1)).toFixed(1));
          }
        } else if (spikeSim.mode === 'JUMP') {
          const isSpikeTick = (spikeSim.tickCount % 4) < 2;
          m.currentKW = isSpikeTick
            ? Number((spikeSim.targetKW + (Math.random() * 3 - 1.5)).toFixed(1))
            : Number((m.baselineKW + (Math.random() * 2 - 1)).toFixed(1));
        } else if (spikeSim.mode === 'INRUSH_SUSTAINED') {
          m.currentKW = Number((spikeSim.targetKW + (Math.random() * 2 - 1)).toFixed(1));
        }
      } else if (m.status === 'offline') {
        m.currentKW = 0;
        m.currentAmps = 0;
      } else if (m.status === 'idle') {
        m.currentKW = Number((m.ratedPowerKW * 0.08 + (Math.random() * 0.5 - 0.25)).toFixed(1));
      } else if (m.status === 'flagged') {
        m.currentKW = Number((m.currentKW + (Math.random() * 1.5 - 0.75)).toFixed(1));
      } else {
        const variation = (Math.random() * 3 - 1.5);
        m.currentKW = Math.max(1, Number((m.baselineKW + variation).toFixed(1)));
        m.baselineKW = Number((m.baselineKW * 0.98 + m.currentKW * 0.02).toFixed(1));
      }

      if (m.currentKW > 0) {
        m.currentAmps = Number(((m.currentKW * 1000) / (Math.sqrt(3) * m.voltageV * (m.powerFactor || 0.88))).toFixed(1));
      } else {
        m.currentAmps = 0;
      }

      m.sparkline.shift();
      m.sparkline.push(m.currentKW);
      m.lastUpdated = timeStr;

      const isStale = this.isNetworkGapActive && Math.random() < 0.6;

      const reading: TelemetryReading = {
        timestamp: timeStr,
        machineId: m.id,
        powerKW: isStale ? 0 : m.currentKW,
        baselineKW: m.baselineKW,
        currentAmps: isStale ? 0 : m.currentAmps,
        voltageV: m.voltageV,
        powerFactor: m.powerFactor,
        isStale
      };

      currentReadings.push(reading);

      const history = this.readingHistory.get(m.id) || [];
      history.shift();
      history.push(reading);
      this.readingHistory.set(m.id, history);
    });

    this.listeners.forEach(l => l(currentReadings, [...this.machines]));
  }

  public getReadingHistory(machineId: string): TelemetryReading[] {
    return this.readingHistory.get(machineId) || [];
  }

  public getMachines(): Machine[] {
    return [...this.machines];
  }
}
