import React from 'react';
import { FileText, BarChart3, Leaf, Zap } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const ReportsView: React.FC = () => {
  const { machines } = useEnergy();

  const totalKw = machines.reduce((acc, m) => acc + m.currentKW, 0);
  const estimatedKwhDaily = totalKw * 18;
  const co2TonsDaily = (estimatedKwhDaily * 0.85) / 1000;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
            <FileText className="h-6 w-6 text-cyan-400" />
            <span>EXECUTIVE REPORTS & ANALYTICS</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time compliance analytics for energy audits and carbon footprint verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Connected Capacity</span>
            <Zap className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black font-mono text-cyan-400">
            {machines.reduce((a, m) => a + m.ratedPowerKW, 0)} kW
          </div>
          <p className="text-[11px] text-slate-400">Sum of nameplate ratings for monitored appliances</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Est. Daily Energy Consumption</span>
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-100">
            {estimatedKwhDaily.toFixed(0)} kWh
          </div>
          <p className="text-[11px] text-slate-400">Based on 18-hour active shift cycle</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Daily Carbon Footprint</span>
            <Leaf className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">
            {co2TonsDaily.toFixed(2)} Tons CO₂
          </div>
          <p className="text-[11px] text-slate-400">Grid carbon intensity multiplier: 0.85 kg/kWh</p>
        </div>
      </div>
    </div>
  );
};
