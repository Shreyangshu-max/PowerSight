import React from 'react';
import { ShieldCheck, Power, CheckCircle2 } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const AuditTrailView: React.FC = () => {
  const { controlActions } = useEnergy();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <span>IMMUTABLE CONTROL AUDIT TRAIL</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            FR-10 Cryptographically logged remote kill-switch executions and system configuration modifications.
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Action ID</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Target Asset</th>
                <th className="p-3.5">Control Action</th>
                <th className="p-3.5">Operator Identity</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Confirmation Gate</th>
                <th className="p-3.5">Load at Action</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Reason Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {controlActions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-sans">
                    No remote kill-switch control actions logged yet.
                  </td>
                </tr>
              ) : (
                controlActions.map(act => (
                  <tr key={act.id} className="hover:bg-slate-900/60 transition">
                    <td className="p-3.5 font-bold text-cyan-400">{act.id}</td>
                    <td className="p-3.5 text-slate-400 text-[11px]">{act.timestamp}</td>
                    <td className="p-3.5 font-sans font-bold text-slate-100">{act.machineName}</td>
                    <td className="p-3.5">
                      <span className="bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 w-fit">
                        <Power className="h-3 w-3" />
                        <span>KILL SWITCH</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-sans text-slate-200">{act.performedBy}</td>
                    <td className="p-3.5 font-sans text-slate-400">{act.role}</td>
                    <td className="p-3.5 text-cyan-300 text-[10px]">{act.confirmationMethod}</td>
                    <td className="p-3.5 text-rose-400 font-bold">{act.machineLoadAtActionKW} kW</td>
                    <td className="p-3.5">
                      <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>ACK SUCCESS</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-sans text-slate-300 text-[11px] max-w-[200px] truncate">
                      {act.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
