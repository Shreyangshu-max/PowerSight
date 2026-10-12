import React from 'react';
import { Settings, Shield, Server } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const SettingsView: React.FC = () => {
  const { currentRole, isNetworkGapActive, toggleNetworkGap } = useEnergy();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
          <Settings className="h-6 w-6 text-cyan-400" />
          <span>SYSTEM & PLATFORM CONFIGURATION</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure IoT sensor sampling rates, SLA auto-escalation windows, and Role-Based Access Controls (RBAC).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Server className="h-4 w-4 text-cyan-400" />
            <span>IoT Gateway Telemetry Config</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Minimum Telemetry Sampling Rate:</span>
              <span className="font-mono text-cyan-400 font-bold bg-slate-900 px-2 py-1 rounded">1 Hz (1 Second)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Local Edge Buffer Holding Window:</span>
              <span className="font-mono text-slate-200 bg-slate-900 px-2 py-1 rounded">72 Hours</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Device-to-Cloud Encryption:</span>
              <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-1 rounded">TLS 1.3 Active</span>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-slate-300">Simulate Connectivity Disruption:</span>
              <button
                onClick={toggleNetworkGap}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  isNetworkGapActive ? 'bg-amber-950 text-amber-300 border border-amber-500/50' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isNetworkGapActive ? 'Network Gap ON' : 'Network Gap OFF'}
              </button>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Shield className="h-4 w-4 text-violet-400" />
            <span>SLA & Role-Based Access Controls</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Default Anomaly Action SLA:</span>
              <span className="font-mono text-rose-400 font-bold bg-slate-900 px-2 py-1 rounded">10 Minutes</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Active Persona Role:</span>
              <span className="font-mono text-cyan-300 font-bold bg-slate-900 px-2 py-1 rounded">{currentRole}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Remote Kill-Switch Confirmation:</span>
              <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-1 rounded">2-Step Mandatory</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Audit Trail Immutability:</span>
              <span className="font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-1 rounded">Cryptographic SHA-256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
