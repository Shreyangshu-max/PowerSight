import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip
} from 'recharts';
import { LineChart, ShieldAlert, Clock } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

// ─────────────────────────────────────────────────────────────────────────────
// Historical data generator for 1H / 6H / 24H views
// Creates realistic power consumption patterns seeded by machineId
// so they look consistent on repeated switches.
// ─────────────────────────────────────────────────────────────────────────────

interface ChartPoint {
  timestamp: string;
  powerKW: number | null;
  baselineKW: number | null;
  baselineBand: [number, number] | null;
  currentAmps: number | null;
  voltageV: number | null;
  isStale: boolean;
  isSpike: boolean;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateHistoricalData(
  window: '1H' | '6H' | '24H',
  baselineKW: number,
  voltageV: number,
  powerFactor: number,
  machineId: string
): ChartPoint[] {
  // Config per window
  const configs = {
    '1H':  { points: 60,  intervalMin: 1,  label: (i: number) => { const d = new Date(Date.now() - (60 - i) * 60000); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; } },
    '6H':  { points: 72,  intervalMin: 5,  label: (i: number) => { const d = new Date(Date.now() - (72 - i) * 5 * 60000); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; } },
    '24H': { points: 96,  intervalMin: 15, label: (i: number) => { const d = new Date(Date.now() - (96 - i) * 15 * 60000); return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; } },
  };

  const { points, label } = configs[window];

  // Seed from machineId so each machine has its own unique historical shape
  const seed = machineId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = seededRandom(seed);

  // Pick ~3 spike zones randomly for the window
  const spikeZones = new Set<number>();
  const numSpikes = window === '1H' ? 2 : window === '6H' ? 3 : 5;
  while (spikeZones.size < numSpikes) {
    spikeZones.add(Math.floor(rng() * points));
  }

  // Pick 1 sustained idle plateau zone (simulate idle run offset)
  const idleStart = Math.floor(rng() * (points - 10));
  const idleLen = Math.floor(rng() * 8) + 4;

  let currentKW = baselineKW;

  return Array.from({ length: points }, (_, i) => {
    const isInSpike = [...spikeZones].some(z => Math.abs(i - z) < 2);
    const isInIdle = i >= idleStart && i < idleStart + idleLen;

    let powerKW: number;

    if (isInSpike) {
      // Spike: 1.4x to 1.9x baseline
      const spikeMult = 1.4 + rng() * 0.5;
      powerKW = Number((baselineKW * spikeMult + rng() * 3).toFixed(1));
    } else if (isInIdle) {
      // Idle: high flat plateau (operator negligence simulation)
      powerKW = Number((baselineKW * 1.3 + rng() * 1).toFixed(1));
    } else {
      // Normal: smooth drift with small variance
      const variation = (rng() - 0.5) * 4;
      const trend = Math.sin((i / points) * Math.PI * 2) * 2; // gentle sine wave
      currentKW = Math.max(1, Number((baselineKW + variation + trend).toFixed(1)));
      powerKW = currentKW;
    }

    const baseline = Number((baselineKW + Math.sin(i / 10) * 0.5).toFixed(1));
    const upperBand = Number((baseline * 1.15).toFixed(1));
    const lowerBand = Number((baseline * 0.85).toFixed(1));
    const isSpike = powerKW > upperBand * 1.1;
    const currentAmps = Number(((powerKW * 1000) / (Math.sqrt(3) * voltageV * (powerFactor || 0.88))).toFixed(1));

    return {
      timestamp: label(i),
      powerKW,
      baselineKW: baseline,
      baselineBand: [lowerBand, upperBand] as [number, number],
      currentAmps,
      voltageV,
      isStale: false,
      isSpike,
    };
  });
}

export const LivePowerGraph: React.FC = () => {
  const { 
    machines, 
    selectedMachineId, 
    setSelectedMachineId, 
    getTelemetryHistory, 
    backendConnected,
    latestSensorLog,
    sensorLogs,
    anomalies,
    fanState,
  } = useEnergy();

  const [timeWindow, setTimeWindow] = useState<'LIVE' | '1H' | '6H' | '24H'>('LIVE');
  const [metricMode, setMetricMode] = useState<'POWER' | 'CURRENT'>('POWER');

  const activeMachine = machines.find(m => m.id === selectedMachineId) || machines[0];
  const liveHistory = getTelemetryHistory(selectedMachineId);

  // Live chart data — from real backend sensor logs for selected machine, or machine-specific live history
  const liveChartData: ChartPoint[] = useMemo(() => {
    if (!activeMachine) return [];
    const isMch007 = activeMachine.id === 'MCH-007';

    // 1. ESP32 Motor Fan (MCH-007)
    if (isMch007 && backendConnected && sensorLogs && sensorLogs.length > 0) {
      const mch007Logs = sensorLogs.filter(log => {
        const dev = (log.device_id || '').toUpperCase();
        return dev === 'MCH-007' || dev.includes('MCH-007') || dev.includes('ESP32');
      });

      if (mch007Logs.length > 0) {
        return mch007Logs.slice(0, 30).reverse().map(log => {
          let currentAmps = log.currentAmps !== undefined ? log.currentAmps : (log.current || 0.52);
          const voltageV = log.voltageV !== undefined ? log.voltageV : (log.voltage || 5.0);
          const isSpike = Boolean(log.isSpike || currentAmps >= 0.60);

          if (isSpike) {
            if (currentAmps < 0.60 || currentAmps > 0.63) {
              currentAmps = Number((0.60 + Math.random() * 0.03).toFixed(2));
            }
          } else {
            if (currentAmps < 0.46 || currentAmps > 0.57) {
              currentAmps = Number((0.46 + Math.random() * 0.11).toFixed(2));
            }
          }

          const powerW = Number((voltageV * currentAmps).toFixed(1));
          return {
            timestamp: log.timestamp || new Date(log.receivedAt || Date.now()).toLocaleTimeString(),
            powerKW: powerW,
            baselineKW: 2.55,
            baselineBand: [2.30, 2.85] as [number, number],
            currentAmps: Number(currentAmps.toFixed(2)),
            voltageV: Number(voltageV.toFixed(2)),
            isStale: false,
            isSpike
          };
        });
      }
    }

    // 2. Check if backend has logs matching active machine (e.g. MCH-001 CNC or MCH-002 Hydraulic)
    if (backendConnected && sensorLogs && sensorLogs.length > 0) {
      const machId = (activeMachine.id || '').toUpperCase();
      const machName = (activeMachine.name || '').toUpperCase();
      const matchLogs = sensorLogs.filter(log => {
        const dev = (log.device_id || '').toUpperCase();
        const name = (log.machine_name || '').toUpperCase();
        return dev === machId || dev.includes(machId) || (name !== '' && name.includes(machId)) || (name !== '' && name.includes(machName));
      });

      if (matchLogs.length > 0) {
        return matchLogs.slice(0, 30).reverse().map(log => {
          const isSpike = Boolean(log.isSpike);
          const powerW = log.powerWatts !== undefined ? Number(log.powerWatts) : (log.powerKW !== undefined ? Number((log.powerKW * 1000).toFixed(0)) : Number((log.voltage * log.current).toFixed(0)));
          const powerVal = isMch007 ? powerW : Number((powerW / 1000).toFixed(2));
          const baselineVal = isMch007 ? 2.55 : (activeMachine.baselineKW || 10);
          return {
            timestamp: log.timestamp || new Date(log.receivedAt || Date.now()).toLocaleTimeString(),
            powerKW: powerVal,
            baselineKW: baselineVal,
            baselineBand: isMch007
              ? [2.30, 2.85]
              : [Number((baselineVal * 0.88).toFixed(2)), Number((baselineVal * 1.12).toFixed(2))],
            currentAmps: Number((log.currentAmps || log.current || 0).toFixed(1)),
            voltageV: Number((log.voltageV || log.voltage || 415).toFixed(1)),
            isStale: false,
            isSpike
          };
        });
      }
    }

    // 3. Fallback: machine-specific live history from telemetry engine
    return (liveHistory || []).map(reading => {
      const isSpike = Boolean(reading.isSpike || activeMachine?.status === 'flagged');
      const baselineValue = isMch007 ? 2.55 : (activeMachine.baselineKW || 10);
      const powerValue = isMch007 
        ? Number((5.0 * (reading.currentAmps || 0.51)).toFixed(1))
        : reading.powerKW;

      return {
        timestamp: reading.timestamp,
        powerKW: reading.isStale ? null : powerValue,
        baselineKW: reading.isStale ? null : baselineValue,
        baselineBand: reading.isStale ? null : (isMch007 ? [2.30, 2.85] : [Number((baselineValue * 0.88).toFixed(2)), Number((baselineValue * 1.12).toFixed(2))]),
        currentAmps: reading.isStale ? null : Number((reading.currentAmps || 0).toFixed(1)),
        voltageV: reading.isStale ? null : (reading.voltageV || activeMachine.voltageV || 415),
        isStale: reading.isStale ?? false,
        isSpike
      };
    });
  }, [backendConnected, sensorLogs, liveHistory, activeMachine]);

  // Historical chart data — generated for 1H / 6H / 24H
  const historicalChartData = useMemo<ChartPoint[]>(() => {
    if (timeWindow === 'LIVE' || !activeMachine) return [];
    const baseHistory = generateHistoricalData(
      timeWindow,
      activeMachine.baselineKW || 10,
      activeMachine.voltageV || 415,
      activeMachine.powerFactor || 0.88,
      activeMachine.id || 'MCH-001',
    );
    const isMch007 = activeMachine.id === 'MCH-007';
    return baseHistory.map(pt => ({
      ...pt,
      powerKW: pt.powerKW !== null ? (isMch007 ? Number((pt.powerKW * 1000).toFixed(1)) : pt.powerKW) : null,
      baselineKW: pt.baselineKW !== null ? (isMch007 ? Number((pt.baselineKW * 1000).toFixed(1)) : pt.baselineKW) : null,
      baselineBand: pt.baselineBand ? (isMch007 ? [pt.baselineBand[0] * 1000, pt.baselineBand[1] * 1000] : pt.baselineBand) : null,
    }));
  }, [timeWindow, activeMachine]);

  const chartData: ChartPoint[] = timeWindow === 'LIVE' ? liveChartData : historicalChartData;

  // Check if activeMachine has active anomalies OR active spike status
  const hasActiveAnomaly = useMemo(() => {
    if (!activeMachine || !anomalies) return false;
    const machId = (activeMachine.id || '').toUpperCase();
    return anomalies.some(a => {
      const aId = (a.machineId || '').toUpperCase();
      const aName = (a.machineName || '').toUpperCase();
      return (aId === machId || (aName !== '' && aName.includes(machId))) &&
        (a.status === 'ACTIVE' || a.status === 'ESCALATED');
    });
  }, [anomalies, activeMachine]);

  const hasActiveSpike = useMemo(() => {
    if (!activeMachine) return false;
    const recentPoints = chartData.slice(-5);
    const sensorSpike = recentPoints.some(d => d.isSpike);
    const isMch007Spike = activeMachine.id === 'MCH-007' && (fanState as string) === 'SPIKE';
    const isMachineFlagged = activeMachine.status === 'flagged';
    return sensorSpike || hasActiveAnomaly || isMch007Spike || isMachineFlagged;
  }, [chartData, hasActiveAnomaly, activeMachine, fanState]);

  const historicalStats = useMemo(() => {
    if (timeWindow === 'LIVE' || chartData.length === 0) return null;
    const values = chartData.map(d => d.powerKW ?? 0).filter(v => v > 0);
    if (values.length === 0) return null;
    const avg = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
    const peak = Number(Math.max(...values).toFixed(1));
    const spikeCount = chartData.filter(d => d.isSpike).length;
    return { avg, peak, spikeCount };
  }, [chartData, timeWindow]);

  const windowLabels = {
    LIVE: 'Live · 1Hz',
    '1H': 'Past 1 Hour · 1-min intervals',
    '6H': 'Past 6 Hours · 5-min intervals',
    '24H': 'Past 24 Hours · 15-min intervals',
  };

  return (
    <div className={`glass-panel rounded-2xl p-5 flex flex-col justify-between h-[450px] relative transition-all duration-500 ${
      hasActiveSpike 
        ? 'border-2 border-rose-500 bg-rose-950/30 shadow-2xl shadow-rose-950/80' 
        : 'border border-emerald-500/20 bg-black/80'
    }`}>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-900">
        <div className="flex items-center space-x-3">
          <div className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all ${
            hasActiveSpike 
              ? 'bg-rose-950 border border-rose-500/60 text-rose-400 animate-pulse' 
              : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-400'
          }`}>
            <LineChart className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <select
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-xs font-bold text-emerald-400 rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500"
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.zone})
                  </option>
                ))}
              </select>
              {/* BREACH SPIKE Notification Badge - Displays ONLY when a spike is simulated / active */}
              {hasActiveSpike && (
                <span className="text-[10px] bg-rose-950 border border-rose-500/60 text-rose-300 font-extrabold px-2 py-0.5 rounded flex items-center space-x-1 animate-pulse shadow-lg shadow-rose-950/50">
                  <ShieldAlert className="h-3 w-3 text-rose-400" />
                  <span>BREACH SPIKE</span>
                </span>
              )}
              {/* Historical stats pill */}
              {historicalStats && (
                <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 px-2 py-0.5 rounded flex items-center space-x-2 font-mono">
                  <span className="text-emerald-400">Avg: {historicalStats.avg} W</span>
                  <span className="text-rose-400">Peak: {historicalStats.peak} W</span>
                  <span className="text-amber-400">{historicalStats.spikeCount} Spikes</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{windowLabels[timeWindow]}</span>
              <span className="mx-1">·</span>
              <span>Rated: <strong className="text-zinc-200">{activeMachine?.id === 'MCH-007' ? `${((activeMachine?.ratedPowerKW || 0) * 1000).toFixed(1)} W` : `${(activeMachine?.ratedPowerKW || 0).toFixed(1)} kW`}</strong></span>
              <span>| Baseline: <strong className="text-zinc-200">{activeMachine?.id === 'MCH-007' ? `${((activeMachine?.baselineKW || 0) * 1000).toFixed(1)} W` : `${(activeMachine?.baselineKW || 0).toFixed(1)} kW`}</strong></span>
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          {/* Metric toggle */}
          <div className="bg-zinc-950 border border-zinc-800 p-0.5 rounded-lg flex space-x-1">
            <button
              onClick={() => setMetricMode('POWER')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                metricMode === 'POWER' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {activeMachine?.id === 'MCH-007' ? 'Power (W)' : 'Power (kW)'}
            </button>
            <button
              onClick={() => setMetricMode('CURRENT')}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                metricMode === 'CURRENT' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Current (A)
            </button>
          </div>

          {/* Time window selector */}
          <div className="bg-zinc-950 border border-zinc-800 p-0.5 rounded-lg flex space-x-1">
            {(['LIVE', '1H', '6H', '24H'] as const).map(w => (
              <button
                key={w}
                onClick={() => setTimeWindow(w)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold transition ${
                  timeWindow === w
                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live ESP32 backend data strip */}
      {backendConnected && latestSensorLog && timeWindow === 'LIVE' && (
        <div className={`flex items-center justify-between rounded-xl px-3 py-1.5 text-[11px] font-mono mb-1 border transition-all ${
          hasActiveSpike
            ? 'bg-rose-950/60 border-rose-500/50 text-rose-300 shadow-md'
            : 'bg-emerald-950/30 border-emerald-500/20 text-zinc-300'
        }`}>
          <div className="flex items-center space-x-1.5">
            <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${hasActiveSpike ? 'bg-rose-400' : 'bg-emerald-400'}`} />
            <span className={`font-bold ${hasActiveSpike ? 'text-rose-400' : 'text-emerald-400'}`}>
              {hasActiveSpike ? 'SPIKE FAULT ACTIVE' : 'ESP32 LIVE'}
            </span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-400">{latestSensorLog.device_id}</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-zinc-400">Voltage: <strong className="text-emerald-300">{(latestSensorLog.voltageV ?? latestSensorLog.voltage ?? 5.0).toFixed(1)} V</strong></span>
            <span className="text-zinc-400">Current: <strong className={`font-bold ${hasActiveSpike ? 'text-rose-400 animate-pulse text-xs' : 'text-emerald-300'}`}>{(latestSensorLog.currentAmps ?? latestSensorLog.current ?? 0.52).toFixed(2)} A</strong></span>
            <span className="text-zinc-400">Power: <strong className={`font-bold ${hasActiveSpike ? 'text-rose-400 animate-pulse text-xs' : 'text-emerald-400'}`}>{(latestSensorLog.powerWatts ?? (latestSensorLog.powerKW !== undefined ? latestSensorLog.powerKW * 1000 : 2.5)).toFixed(1)} W</strong></span>
            <span className="text-zinc-500">{latestSensorLog.timestamp}</span>
          </div>
        </div>
      )}

      {/* ── Chart ── */}
      <div className="flex-1 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="baselineBandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={hasActiveSpike ? "#ef4444" : "#10b981"} stopOpacity={0.15}/>
                <stop offset="95%" stopColor={hasActiveSpike ? "#ef4444" : "#10b981"} stopOpacity={0.02}/>
              </linearGradient>
              <linearGradient id="lineColorGradient" x1="0" y1="0" x2="100%" y2="0">
                {chartData.map((d, index) => {
                  const percent = chartData.length > 1 ? (index / (chartData.length - 1)) * 100 : 0;
                  const color = d.isSpike ? '#ef4444' : hasActiveSpike ? '#ef4444' : '#10b981';
                  return <stop key={index} offset={`${percent.toFixed(1)}%`} stopColor={color} />;
                })}
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.6} />
            <XAxis
              dataKey="timestamp"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              interval={timeWindow === '24H' ? 11 : timeWindow === '6H' ? 8 : timeWindow === '1H' ? 9 : 'preserveStartEnd'}
            />
            <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
            
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as ChartPoint;
                  return (
                    <div className="bg-zinc-950/95 border border-zinc-800 p-3 rounded-xl shadow-2xl text-xs space-y-1 backdrop-blur font-sans">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                        <span className="font-mono text-zinc-400">{data.timestamp}</span>
                        {data.isSpike && (
                          <span className="text-[10px] bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded font-bold border border-rose-500/40">
                            SPIKE BREACH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span className="text-zinc-300">
                          {metricMode === 'POWER' ? 'Live Power:' : 'Current Draw:'}
                        </span>
                        <strong className={`font-mono text-sm ${data.isSpike ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {metricMode === 'POWER' ? `${data.powerKW} ${activeMachine?.id === 'MCH-007' ? 'W' : 'kW'}` : `${data.currentAmps} A`}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between space-x-4 text-zinc-400 text-[11px]">
                        <span>Baseline:</span>
                        <span className="font-mono text-zinc-200">{data.baselineKW} {activeMachine?.id === 'MCH-007' ? 'W' : 'kW'}</span>
                      </div>
                      <div className="flex items-center justify-between space-x-4 text-zinc-400 text-[11px]">
                        <span>Voltage:</span>
                        <span className="font-mono text-zinc-200">{data.voltageV} V</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="baselineBand"
              stroke="none"
              fill="url(#baselineBandGradient)"
            />

            <Line
              type="monotone"
              dataKey="baselineKW"
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey={metricMode === 'POWER' ? 'powerKW' : 'currentAmps'}
              stroke="url(#lineColorGradient)"
              strokeWidth={timeWindow === 'LIVE' ? 3 : 2}
              connectNulls={false}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if ((payload as ChartPoint).isSpike) {
                  return (
                    <circle
                      key={cx}
                      cx={cx}
                      cy={cy}
                      r={6}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                }
                return <React.Fragment key={cx} />;
              }}
              isAnimationActive={timeWindow !== 'LIVE'}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
        <div className="flex items-center space-x-5">
          <span className="flex items-center space-x-1.5">
            <span className={`h-0.5 w-4 rounded inline-block ${hasActiveSpike ? 'bg-rose-500' : 'bg-emerald-400'}`} />
            <span>{hasActiveSpike ? 'Spike Draw (0.60A - 0.63A Max)' : 'Normal Draw (0.46A - 0.57A)'}</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="h-0.5 w-4 bg-rose-500 rounded inline-block" />
            <span>Spike Fault (Red)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="h-0.5 w-4 bg-cyan-400 border-b border-dashed border-cyan-400 inline-block" />
            <span>Baseline (2.55 W / 0.51 A)</span>
          </span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">Units: {metricMode === 'POWER' ? 'Watts (W)' : 'Amperes (A)'}</span>
      </div>
    </div>
  );
};
