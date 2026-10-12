import React, { useState } from 'react';
import { CheckCircle, XCircle, UserCheck, Lock, X } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const OperatorFeedbackModal: React.FC = () => {
  const { 
    operatorModalAnomaly, 
    closeOperatorModal, 
    submitOperatorResponse, 
    currentRole 
  } = useEnergy();

  const [classification, setClassification] = useState<'INTENDED' | 'UNINTENDED'>('INTENDED');
  const [comment, setComment] = useState<string>('');

  if (!operatorModalAnomaly) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOperatorResponse(operatorModalAnomaly.id, classification, comment);
  };

  return (
    <div className="fixed inset-[#00000080] bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                Operator Accountability Prompt
              </h3>
              <p className="text-[11px] text-slate-400">FR-07 Human-in-the-Loop Anomaly Classification</p>
            </div>
          </div>

          <button 
            onClick={closeOperatorModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-slate-950/80 border border-rose-500/30 p-3.5 rounded-xl space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-rose-400 font-bold">{operatorModalAnomaly.machineName}</span>
            <span className="text-slate-400">{operatorModalAnomaly.timestamp}</span>
          </div>
          <div className="text-slate-300 font-sans">
            Spike Peak: <strong className="text-rose-400 font-mono">{operatorModalAnomaly.peakKW} kW</strong> (Baseline: {operatorModalAnomaly.baselineKW} kW)
          </div>
          <p className="text-[11px] text-slate-400 font-sans">
            {operatorModalAnomaly.rootCauseDescription}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">
              1. Classify Event Operational Intent *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setClassification('INTENDED')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  classification === 'INTENDED'
                    ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                <span className="text-xs font-bold uppercase">Intended Event</span>
                <span className="text-[10px] text-slate-400">Scheduled load, startup, tooling changes</span>
              </button>

              <button
                type="button"
                onClick={() => setClassification('UNINTENDED')}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                  classification === 'UNINTENDED'
                    ? 'bg-rose-950/90 border-rose-500 text-rose-300 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <XCircle className="h-5 w-5 text-rose-400" />
                <span className="text-xs font-bold uppercase">Unintended Anomaly</span>
                <span className="text-[10px] text-slate-400">Mechanical drag, leak, operational waste</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              2. Operator Diagnosis Notes & Remedial Actions
            </label>
            <textarea
              rows={3}
              required
              placeholder="Provide reason for power breach or corrective action steps taken..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Lock className="h-3.5 w-3.5 text-cyan-400" />
              <span>Submission User: <strong className="text-slate-200">{currentRole}</strong></span>
            </div>
            <span className="text-rose-400 font-semibold text-[10px] uppercase tracking-wider">
              Strictly Immutable
            </span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={closeOperatorModal}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-black hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
            >
              Submit Immutable Classification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
