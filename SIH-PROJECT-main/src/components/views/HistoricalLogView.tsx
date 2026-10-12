import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const HistoricalLogView: React.FC = () => {
  const { anomalies, openOperatorModal } = useEnergy();

  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const filtered = anomalies.filter(a => {
    const matchesSearch = 
      a.machineName.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.type.toLowerCase().includes(search.toLowerCase()) ||
      a.rootCauseDescription.toLowerCase().includes(search.toLowerCase());

    const matchesClass = 
      classificationFilter === 'ALL' ||
      (classificationFilter === 'INTENDED' && a.classification === 'INTENDED') ||
      (classificationFilter === 'UNINTENDED' && a.classification === 'UNINTENDED') ||
      (classificationFilter === 'UNACTIONED' && !a.classification);

    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;

    return matchesSearch && matchesClass && matchesSeverity;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
            <AlertOctagon className="h-6 w-6 text-rose-400" />
            <span>HISTORICAL PROBLEM LOG & ACCOUNTABILITY</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            FR-08 Append-only immutable log of energy irregularities, operator classifications, and SLA track records.
          </p>
        </div>
      </div>

      <div className="glass-panel p-4 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search anomalies by machine, ID, or root cause..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <select
          value={classificationFilter}
          onChange={(e) => setClassificationFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none"
        >
          <option value="ALL">All Classifications</option>
          <option value="INTENDED">Intended (Green)</option>
          <option value="UNINTENDED">Unintended (Red)</option>
          <option value="UNACTIONED">Unactioned / Pending</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-1.5 focus:outline-none"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="WARNING">Warning</option>
        </select>
      </div>

      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Anomaly ID</th>
                <th className="p-3.5">Machine Asset</th>
                <th className="p-3.5">Timestamp</th>
                <th className="p-3.5">Anomaly Type</th>
                <th className="p-3.5">Peak Load</th>
                <th className="p-3.5">Excess Cost</th>
                <th className="p-3.5">AI Confidence</th>
                <th className="p-3.5">Classification</th>
                <th className="p-3.5">Operator Notes</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-sans">
                    No matching anomaly records found.
                  </td>
                </tr>
              ) : (
                filtered.map(item => (
                  <tr key={item.id} className="hover:bg-slate-900/60 transition">
                    <td className="p-3.5 font-bold text-rose-400">{item.id}</td>
                    <td className="p-3.5 font-sans font-semibold text-slate-100">{item.machineName}</td>
                    <td className="p-3.5 text-slate-400 text-[11px]">{item.timestamp}</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        item.severity === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'bg-amber-950 text-amber-300'
                      }`}>
                        {item.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-rose-400">{item.peakKW} kW</td>
                    <td className="p-3.5 text-rose-300 font-bold">₹{item.excessCostINR.toFixed(2)}</td>
                    <td className="p-3.5 text-violet-300">{item.confidenceScore}%</td>
                    <td className="p-3.5 font-sans">
                      {item.classification === 'INTENDED' ? (
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 w-fit">
                          <CheckCircle className="h-3 w-3" />
                          <span>INTENDED</span>
                        </span>
                      ) : item.classification === 'UNINTENDED' ? (
                        <span className="bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 w-fit">
                          <XCircle className="h-3 w-3" />
                          <span>UNINTENDED</span>
                        </span>
                      ) : (
                        <span className="bg-amber-950 text-amber-400 border border-amber-500/40 text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 w-fit animate-pulse">
                          <Clock className="h-3 w-3" />
                          <span>PENDING</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-sans text-slate-300 text-[11px] max-w-[200px] truncate">
                      {item.operatorComment || '—'}
                    </td>
                    <td className="p-3.5 text-right">
                      {item.status === 'ACTIVE' || item.status === 'ESCALATED' ? (
                        <button
                          onClick={() => openOperatorModal(item)}
                          className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[11px] font-bold inline-flex items-center space-x-1 font-sans"
                        >
                          <UserCheck className="h-3 w-3" />
                          <span>Classify</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono flex items-center justify-end space-x-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-500" />
                          <span>IMMUTABLE</span>
                        </span>
                      )}
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
