import React, { useState } from 'react';
import { Lightbulb, ChevronRight, Zap, Thermometer, Clock, TrendingDown, BatteryCharging, Wrench } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

interface Suggestion {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  impact: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'SAVINGS' | 'MAINTENANCE' | 'OPTIMIZATION';
}

export const SuggestionBox: React.FC = () => {
  const { machines, anomalies } = useEnergy();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const flaggedCount = machines.filter(m => m.status === 'flagged').length;
  const idleCount = machines.filter(m => m.status === 'idle').length;
  const activeAnomalies = anomalies.filter(a => a.status === 'ACTIVE' || a.status === 'ESCALATED').length;

  // Dynamic suggestions based on real machine state
  const suggestions: Suggestion[] = [
    ...(idleCount > 0 ? [{
      id: 'sug-1',
      icon: <BatteryCharging className="h-4 w-4" />,
      title: `Power Down ${idleCount} Idle Machine${idleCount > 1 ? 's' : ''}`,
      description: `${idleCount} machine${idleCount > 1 ? 's are' : ' is'} in idle state drawing phantom load. Shutting them down during non-production hours can save ₹120–₹350/day.`,
      impact: `Save up to ₹350/day`,
      priority: 'MEDIUM' as const,
      category: 'SAVINGS' as const,
    }] : []),
    ...(flaggedCount > 0 ? [{
      id: 'sug-2',
      icon: <Wrench className="h-4 w-4" />,
      title: `Service ${flaggedCount} Flagged Machine${flaggedCount > 1 ? 's' : ''}`,
      description: `Flagged machines are operating 30–45% above baseline power draw. Schedule preventive maintenance to avoid breakdowns and reduce excess energy waste.`,
      impact: `Prevent ₹2,000+ in damage`,
      priority: 'HIGH' as const,
      category: 'MAINTENANCE' as const,
    }] : []),
    {
      id: 'sug-3',
      icon: <Clock className="h-4 w-4" />,
      title: 'Shift Heavy Loads to Off-Peak Hours',
      description: 'Running high-draw equipment (CNC, Hydraulic Press) during off-peak tariff windows (10 PM–6 AM) can reduce per-unit energy cost by up to 15%.',
      impact: 'Reduce bill by ₹1,800/mo',
      priority: 'MEDIUM',
      category: 'OPTIMIZATION',
    },
    {
      id: 'sug-4',
      icon: <Thermometer className="h-4 w-4" />,
      title: 'Optimize Compressor Cycling',
      description: 'Air compressors show frequent start-stop inrush spikes. Install VFD drives or adjust pressure bands to reduce startup energy surges by 25–40%.',
      impact: 'Cut inrush waste 35%',
      priority: 'LOW',
      category: 'OPTIMIZATION',
    },
    {
      id: 'sug-5',
      icon: <TrendingDown className="h-4 w-4" />,
      title: 'Improve Power Factor to 0.95+',
      description: 'Several machines are operating with PF below 0.90. Adding capacitor banks can eliminate reactive power penalties and improve billing efficiency.',
      impact: 'Save ₹800–₹1,200/mo',
      priority: 'MEDIUM',
      category: 'SAVINGS',
    },
    ...(activeAnomalies > 0 ? [{
      id: 'sug-6',
      icon: <Zap className="h-4 w-4" />,
      title: `Resolve ${activeAnomalies} Active Anomal${activeAnomalies > 1 ? 'ies' : 'y'}`,
      description: `Unresolved anomalies are actively burning excess energy. Each unattended spike costs ₹2–₹5/minute in wasted power draw above baseline.`,
      impact: `Stop ₹${(activeAnomalies * 3).toFixed(0)}/min waste`,
      priority: 'HIGH' as const,
      category: 'MAINTENANCE' as const,
    }] : []),
  ];

  const priorityColors = {
    HIGH: 'bg-rose-950 text-rose-300 border-rose-500/40',
    MEDIUM: 'bg-amber-950 text-amber-300 border-amber-500/40',
    LOW: 'bg-emerald-950 text-emerald-300 border-emerald-500/40',
  };

  const priorityDot = {
    HIGH: 'bg-rose-400',
    MEDIUM: 'bg-amber-400',
    LOW: 'bg-emerald-400',
  };

  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-col h-[450px] relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 mb-2">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-950 to-amber-900/60 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50">
            <Lightbulb className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
              <span>SMART SUGGESTIONS</span>
              <span className="text-[10px] bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30 font-mono">
                {suggestions.length} Tips
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">AI-powered energy optimization recommendations</p>
          </div>
        </div>
      </div>

      {/* Suggestions List */}
      <div className="overflow-y-auto space-y-2 flex-1 pr-1 custom-scrollbar">
        {suggestions.map((sug) => {
          const isExpanded = expandedId === sug.id;

          return (
            <div
              key={sug.id}
              onClick={() => setExpandedId(isExpanded ? null : sug.id)}
              className="bg-slate-900/80 border border-slate-700/50 hover:border-cyan-500/30 p-3 rounded-xl transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start space-x-2.5">
                {/* Priority indicator dot */}
                <div className="mt-1 flex flex-col items-center space-y-1">
                  <span className={`h-2 w-2 rounded-full ${priorityDot[sug.priority]}`} />
                  <div className="w-px h-4 bg-slate-700/60" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-400 group-hover:text-cyan-300 transition">
                        {sug.icon}
                      </span>
                      <span className="text-[12px] font-bold text-slate-200 group-hover:text-white transition leading-tight">
                        {sug.title}
                      </span>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-200 shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Impact badge */}
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${priorityColors[sug.priority]}`}>
                      {sug.priority}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                      {sug.impact}
                    </span>
                  </div>

                  {/* Expandable description */}
                  {isExpanded && (
                    <p className="text-[11px] text-slate-300/90 mt-2 leading-relaxed border-t border-slate-800/60 pt-2">
                      {sug.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-2 mt-2 flex items-center justify-between">
        <span>Based on live telemetry & machine state</span>
        <span className="text-cyan-400 font-mono font-semibold">Auto-Refreshing</span>
      </div>
    </div>
  );
};
