import React from 'react';
import { Sparkles, CheckCircle, ArrowRight, Cpu } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const AIInsightPanel: React.FC = () => {
  const { anomalies, setSelectedMachineId, setActiveTab } = useEnergy();

  const recentInsights = anomalies.slice(0, 4);

  return (
    <div className="glass-panel-ai rounded-2xl p-4 flex flex-col justify-between h-[215px] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-violet-500/20 pb-2">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-lg bg-violet-950/80 border border-violet-500/40 flex items-center justify-center text-violet-300">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-1">
              <span>AI ROOT-CAUSE ENGINE</span>
              <span className="text-[10px] bg-violet-900/60 text-violet-300 px-1.5 py-0.2 rounded border border-violet-500/30">
                v1.0 Streaming
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Current-Signature Pattern Diagnostic Feed</p>
          </div>
        </div>

        <button 
          onClick={() => setActiveTab('insights')}
          className="text-[11px] text-violet-400 hover:text-violet-200 font-semibold flex items-center space-x-1 transition"
        >
          <span>View All</span>
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      <div className="overflow-y-auto space-y-2.5 my-2 pr-1">
        {recentInsights.length === 0 ? (
          <div className="h-28 flex items-center justify-center text-xs text-slate-500">
            <CheckCircle className="h-4 w-4 text-emerald-400 mr-2" />
            No active mechanical anomalies detected. Baselines nominal.
          </div>
        ) : (
          recentInsights.map(insight => {
            const isCritical = insight.severity === 'CRITICAL';
            
            return (
              <div 
                key={insight.id}
                onClick={() => setSelectedMachineId(insight.machineId)}
                className="bg-slate-900/80 border border-violet-500/20 hover:border-violet-500/50 p-2.5 rounded-xl transition cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Cpu className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs font-bold text-slate-200 group-hover:text-violet-300 transition">
                      {insight.machineName}
                    </span>
                  </div>

                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                    isCritical ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                  }`}>
                    {insight.type.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {insight.rootCauseDescription}
                </p>

                <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-2 flex-1 mr-3">
                    <span className="text-slate-400">Confidence:</span>
                    <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full" 
                        style={{ width: `${insight.confidenceScore}%` }}
                      />
                    </div>
                    <span className="font-mono text-violet-300 font-bold">{insight.confidenceScore}%</span>
                  </div>

                  <span className="text-cyan-400 font-medium truncate max-w-[120px]">
                    Action: {insight.recommendedAction.slice(0, 22)}...
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-1 flex items-center justify-between">
        <span>Signature Analysis: Current Inrush / Friction / Overload</span>
        <span className="text-emerald-400 font-mono">Dynamic Baseline Active</span>
      </div>
    </div>
  );
};
