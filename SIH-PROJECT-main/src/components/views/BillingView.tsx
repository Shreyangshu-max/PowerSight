import React from 'react';
import { CreditCard, AlertTriangle, PiggyBank, Zap, Sparkles } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const BillingView: React.FC = () => {
  const { billing, anomalies, controlActions } = useEnergy();

  const spentPercent = Number(((billing.currentSpendINR / billing.monthlyBudgetINR) * 100).toFixed(1));
  const isBudgetWarning = spentPercent > 90;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Dynamic Savings Logic
  const resolvedCount = anomalies.filter(a => a.status === 'RESOLVED').length;
  const killSwitchCount = controlActions.filter(c => c.status === 'SUCCESS').length;

  const baseEnergySaved = 940; // kWh baseline saved
  const baseMoneySaved = baseEnergySaved * billing.tariffPerKWhINR; // ₹7,990

  const anomalySavingsEnergy = resolvedCount * 120; // 120 kWh per resolved anomaly
  const anomalySavingsMoney = anomalySavingsEnergy * billing.tariffPerKWhINR;

  const controlSavingsEnergy = killSwitchCount * 85; // 85 kWh per remote kill action
  const controlSavingsMoney = controlSavingsEnergy * billing.tariffPerKWhINR;

  const totalEnergySaved = baseEnergySaved + anomalySavingsEnergy + controlSavingsEnergy;
  const totalMoneySaved = baseMoneySaved + anomalySavingsMoney + controlSavingsMoney;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 flex items-center space-x-2">
          <CreditCard className="h-6 w-6 text-cyan-400" />
          <span>FINANCIAL BILLING & BUDGET CONTROL</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          FR-11 / FR-12 Real-time financial telemetry tracking current month spend, expected bill, and budget thresholds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Monthly Budget Limit</span>
          <div className="text-3xl font-black font-mono text-cyan-400">{formatINR(billing.monthlyBudgetINR)}</div>
          <p className="text-xs text-slate-400">Fixed cap configured for facility</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase">Current Month Realized Spend</span>
          <div className="text-3xl font-black font-mono text-slate-100">{formatINR(billing.currentSpendINR)}</div>
          <p className="text-xs text-emerald-400 font-mono">{spentPercent}% of monthly cap consumed</p>
        </div>

        <div className={`p-5 rounded-2xl space-y-2 ${
          isBudgetWarning ? 'glass-panel-alert border-rose-500/50' : 'glass-panel'
        }`}>
          <span className="text-xs font-bold text-slate-400 uppercase">Expected Month-End Bill</span>
          <div className={`text-3xl font-black font-mono ${isBudgetWarning ? 'text-rose-400' : 'text-blue-400'}`}>
            {formatINR(billing.projectedSpendINR)}
          </div>
          <p className="text-xs text-slate-400 font-mono">
            {billing.billingCycleDaysRemaining} Days remaining in billing cycle
          </p>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Budget Consumption Threshold Status
          </span>
          <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full ${
            isBudgetWarning ? 'bg-rose-950 text-rose-300 border border-rose-500/50 animate-pulse' : 'bg-emerald-950 text-emerald-400'
          }`}>
            {spentPercent}% Consumed
          </span>
        </div>

        <div className="w-full bg-slate-900 h-4 rounded-full overflow-hidden p-0.5 border border-slate-800">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${isBudgetWarning ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-emerald-400'}`}
            style={{ width: `${Math.min(100, spentPercent)}%` }}
          />
        </div>

        {isBudgetWarning && (
          <div className="bg-rose-950/80 border border-rose-500/50 p-4 rounded-xl flex items-center space-x-3 text-rose-200 text-xs">
            <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-sm block">CRITICAL BUDGET THRESHOLD BREACH (&gt; 90%)</span>
              Current month spend has crossed 90% of the allocated budget cap. Initiate peak-shaving routines and review idle machine consumption.
            </div>
          </div>
        )}
      </div>

      {/* Sustainable Energy & Financial Savings Section */}
      <div className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <Sparkles className="h-4.5 w-4.5 text-emerald-400" />
              <span>Energy & Financial Savings Summary</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Realized conservation impact from diagnostic resolutions and smart controls</p>
          </div>
          <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg font-bold font-mono">
            Active Impact
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Energy saved card */}
          <div className="bg-[#0b0e14] border border-slate-800/80 p-5 rounded-xl flex items-center justify-between group hover:border-emerald-500/20 transition">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Current Energy Assumption Saved</span>
              <div className="text-2xl font-black font-mono text-emerald-400">{totalEnergySaved.toLocaleString()} kWh</div>
              <p className="text-[11px] text-slate-500">Total electricity consumption offset this cycle</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
              <Zap className="h-6 w-6" />
            </div>
          </div>

          {/* Money saved card */}
          <div className="bg-[#0b0e14] border border-slate-800/80 p-5 rounded-xl flex items-center justify-between group hover:border-emerald-500/20 transition">
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Realized Financial Savings</span>
              <div className="text-2xl font-black font-mono text-emerald-400">{formatINR(totalMoneySaved)}</div>
              <p className="text-[11px] text-slate-500">Direct reduction in energy utility expenditures</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-950/50">
              <PiggyBank className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Savings breakdown list */}
        <div className="space-y-3 bg-[#0a0d13] p-4 rounded-xl border border-slate-800/60">
          <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Savings Contribution Breakdown</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="border-l-2 border-emerald-500 pl-3 py-1 space-y-1">
              <span className="text-[10px] text-slate-500 block">Baseline Optimizations</span>
              <strong className="text-slate-200 block font-mono">940 kWh ({formatINR(baseMoneySaved)})</strong>
              <span className="text-[9px] text-slate-400">Idle power reduction</span>
            </div>
            <div className="border-l-2 border-cyan-500 pl-3 py-1 space-y-1">
              <span className="text-[10px] text-slate-500 block">Resolved Anomalies ({resolvedCount})</span>
              <strong className="text-slate-200 block font-mono">{anomalySavingsEnergy} kWh ({formatINR(anomalySavingsMoney)})</strong>
              <span className="text-[9px] text-slate-400">Early anomaly mitigation</span>
            </div>
            <div className="border-l-2 border-purple-500 pl-3 py-1 space-y-1">
              <span className="text-[10px] text-slate-500 block">Remote Control Controls ({killSwitchCount})</span>
              <strong className="text-slate-200 block font-mono">{controlSavingsEnergy} kWh ({formatINR(controlSavingsMoney)})</strong>
              <span className="text-[9px] text-slate-400">Remote shutoffs & safety triggers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
