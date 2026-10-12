import React from 'react';
import { 
  AlertOctagon, 
  Clock, 
  IndianRupee, 
  CheckCircle2, 
  Power, 
  UserCheck
} from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const ActiveAlertsPanel: React.FC = () => {
  const { 
    anomalies, 
    openOperatorModal, 
    openKillSwitchModal, 
    machines,
    setActiveTab 
  } = useEnergy();

  const activeAlerts = anomalies.filter(a => a.status === 'ACTIVE' || a.status === 'ESCALATED');

  return (
    <div className="glass-panel-alert rounded-2xl p-4 flex flex-col justify-between h-[225px] relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <AlertOctagon className="h-4 w-4 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center space-x-1.5">
              <span>ACTIVE PROBLEM LOG</span>
              <span className="text-[10px] bg-rose-900/80 text-rose-200 px-1.5 py-0.2 rounded border border-rose-500/40 font-mono">
                {activeAlerts.length} Unresolved
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">Human-in-the-Loop SLA & Kill Switch Control</p>
          </div>
        </div>

        <button 
          onClick={() => setActiveTab('alerts')}
          className="text-[11px] text-rose-400 hover:text-rose-200 font-semibold transition"
        >
          Manage All
        </button>
      </div>

      <div className="overflow-y-auto space-y-2.5 my-2 pr-1">
        {activeAlerts.length === 0 ? (
          <div className="h-28 flex flex-col items-center justify-center text-xs text-slate-400">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-1" />
            <span>Zero unaddressed energy anomalies.</span>
            <span className="text-[10px] text-slate-500">All machine baselines within normal limits.</span>
          </div>
        ) : (
          activeAlerts.map(alert => {
            const targetMachine = machines.find(m => m.id === alert.machineId);
            
            const remainingMs = Math.max(0, alert.slaDeadlineMs - Date.now());
            const remainingMins = Math.floor(remainingMs / 60000);
            const remainingSecs = Math.floor((remainingMs % 60000) / 1000);
            const isEscalated = alert.status === 'ESCALATED' || remainingMs === 0;

            return (
              <div 
                key={alert.id}
                className="bg-slate-900/90 border border-rose-500/30 p-2.5 rounded-xl transition hover:border-rose-500/60 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-100">{alert.machineName}</span>
                    <span className="text-[10px] text-slate-400">({alert.zone})</span>
                  </div>

                  <div className="flex items-center space-x-1 font-mono text-xs font-black text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">
                    <IndianRupee className="h-3 w-3" />
                    <span>+{alert.excessCostINR.toFixed(2)} Excess</span>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300">
                    Spike: <strong className="text-rose-400">{alert.peakKW} kW</strong> (Baseline: {alert.baselineKW} kW)
                  </span>

                  <div className="flex items-center space-x-1 font-mono text-[10px]">
                    <Clock className={`h-3 w-3 ${isEscalated ? 'text-rose-500 animate-spin' : 'text-amber-400'}`} />
                    <span className={isEscalated ? 'text-rose-400 font-bold' : 'text-amber-300'}>
                      {isEscalated ? 'SLA BREACH (Escalated)' : `${remainingMins}m ${remainingSecs}s SLA`}
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${isEscalated ? 'bg-rose-600 animate-pulse' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, (remainingMs / (10 * 60 * 1000)) * 100)}%` }}
                  />
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    onClick={() => openOperatorModal(alert)}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition"
                  >
                    <UserCheck className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Classify Action</span>
                  </button>

                  {targetMachine && (
                    <button
                      onClick={() => openKillSwitchModal(targetMachine)}
                      className="text-[11px] bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-500/50 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-bold transition shadow-sm"
                    >
                      <Power className="h-3.5 w-3.5 text-rose-400" />
                      <span>Kill Switch</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="text-[10px] text-slate-500 border-t border-slate-800/60 pt-1 flex items-center justify-between">
        <span>Auto-Escalation SLA Window: 10 Minutes</span>
        <span className="text-rose-400 font-bold">Immutable Response Trail</span>
      </div>
    </div>
  );
};
