import React from 'react';
import { IndianRupee, TrendingUp, Cpu, CheckCircle2 } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const QuickStatsStrip: React.FC = () => {
  const { billing, machines } = useEnergy();

  const spentPercent = Number(((billing.currentSpendINR / billing.monthlyBudgetINR) * 100).toFixed(1));

  const activeCount = machines.filter(m => m.status === 'active').length;
  const flaggedCount = machines.filter(m => m.status === 'flagged').length;
  const idleCount = machines.filter(m => m.status === 'idle').length;
  const offlineCount = machines.filter(m => m.status === 'offline').length;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 gap-4">
      {/* 1. Current Month Spend */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Current Month Spend</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-zinc-100 font-mono tracking-tight">
            {formatINR(billing.currentSpendINR)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Tariff: <strong className="text-zinc-200">₹{billing.tariffPerKWhINR}/kWh</strong></span>
            <span className="text-emerald-400 font-mono font-medium">{spentPercent}% of Budget</span>
          </div>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, spentPercent)}%` }} 
          />
        </div>
      </div>

      {/* 2. Expected Month-End Bill */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Expected Month-End Bill</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-zinc-100 font-mono tracking-tight">
            {formatINR(billing.projectedSpendINR)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Cycle Days Left: <strong className="text-zinc-200">{billing.billingCycleDaysRemaining} Days</strong></span>
            <span className="text-emerald-400 font-mono">Est. Run-rate</span>
          </div>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (billing.projectedSpendINR / billing.monthlyBudgetINR) * 100)}%` }} 
          />
        </div>
      </div>

      {/* 4. Active Monitored Machines */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/30 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Monitored Assets</span>
          <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Cpu className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-black text-zinc-100 font-mono tracking-tight flex items-baseline space-x-2">
            <span>{activeCount}</span>
            <span className="text-sm font-normal text-zinc-400">/ {machines.length} Active</span>
          </div>
          <div className="mt-1 flex items-center space-x-2 text-[10px] font-medium">
            <span className="bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded flex items-center space-x-1">
              <CheckCircle2 className="h-2.5 w-2.5" />
              <span>{activeCount} Active</span>
            </span>
            {flaggedCount > 0 && (
              <span className="bg-rose-950/80 border border-rose-500/30 text-rose-300 px-1.5 py-0.5 rounded">
                {flaggedCount} Flagged
              </span>
            )}
            <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
              {idleCount} Idle
            </span>
          </div>
        </div>
        <div className="w-full bg-zinc-900 h-1.5 rounded-full mt-3 overflow-hidden flex">
          <div className="bg-emerald-500 h-full" style={{ width: `${(activeCount / (machines.length || 1)) * 100}%` }} />
          <div className="bg-rose-500 h-full" style={{ width: `${(flaggedCount / (machines.length || 1)) * 100}%` }} />
          <div className="bg-amber-500 h-full" style={{ width: `${(idleCount / (machines.length || 1)) * 100}%` }} />
          <div className="bg-zinc-700 h-full" style={{ width: `${(offlineCount / (machines.length || 1)) * 100}%` }} />
        </div>
      </div>
    </div>
  );
};
