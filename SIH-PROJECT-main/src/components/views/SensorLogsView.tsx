import React, { useState, useMemo, useEffect } from 'react';
import { Activity, RefreshCw, Trash2, Cpu, Zap, Filter, ChevronDown } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';
import { BACKEND_BASE_URL } from '../../services/sensorService';

export const SensorLogsView: React.FC = () => {
  const {
    sensorLogs,
    backendConnected,
    refreshSensorLogs,
    machines,
    selectedMachineId,
  } = useEnergy();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const [deviceMenuOpen, setDeviceMenuOpen] = useState(false);
  const [manuallySelected, setManuallySelected] = useState(false);

  // Default the sensor device selector to whatever is chosen in the dashboard
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    selectedMachineId || 'MCH-007'
  );

  // Keep in sync with dashboard selection unless user has manually overridden
  useEffect(() => {
    if (!manuallySelected && selectedMachineId) {
      setSelectedDeviceId(selectedMachineId);
    }
  }, [selectedMachineId, manuallySelected]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshSensorLogs();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleClearLogs = async () => {
    try {
      await fetch(`${BACKEND_BASE_URL}/api/sensor-logs`, { method: 'DELETE' });
      await refreshSensorLogs();
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch {
      // Silently fail if backend not running
    }
  };

  const selectedMachine = useMemo(
    () => machines.find((m) => m.id === selectedDeviceId),
    [machines, selectedDeviceId]
  );

  // Filter logs: match device_id that contains the machine ID
  const filteredLogs = useMemo(() => {
    return sensorLogs.filter((log) => {
      const logDev = (log.device_id || '').toUpperCase();
      const logName = (log.machine_name || '').toUpperCase();
      const mach = selectedDeviceId.toUpperCase();
      const selectedName = (selectedMachine?.name || '').toUpperCase();
      return (
        logDev === mach ||
        logDev.includes(mach) ||
        (logName !== '' && logName.includes(mach)) ||
        (selectedName !== '' && logName.includes(selectedName))
      );
    });
  }, [sensorLogs, selectedDeviceId, selectedMachine]);

  const latestLog = filteredLogs[0] ?? null;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
            <Activity className="h-6 w-6 text-cyan-400" />
            <span>LIVE ESP32 SENSOR TELEMETRY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time readings ingested via&nbsp;
            <span className="font-mono text-slate-300">
              POST {BACKEND_BASE_URL}/api/sensor-logs
            </span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="text-xs px-3 py-1.5 rounded-lg border bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600 flex items-center space-x-1.5 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleClearLogs}
            className="text-xs px-3 py-1.5 rounded-lg border bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/50 flex items-center space-x-1.5 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{clearSuccess ? 'Cleared!' : 'Clear Logs'}</span>
          </button>
        </div>
      </div>

      {/* ── Device / Machine Selector Card ── */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-700">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Label */}
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center space-x-1.5">
              <Filter className="h-3.5 w-3.5" />
              <span>Device / Machine Sensor Feed</span>
            </div>
            <p className="text-xs text-slate-500">
              Select a machine to view its live sensor logs and Supabase-synced values
            </p>
          </div>

          {/* Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setDeviceMenuOpen((v) => !v)}
              className="flex items-center space-x-3 px-4 py-2.5 rounded-xl border border-cyan-500/40 bg-slate-900/80 hover:bg-slate-800 transition text-sm min-w-[280px]"
            >
              <div
                className={`h-2.5 w-2.5 rounded-full flex-shrink-0 transition-colors ${
                  selectedMachine?.status === 'active'
                    ? 'bg-emerald-400 animate-pulse'
                    : selectedMachine?.status === 'idle'
                    ? 'bg-amber-400'
                    : 'bg-slate-600'
                }`}
              />
              <div className="flex-1 text-left">
                <div className="font-mono font-bold text-cyan-300 text-xs">
                  {selectedDeviceId}
                </div>
                <div className="text-slate-400 text-[10px]">
                  {selectedMachine?.name ?? 'Unknown Machine'}
                </div>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  deviceMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {deviceMenuOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-1.5 max-h-72 overflow-y-auto">
                <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-800 mb-1">
                  Connected Machines
                </div>

                {machines.map((machine) => {
                  const isSelected = machine.id === selectedDeviceId;
                  const logsForMachine = sensorLogs.filter((l) =>
                    (l.device_id || '').toUpperCase().includes(machine.id.toUpperCase())
                  ).length;

                  return (
                    <button
                      key={machine.id}
                      onClick={() => {
                        setSelectedDeviceId(machine.id);
                        setManuallySelected(true);
                        setDeviceMenuOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-2.5 hover:bg-slate-800 rounded-lg flex items-center justify-between transition ${
                        isSelected ? 'bg-cyan-950/60 border border-cyan-500/30' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <div
                          className={`h-2 w-2 rounded-full flex-shrink-0 ${
                            machine.status === 'active'
                              ? 'bg-emerald-400'
                              : machine.status === 'idle'
                              ? 'bg-amber-400'
                              : 'bg-slate-600'
                          }`}
                        />
                        <div>
                          <div className="text-xs font-mono font-bold text-slate-200">
                            {machine.id}
                          </div>
                          <div className="text-[10px] text-slate-400">{machine.name}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            machine.status === 'active'
                              ? 'bg-emerald-950 text-emerald-400 border-emerald-500/30'
                              : machine.status === 'idle'
                              ? 'bg-amber-950 text-amber-400 border-amber-500/30'
                              : 'bg-slate-800 text-slate-500 border-slate-700'
                          }`}
                        >
                          {machine.status.toUpperCase()}
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5">
                          {logsForMachine} logs
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Latest readings strip for the selected device */}
        {latestLog && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sky-300 font-bold text-lg font-mono">
                {latestLog.voltageV?.toFixed(1)} V
              </div>
              <div className="text-slate-500 text-xs">Latest Voltage</div>
            </div>
            <div>
              <div className="text-violet-300 font-bold text-lg font-mono">
                {latestLog.currentAmps?.toFixed(2)} A
              </div>
              <div className="text-slate-500 text-xs">Latest Current</div>
            </div>
            <div>
              <div className="text-emerald-300 font-bold text-lg font-mono">
                {(latestLog.powerKW * 1000).toFixed(1)} W
              </div>
              <div className="text-slate-500 text-xs">Latest Power</div>
            </div>
          </div>
        )}
      </div>

      {/* ── Sensor Logs Table ── */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="text-sm font-bold text-slate-200">
              {selectedMachine?.name ?? selectedDeviceId}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ({selectedDeviceId})
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono flex items-center space-x-2">
            <span>{filteredLogs.length} records</span>
            {backendConnected && (
              <span className="flex items-center space-x-1 text-cyan-500">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>Live</span>
              </span>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Cpu className="h-8 w-8 text-slate-600" />
            </div>
            <div>
              <p className="text-slate-300 font-semibold">
                No logs for {selectedMachine?.name ?? selectedDeviceId}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {backendConnected
                  ? `Backend connected — no data received for device ${selectedDeviceId} yet.`
                  : 'Start the backend: node server/index.js, then connect your ESP32.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Log ID</th>
                  <th className="p-3.5">Device</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Voltage (V)</th>
                  <th className="p-3.5">Current (A)</th>
                  <th className="p-3.5">Power (W)</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredLogs.map((log, idx) => {
                  const powerWatts =
                    log.powerKW !== undefined
                      ? log.powerKW * 1000
                      : log.power ?? 0;
                  const isSpike =
                    log.isSpike ||
                    (log.currentAmps ?? 0) > 2.0 ||
                    powerWatts > 10.0;

                  return (
                    <tr
                      key={log.id}
                      className={`transition-colors ${
                        isSpike
                          ? 'bg-rose-950/80 border-l-4 border-l-rose-500 text-rose-200 font-bold border-t border-b border-rose-500/40 shadow-lg shadow-rose-950/50'
                          : idx === 0
                          ? 'bg-cyan-950/20 border-l-2 border-l-cyan-500'
                          : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="p-3.5 font-mono text-[10px] text-slate-500">
                        {log.id?.slice(-12) ?? '—'}
                      </td>
                      <td className="p-3.5">
                        <span className="flex items-center space-x-1.5">
                          <Cpu
                            className={`h-3 w-3 ${
                              isSpike ? 'text-rose-400' : 'text-cyan-500'
                            }`}
                          />
                          <span
                            className={`font-mono font-bold ${
                              isSpike ? 'text-rose-300' : 'text-cyan-300'
                            }`}
                          >
                            {log.device_id}
                          </span>
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-300">
                        {log.timestamp}
                      </td>
                      <td className="p-3.5 font-mono">
                        <span
                          className={`font-bold ${
                            isSpike ? 'text-rose-300' : 'text-sky-300'
                          }`}
                        >
                          {log.voltageV?.toFixed(1)}
                        </span>
                        <span className="text-slate-500 ml-0.5">V</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span
                          className={`font-bold ${
                            isSpike
                              ? 'text-rose-400 animate-pulse text-sm'
                              : 'text-violet-300'
                          }`}
                        >
                          {log.currentAmps?.toFixed(2)}
                        </span>
                        <span className="text-slate-500 ml-0.5">A</span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span
                          className={`font-bold ${
                            isSpike
                              ? 'text-rose-400 animate-pulse text-sm'
                              : 'text-emerald-300'
                          }`}
                        >
                          {powerWatts.toFixed(1)}
                        </span>
                        <span className="text-slate-500 ml-0.5">W</span>
                      </td>
                      <td className="p-3.5 text-right">
                        {isSpike ? (
                          <span className="inline-flex items-center space-x-1 text-[10px] bg-rose-900/90 text-rose-200 border border-rose-500/50 px-2 py-0.5 rounded font-extrabold font-mono animate-bounce">
                            <span>SPIKE FAULT</span>
                          </span>
                        ) : (
                          <span className="flex items-center justify-end space-x-1 text-[10px]">
                            <Zap className="h-2.5 w-2.5 text-cyan-500" />
                            <span className="text-cyan-600 font-mono">NORMAL</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

