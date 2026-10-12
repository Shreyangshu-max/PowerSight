import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { Machine, AnomalyEvent, OperatorResponse, ControlAction, BillingProfile, TelemetryReading, AnomalyType } from '../types/energy';
import { generateInitialMachines, INITIAL_BILLING_PROFILE, INITIAL_ANOMALIES, INITIAL_CONTROL_ACTIONS } from '../services/mockData';
import { TelemetryEngine } from '../services/telemetryEngine';
import { fetchSensorLogs, sendDeviceCommand, getDeviceCommand, postSensorReading, type SensorLogEntry } from '../services/sensorService';

export type NavTab = 'dashboard' | 'machines' | 'graph' | 'alerts' | 'insights' | 'billing' | 'settings' | 'sensor-logs' | 'admin';
export type UserRole = 'Plant Manager' | 'Shift Engineer' | 'Energy Auditor' | 'Operator';

interface EnergyContextType {
  machines: Machine[];
  billing: BillingProfile;
  anomalies: AnomalyEvent[];
  operatorResponses: OperatorResponse[];
  controlActions: ControlAction[];
  isNetworkGapActive: boolean;
  activeTab: NavTab;
  currentRole: UserRole;
  selectedMachineId: string;
  searchQuery: string;
  selectedZone: string;
  operatorModalAnomaly: AnomalyEvent | null;
  killSwitchMachine: Machine | null;
  backendConnected: boolean;
  latestSensorLog: SensorLogEntry | null;
  sensorLogs: SensorLogEntry[];
  fanState: 'ON' | 'OFF';
  adminPhone: string;
  saveAdminPhone: (phone: string) => Promise<boolean>;
  toggleFanState: (targetState?: 'ON' | 'OFF') => Promise<boolean>;
  refreshSensorLogs: () => Promise<void>;
  setActiveTab: (tab: NavTab) => void;
  setCurrentRole: (role: UserRole) => void;
  setSelectedMachineId: (id: string) => void;
  setSearchQuery: (q: string) => void;
  setSelectedZone: (zone: string) => void;
  toggleNetworkGap: () => void;
  openOperatorModal: (anomaly: AnomalyEvent) => void;
  closeOperatorModal: () => void;
  submitOperatorResponse: (anomalyId: string, classification: 'INTENDED' | 'UNINTENDED', comment: string) => void;
  openKillSwitchModal: (machine: Machine) => void;
  closeKillSwitchModal: () => void;
  executeKillSwitch: (machineId: string, typedName: string, reason: string) => Promise<boolean>;
  injectTestAnomaly: (machineId: string, type: AnomalyType) => AnomalyEvent | null;
  getTelemetryHistory: (machineId: string) => TelemetryReading[];
  normalizeAll: () => void;
  triggerDragSpike: (machineId: string) => AnomalyEvent | null;
  triggerJumpSpike: (machineId: string) => AnomalyEvent | null;
  triggerInrushSpike: (machineId: string) => AnomalyEvent | null;
  triggerSignature: (machineId: string, signatureId: number) => AnomalyEvent | null;
  unactionedAlertsCount: number;
}

const EnergyContext = createContext<EnergyContextType | undefined>(undefined);

export const EnergyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [machines, setMachines] = useState<Machine[]>(generateInitialMachines);
  const [billing, setBilling] = useState<BillingProfile>(INITIAL_BILLING_PROFILE);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>(INITIAL_ANOMALIES);
  const [operatorResponses, setOperatorResponses] = useState<OperatorResponse[]>([]);
  const [controlActions, setControlActions] = useState<ControlAction[]>(INITIAL_CONTROL_ACTIONS);
  
  const [isNetworkGapActive, setIsNetworkGapActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [currentRole, setCurrentRole] = useState<UserRole>('Plant Manager');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('MCH-007');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  const [operatorModalAnomaly, setOperatorModalAnomaly] = useState<AnomalyEvent | null>(null);
  const [killSwitchMachine, setKillSwitchMachine] = useState<Machine | null>(null);

  // Real backend sensor telemetry & device command state
  const [backendConnected, setBackendConnected] = useState<boolean>(false);
  const [sensorLogs, setSensorLogs] = useState<SensorLogEntry[]>([]);
  const [latestSensorLog, setLatestSensorLog] = useState<SensorLogEntry | null>(null);
  const [fanState, setFanState] = useState<'ON' | 'OFF'>('OFF');
  const [adminPhone, setAdminPhone] = useState<string>('');

  // Load Admin Config (Phone Number) on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/admin-config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.data) {
          if (data.data.phoneNumber) {
            setAdminPhone(data.data.phoneNumber);
          }
        }
      })
      .catch(() => {});
  }, []);

  const saveAdminPhone = async (phone: string): Promise<boolean> => {
    setAdminPhone(phone);
    try {
      const res = await fetch('http://localhost:5000/api/admin-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, alertEnabled: true })
      });
      const data = await res.json();

      // Register OneSignal data tag on browser session
      if (typeof window !== 'undefined' && (window as any).OneSignalDeferred) {
        (window as any).OneSignalDeferred.push(function(OneSignal: any) {
          if (OneSignal && OneSignal.User) {
            try {
              OneSignal.User.addTag('phone_number', phone);
              OneSignal.User.addAlias('phone_number', phone);
              console.log('[OneSignal Tag 🏷️] Assigned tag phone_number =', phone);
            } catch (e) {
              console.warn('[OneSignal Tag Warning]', e);
            }
          }
        });
      }

      return data.success;
    } catch {
      return false;
    }
  };

  const toggleFanState = async (targetState?: 'ON' | 'OFF'): Promise<boolean> => {
    const nextState = targetState || (fanState === 'ON' ? 'OFF' : 'ON');
    setFanState(nextState);

    if (nextState === 'ON') {
      setSensorLogs(prev => prev.map(l => ({ ...l, isSpike: false })));
      setAnomalies(prev => prev.map(a => ({
        ...a,
        status: (a.status === 'ACTIVE' || a.status === 'ESCALATED') ? 'RESOLVED' : a.status
      })));
      telemetryEngine.normalize();
    }
    
    // Also update matched machine status in UI
    setMachines(prev => prev.map(m => {
      if (m.id === 'MCH-007' || m.id === selectedMachineId) {
        return { ...m, status: nextState === 'ON' ? 'active' : 'offline' };
      }
      return m;
    }));

    if (backendConnected) {
      const res = await sendDeviceCommand('ESP32-MCH-007', nextState);
      return res.success;
    }
    return true;
  };

  const refreshSensorLogs = useCallback(async () => {
    try {
      const response = await fetchSensorLogs(50);
      if (response && response.success) {
        setBackendConnected(true);
        setSensorLogs(response.data);
        
        // Fetch current device command from backend
        const cmd = await getDeviceCommand('ESP32-MCH-007');
        if (cmd === 'ON' || cmd === 'OFF') {
          setFanState(cmd);
        }

        if (response.latest) {
          setLatestSensorLog(response.latest);
          
          // If latest sensor log arrived from ESP32, sync the selected / mapped machine
          const latest = response.latest;
          setMachines(prev => prev.map(m => {
            // Match selected machine or machine ID matching device_id (e.g. MCH-007)
            const isMatch = m.id === selectedMachineId || 
              (latest.device_id && latest.device_id.toUpperCase().includes(m.id.toUpperCase()));
            
            if (isMatch && latest.powerKW >= 0) {
              const currentKW = latest.powerKW;
              const voltageV = latest.voltageV || m.voltageV;
              const currentAmps = latest.currentAmps || m.currentAmps;
              
              const updatedSparkline = [...m.sparkline.slice(1), currentKW];
              return {
                ...m,
                currentKW,
                voltageV,
                currentAmps,
                lastUpdated: latest.timestamp || m.lastUpdated,
                sparkline: updatedSparkline
              };
            }
            return m;
          }));
        }
      }
    } catch {
      // Backend not running or unreachable
      setBackendConnected(false);
    }
  }, [selectedMachineId]);

  // Polling effect for live backend telemetry
  useEffect(() => {
    refreshSensorLogs();
    const interval = setInterval(refreshSensorLogs, 2500);
    return () => clearInterval(interval);
  }, [refreshSensorLogs]);

  const telemetryEngine = useMemo(() => {
    return new TelemetryEngine(machines);
  }, []);

  useEffect(() => {
    telemetryEngine.start();

    const unsubscribeReadings = telemetryEngine.subscribe((_readings, updatedMachines) => {
      setMachines(updatedMachines);

      setAnomalies(prev => prev.map(a => {
        if (a.status === 'ACTIVE' || a.status === 'ESCALATED') {
          const costIncrement = (a.excessKW * (billing.tariffPerKWhINR / 3600));
          const newCost = Number((a.excessCostINR + costIncrement).toFixed(2));
          
          let newStatus = a.status;
          if (Date.now() > a.slaDeadlineMs && a.status === 'ACTIVE') {
            newStatus = 'ESCALATED';
          }

          return { ...a, excessCostINR: newCost, status: newStatus };
        }
        return a;
      }));

      const activeKwSum = updatedMachines.reduce((acc, m) => acc + (m.status === 'active' ? m.currentKW : 0), 0);
      setBilling(prev => {
        const hourlySpendINR = activeKwSum * prev.tariffPerKWhINR;
        const dailySpendINR = hourlySpendINR * 0.018; // Scaled daily billing
        const calculatedProjected = Math.min(
          prev.monthlyBudgetINR * 1.05,
          Number((prev.currentSpendINR + dailySpendINR * prev.billingCycleDaysRemaining).toFixed(0))
        );
        // Expected month-end bill locks static after highest spike
        const newProjected = Math.max(prev.projectedSpendINR, calculatedProjected);
        return {
          ...prev,
          activeMachinesCount: updatedMachines.filter(m => m.status === 'active').length,
          projectedSpendINR: newProjected
        };
      });
    });

    const triggerWebNotification = (title: string, bodyText: string) => {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            new Notification(title, { body: bodyText, icon: '/favicon.ico' });
          } catch (err) {
            console.warn('Native web notification error:', err);
          }
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              try {
                new Notification(title, { body: bodyText, icon: '/favicon.ico' });
              } catch (err) {
                console.warn('Native web notification error:', err);
              }
            }
          });
        }
      }
    };

    // Auto-request browser notification permission on load
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const unsubscribeAnomalies = telemetryEngine.subscribeAnomalies((newAnomaly) => {
      setAnomalies(prev => [newAnomaly, ...prev]);
      triggerWebNotification(
        `🚨 PowerSight Alert: ${newAnomaly.machineName}`,
        `${newAnomaly.title || newAnomaly.type} (${newAnomaly.severity})\n${newAnomaly.description || newAnomaly.rootCauseDescription || 'Power spike detected'}`
      );
    });

    return () => {
      unsubscribeReadings();
      unsubscribeAnomalies();
      telemetryEngine.stop();
    };
  }, [telemetryEngine, billing.tariffPerKWhINR]);

  const unactionedAlertsCount = useMemo(() => {
    return anomalies.filter(a => a.status === 'ACTIVE' || a.status === 'ESCALATED').length;
  }, [anomalies]);

  const toggleNetworkGapHandler = () => {
    const newState = telemetryEngine.toggleNetworkGap();
    setIsNetworkGapActive(newState);
  };

  const openOperatorModal = (anomaly: AnomalyEvent) => {
    setOperatorModalAnomaly(anomaly);
  };

  const closeOperatorModal = () => {
    setOperatorModalAnomaly(null);
  };

  const submitOperatorResponse = (anomalyId: string, classification: 'INTENDED' | 'UNINTENDED', comment: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const anomaly = anomalies.find(a => a.id === anomalyId);
    if (!anomaly) return;

    const responseRecord: OperatorResponse = {
      id: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
      anomalyId,
      machineId: anomaly.machineId,
      machineName: anomaly.machineName,
      operatorName: `User (${currentRole})`,
      operatorRole: currentRole,
      classification,
      comment: comment || 'No additional operator comment provided.',
      timestamp
    };

    setOperatorResponses(prev => [responseRecord, ...prev]);

    setAnomalies(prev => prev.map(a => {
      if (a.id === anomalyId) {
        return {
          ...a,
          status: 'RESOLVED',
          classification,
          operatorComment: comment,
          operatorName: `User (${currentRole})`,
          responseTimestamp: timestamp
        };
      }
      return a;
    }));

    closeOperatorModal();
  };

  const openKillSwitchModal = (machine: Machine) => {
    setKillSwitchMachine(machine);
  };

  const closeKillSwitchModal = () => {
    setKillSwitchMachine(null);
  };

  const executeKillSwitch = async (machineId: string, typedName: string, reason: string): Promise<boolean> => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return false;

    if (typedName.trim().toUpperCase() !== machine.name.toUpperCase()) {
      return false;
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    const timestamp = new Date().toLocaleTimeString();

    const actionRecord: ControlAction = {
      id: `ACT-${Math.floor(100 + Math.random() * 900)}`,
      machineId: machine.id,
      machineName: machine.name,
      action: 'REMOTE_KILL_SWITCH',
      performedBy: `Operator (${currentRole})`,
      role: currentRole,
      timestamp,
      confirmationMethod: 'TYPED_MACHINE_NAME',
      status: 'SUCCESS',
      machineLoadAtActionKW: machine.currentKW,
      reason: reason || 'Remote safety power isolation command.'
    };

    setControlActions(prev => [actionRecord, ...prev]);

    setMachines(prev => prev.map(m => {
      if (m.id === machineId) {
        return {
          ...m,
          status: 'offline',
          currentKW: 0,
          currentAmps: 0,
          lastUpdated: timestamp
        };
      }
      return m;
    }));

    closeKillSwitchModal();
    return true;
  };

  const injectSpikeLog = async (isSpike: boolean = true) => {
    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const currentVal = isSpike ? 0.63 : Number((0.46 + Math.random() * 0.11).toFixed(2));
    const powerVal = Number(((5.0 * currentVal) / 1000).toFixed(6));
    const spikeEntry: SensorLogEntry = {
      id: `LOG-SPIKE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      device_id: 'ESP32-MCH-007',
      voltage: 5.0,
      voltageV: 5.0,
      current: currentVal,
      currentAmps: currentVal,
      power: powerVal,
      powerKW: powerVal,
      timestamp: timeFormatted,
      isoTimestamp: now.toISOString(),
      receivedAt: Date.now(),
      isSpike: isSpike,
    };
    setSensorLogs(prev => [spikeEntry, ...prev.slice(0, 49)]);
    setLatestSensorLog(spikeEntry);

    try {
      await postSensorReading({
        device_id: 'ESP32-MCH-007',
        voltage: 5.0,
        current: currentVal,
        power: powerVal
      });
      await sendDeviceCommand('ESP32-MCH-007', isSpike ? 'SPIKE' : 'ON');
    } catch {
      // Standalone mode handling
    }
  };

  const injectTestAnomaly = (machineId: string, type: AnomalyType) => {
    injectSpikeLog(true);
    if (backendConnected) {
      sendDeviceCommand('ESP32-MCH-007', 'SPIKE');
    }
    return telemetryEngine.injectAnomaly(machineId, type);
  };

  const getTelemetryHistory = (machineId: string) => {
    return telemetryEngine.getReadingHistory(machineId);
  };

  const normalizeAll = async () => {
    // 1. Immediately reset fanState to ON
    setFanState('ON');

    // 2. Immediately clear ALL isSpike flags from local sensorLogs state
    const normalCurrent = Number((0.46 + Math.random() * 0.11).toFixed(2));
    const normalPower = Number(((5.0 * normalCurrent) / 1000).toFixed(6));
    setSensorLogs(prev => prev.map(log => ({
      ...log,
      isSpike: false,
      current: log.current > 0.58 ? normalCurrent : log.current,
      currentAmps: log.currentAmps > 0.58 ? normalCurrent : log.currentAmps
    })));

    // 3. Resolve all active/escalated anomalies
    setAnomalies(prev => prev.map(a => ({
      ...a,
      status: (a.status === 'ACTIVE' || a.status === 'ESCALATED') ? 'RESOLVED' : a.status
    })));

    // 4. Reset machine statuses back to active
    setMachines(prev => prev.map(m => ({
      ...m,
      status: m.status === 'offline' ? 'offline' : 'active'
    })));

    try {
      await sendDeviceCommand('ESP32-MCH-007', 'ON');
      await postSensorReading({
        device_id: 'ESP32-MCH-007',
        voltage: 5.0,
        current: normalCurrent,
        power: normalPower
      });
    } catch {
      // Standalone mode handling
    }
    telemetryEngine.normalize();
    // Refresh logs from server after a short delay so server has time to update
    setTimeout(() => refreshSensorLogs(), 500);
  };

  const handleDragSpike = (machineId: string) => {
    injectSpikeLog(true);
    if (backendConnected) {
      sendDeviceCommand('ESP32-MCH-007', 'SPIKE');
    }
    return telemetryEngine.triggerDragSpike(machineId);
  };

  const handleJumpSpike = (machineId: string) => {
    injectSpikeLog(true);
    if (backendConnected) {
      sendDeviceCommand('ESP32-MCH-007', 'SPIKE');
    }
    return telemetryEngine.triggerJumpSpike(machineId);
  };

  const handleInrushSpike = (machineId: string) => {
    injectSpikeLog(true);
    if (backendConnected) {
      sendDeviceCommand('ESP32-MCH-007', 'SPIKE');
    }
    return telemetryEngine.triggerInrushSpike(machineId);
  };

  const handleTriggerSignature = (machineId: string, signatureId: number) => {
    injectSpikeLog(true);
    if (backendConnected) {
      sendDeviceCommand('ESP32-MCH-007', 'SPIKE');
    }
    return telemetryEngine.triggerSignature(machineId, signatureId);
  };

  return (
    <EnergyContext.Provider value={{
      machines,
      billing,
      anomalies,
      operatorResponses,
      controlActions,
      isNetworkGapActive,
      activeTab,
      currentRole,
      selectedMachineId,
      searchQuery,
      selectedZone,
      operatorModalAnomaly,
      killSwitchMachine,
      backendConnected,
      latestSensorLog,
      sensorLogs,
      fanState,
      adminPhone,
      saveAdminPhone,
      toggleFanState,
      refreshSensorLogs,
      setActiveTab,
      setCurrentRole,
      setSelectedMachineId,
      setSearchQuery,
      setSelectedZone,
      toggleNetworkGap: toggleNetworkGapHandler,
      openOperatorModal,
      closeOperatorModal,
      submitOperatorResponse,
      openKillSwitchModal,
      closeKillSwitchModal,
      executeKillSwitch,
      injectTestAnomaly,
      getTelemetryHistory,
      normalizeAll,
      triggerDragSpike: handleDragSpike,
      triggerJumpSpike: handleJumpSpike,
      triggerInrushSpike: handleInrushSpike,
      triggerSignature: handleTriggerSignature,
      unactionedAlertsCount
    }}>
      {children}
    </EnergyContext.Provider>
  );
};

export const useEnergy = () => {
  const context = useContext(EnergyContext);
  if (!context) throw new Error('useEnergy must be used within an EnergyProvider');
  return context;
};
