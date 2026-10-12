import React, { useState } from 'react';
import { Power, AlertOctagon, RefreshCw, X, Lock } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const RemoteKillSwitchModal: React.FC = () => {
  const { killSwitchMachine, closeKillSwitchModal, executeKillSwitch, currentRole } = useEnergy();

  const [step, setStep] = useState<1 | 2>(1);
  const [typedConfirmation, setTypedConfirmation] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!killSwitchMachine) return null;

  const isConfirmationMatched = 
    typedConfirmation.trim().toUpperCase() === killSwitchMachine.name.toUpperCase();

  const handleConfirmShutdown = async () => {
    if (!isConfirmationMatched) {
      setErrorMessage(`Confirmation mismatch! You must type "${killSwitchMachine.name}" exactly.`);
      return;
    }

    setIsExecuting(true);
    setErrorMessage('');

    try {
      const success = await executeKillSwitch(killSwitchMachine.id, typedConfirmation, reason);
      if (!success) {
        setErrorMessage('Execution failed! Server rejected control payload.');
        setIsExecuting(false);
      }
    } catch (err) {
      setErrorMessage('Network or gateway response failure during kill-switch command.');
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-[#00000080] bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-rose-500/30 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="h-10 w-10 rounded-xl bg-rose-950 border border-rose-500 flex items-center justify-center text-rose-400 animate-pulse">
              <Power className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
                <span>REMOTE POWER KILL-SWITCH</span>
                <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40">
                  Step {step} of 2 Gate
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">FR-09 / NFR 9.3 Safe Power Isolation Protocol</p>
            </div>
          </div>

          <button 
            disabled={isExecuting}
            onClick={closeKillSwitchModal}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-rose-950/40 border border-rose-500/40 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                <AlertOctagon className="h-5 w-5 text-rose-400 shrink-0" />
                <span>CRITICAL POWER ISOLATION WARNING</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Executing remote kill-switch will <strong className="text-rose-400">immediately cut 415V 3-phase power</strong> to asset <strong className="text-cyan-300 font-mono">{killSwitchMachine.name}</strong>.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2 text-xs font-mono">
              <div className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                Live Asset Telemetry Snapshot
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div>Asset ID: <strong className="text-cyan-400">{killSwitchMachine.id}</strong></div>
                <div>Zone: <strong className="text-slate-100">{killSwitchMachine.zone}</strong></div>
                <div>Live Power Load: <strong className="text-rose-400">{killSwitchMachine.currentKW} kW</strong></div>
                <div>Rated Capacity: <strong className="text-slate-100">{killSwitchMachine.ratedPowerKW} kW</strong></div>
                <div>Current Draw: <strong className="text-slate-100">{killSwitchMachine.currentAmps} A</strong></div>
                <div>Voltage Line: <strong className="text-slate-100">{killSwitchMachine.voltageV} V</strong></div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={closeKillSwitchModal}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/30 flex items-center space-x-2"
              >
                <span>Proceed to Step 2 Gate</span>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-200 block">
                To confirm emergency power isolation, type exact machine name:
              </label>
              <div className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-center font-mono font-black text-sm text-cyan-400 tracking-wider">
                {killSwitchMachine.name}
              </div>

              <input
                type="text"
                disabled={isExecuting}
                placeholder={`Type "${killSwitchMachine.name}" here...`}
                value={typedConfirmation}
                onChange={(e) => {
                  setTypedConfirmation(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full mt-2 p-2.5 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">
                Reason for Isolation (Audit Log Entry) *
              </label>
              <input
                type="text"
                disabled={isExecuting}
                placeholder="E.g. Emergency lubrication line failure / Overheat risk"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-500 text-rose-300 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {isExecuting && (
              <div className="bg-rose-950/80 border border-rose-500/50 p-3.5 rounded-xl flex items-center space-x-3 text-rose-300 text-xs font-mono">
                <RefreshCw className="h-5 w-5 animate-spin text-rose-400 shrink-0" />
                <div>
                  <span className="font-bold">Transmitting TLS Encrypted Control Payload...</span>
                  <p className="text-[10px] text-slate-400">3-second safety acknowledgment lock active</p>
                </div>
              </div>
            )}

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Lock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Authorized Role: <strong className="text-slate-200">{currentRole}</strong></span>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">Method: TYPED_NAME</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={isExecuting}
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-200 disabled:opacity-50"
              >
                &larr; Back to Step 1
              </button>

              <button
                type="button"
                disabled={!isConfirmationMatched || isExecuting}
                onClick={handleConfirmShutdown}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  isConfirmationMatched && !isExecuting
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <Power className="h-4 w-4" />
                <span>Confirm Immediate Shutdown</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
