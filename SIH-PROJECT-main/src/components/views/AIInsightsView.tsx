import React, { useState } from 'react';
import { Sparkles, Cpu, ArrowRight, X, Activity, ShieldAlert } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';
import { SIGNATURE_PROFILES } from '../../services/telemetryEngine';
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

interface StaticChartPoint {
  index: number;
  timestamp: string;
  powerW: number;
  baselineW: number;
  baselineBand: [number, number];
  isSpike: boolean;
  currentA: number;
}

export const AIInsightsView: React.FC = () => {
  const { anomalies, sensorLogs } = useEnergy();
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);

  // Store frozen static snapshots keyed by anomaly ID
  const [frozenSnapshots, setFrozenSnapshots] = useState<Record<string, StaticChartPoint[]>>({});

  const selectedAnomaly = anomalies.find(a => a.id === selectedAnomalyId);

  // Function to freeze a snapshot at the exact moment of button click
  const handleInspectWaveform = (anomalyId: string) => {
    setSelectedAnomalyId(anomalyId);

    // If snapshot is already frozen for this anomaly, keep it frozen
    if (frozenSnapshots[anomalyId]) return;

    const anomalyObj = anomalies.find(a => a.id === anomalyId);
    if (!anomalyObj) return;

    const baseW = Number((anomalyObj.baselineKW * 1000).toFixed(1));
    const peakW = Number((anomalyObj.peakKW * 1000).toFixed(1));

    let snapshotPoints: StaticChartPoint[] = [];

    // Capture frozen slice of current sensor logs if available
    if (sensorLogs && sensorLogs.length > 0) {
      const logsSlice = sensorLogs.slice(0, 15).reverse();
      snapshotPoints = logsSlice.map((log, idx) => {
        const powerW = Number(((log.powerKW || log.power || 0) * 1000).toFixed(1));
        const currentA = Number((log.currentAmps || log.current || 0).toFixed(2));
        const upperBand = Number((baseW * 1.15).toFixed(1));
        const lowerBand = Number((baseW * 0.85).toFixed(1));
        const isSpike = Boolean(log.isSpike || powerW > upperBand * 1.05 || currentA > 2.0);

        return {
          index: idx + 1,
          timestamp: log.timestamp || `t+${idx}s`,
          powerW,
          baselineW: baseW,
          baselineBand: [lowerBand, upperBand] as [number, number],
          isSpike,
          currentA
        };
      });
    } else {
      // Static profile pattern fallback
      const profile = SIGNATURE_PROFILES.find(p => p.anomalyType === anomalyObj.type);
      let rawPoints = profile ? profile.data : [10, 12, 14, 15, 25, 35, 30, 20, 15, 10];
      const maxRaw = Math.max(...rawPoints);
      const minRaw = Math.min(...rawPoints);
      const rawRange = maxRaw - minRaw;

      snapshotPoints = rawPoints.map((val, idx) => {
        let powerW = baseW;
        if (rawRange > 0) {
          powerW = baseW + ((val - minRaw) / rawRange) * (peakW - baseW);
        } else {
          powerW = val * 1000;
        }
        powerW = Number(powerW.toFixed(1));

        const upperBand = Number((baseW * 1.15).toFixed(1));
        const lowerBand = Number((baseW * 0.85).toFixed(1));
        const isSpike = powerW > upperBand * 1.05;
        const currentA = Number((powerW / (5.0 * 0.9)).toFixed(2));

        return {
          index: idx + 1,
          timestamp: `t+${idx}s`,
          powerW,
          baselineW: baseW,
          baselineBand: [lowerBand, upperBand] as [number, number],
          isSpike,
          currentA
        };
      });
    }

    setFrozenSnapshots(prev => ({
      ...prev,
      [anomalyId]: snapshotPoints
    }));
  };

  const staticChartData = selectedAnomalyId ? (frozenSnapshots[selectedAnomalyId] || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-violet-400" />
            <span>AI DIAGNOSTIC ENGINE &amp; CURRENT-SIGNATURE ANALYSIS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            FR-05 / FR-06 Signature pattern analysis distinguishing normal operational variance from mechanical failure.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Section: Anomalies Cards */}
        <div className={`flex-1 w-full space-y-4 transition-all duration-300 ${selectedAnomaly ? 'lg:max-w-[62%]' : ''}`}>
          <div className={`grid grid-cols-1 gap-4 ${selectedAnomaly ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
            {anomalies.map(item => (
              <div 
                key={item.id} 
                className={`glass-panel-ai rounded-2xl p-5 space-y-3 transition border ${
                  selectedAnomalyId === item.id ? 'border-violet-500 bg-slate-900/90 shadow-lg shadow-violet-950/20' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-violet-500/20 pb-2">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-5 w-5 text-violet-400" />
                    <h3 className="text-sm font-bold text-slate-100">{item.machineName}</h3>
                  </div>
                  <span className="text-xs font-mono text-violet-300 font-bold bg-violet-950 px-2.5 py-0.5 rounded border border-violet-500/40">
                    {item.confidenceScore}% Confidence
                  </span>
                </div>

                <div className="text-xs space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Anomaly Classification:</span>
                    <strong className="text-rose-400 font-mono">{item.type.replace(/_/g, ' ')}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Power Draw Peak:</span>
                    <strong className="text-cyan-400 font-mono">{item.peakKW} kW (Baseline: {item.baselineKW} kW)</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Live Excess Cost Ticker:</span>
                    <strong className="text-rose-400 font-mono">₹{item.excessCostINR.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-violet-500/20 space-y-1">
                  <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider block">
                    Pattern Diagnostic Hypothesis
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {item.rootCauseDescription}
                  </p>
                </div>

                <div className="bg-cyan-950/30 p-3 rounded-xl border border-cyan-500/20 space-y-1">
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                    Actionable Remedial Directive
                  </span>
                  <p className="text-xs text-cyan-200">
                    {item.recommendedAction}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      handleInspectWaveform(item.id);
                    }}
                    className={`text-xs font-semibold flex items-center space-x-1 transition ${
                      selectedAnomalyId === item.id ? 'text-cyan-300' : 'text-cyan-400 hover:text-cyan-200'
                    }`}
                  >
                    <span>Inspect Waveform Graph</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Section: Static Waveform Side Panel */}
        {selectedAnomaly && (
          <div className="w-full lg:w-[38%] glass-panel rounded-2xl p-5 space-y-4 border border-slate-800 sticky top-24 animate-in slide-in-from-right-5 duration-300">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-rose-400 animate-pulse" />
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Disputed Waveform Analysis
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Static Capture Anomaly Log</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAnomalyId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selected Machine Metadata */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Appliance:</span>
                <strong className="text-slate-200">{selectedAnomaly.machineName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Anomaly Type:</span>
                <strong className="text-rose-400">{selectedAnomaly.type.replace(/_/g, ' ')}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Captured Peak Draw:</span>
                <strong className="text-cyan-400 font-mono">{(selectedAnomaly.peakKW * 1000).toFixed(1)} W</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Nominal Baseline:</span>
                <strong className="text-slate-400 font-mono">{(selectedAnomaly.baselineKW * 1000).toFixed(1)} W</strong>
              </div>
            </div>

            {/* Static Graph */}
            <div className="h-[200px] w-full bg-[#0a0d13] rounded-xl border border-slate-800/80 p-2 relative flex flex-col justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={staticChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="staticBaselineGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.12}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02}/>
                    </linearGradient>
                    <linearGradient id="staticLineColorGradient" x1="0" y1="0" x2="100%" y2="0">
                      {staticChartData.map((d, index) => {
                        const percent = staticChartData.length > 1 ? (index / (staticChartData.length - 1)) * 100 : 0;
                        const color = d.isSpike ? '#ef4444' : '#10b981';
                        return <stop key={index} offset={`${percent.toFixed(1)}%`} stopColor={color} />;
                      })}
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
                  <XAxis dataKey="timestamp" stroke="#64748b" fontSize={9} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                  
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as StaticChartPoint;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-2xl text-[10px] space-y-1 backdrop-blur font-mono">
                            <div className="text-slate-400 font-bold">{data.timestamp}</div>
                            <div className="flex justify-between space-x-3">
                              <span>Power:</span>
                              <strong className={data.isSpike ? 'text-rose-400' : 'text-emerald-400'}>{data.powerW} W</strong>
                            </div>
                            <div className="flex justify-between space-x-3">
                              <span>Current:</span>
                              <strong className="text-cyan-400">{data.currentA} A</strong>
                            </div>
                            <div className="flex justify-between space-x-3">
                              <span>Baseline:</span>
                              <strong className="text-slate-200">{data.baselineW} W</strong>
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
                    fill="url(#staticBaselineGradient)"
                  />

                  <Line
                    type="monotone"
                    dataKey="baselineW"
                    stroke="#06b6d4"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="powerW"
                    stroke="url(#staticLineColorGradient)"
                    strokeWidth={2}
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if ((payload as StaticChartPoint).isSpike) {
                        return (
                          <circle
                            key={cx}
                            cx={cx}
                            cy={cy}
                            r={3.5}
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                        );
                      }
                      return <React.Fragment key={cx} />;
                    }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center space-x-2 text-[10px] bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-slate-400">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                This graph displays the <strong>captured waveform signature</strong> at the time of the event. All data is static with no live updates.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
