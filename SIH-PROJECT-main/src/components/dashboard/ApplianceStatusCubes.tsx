import React from 'react';
import { Activity, PowerOff, AlertTriangle } from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';

export const ApplianceStatusCubes: React.FC = () => {
  const { machines } = useEnergy();

  const activeCount = machines.filter(m => m.status === 'active').length;
  const shutDownCount = machines.filter(m => m.status === 'offline' || m.status === 'idle').length;
  const needsAttentionCount = machines.filter(m => m.status === 'flagged').length;

  // Get machine names that need attention for the tooltip-like list
  const attentionMachines = machines.filter(m => m.status === 'flagged').slice(0, 5);

  const cubes = [
    {
      label: 'Appliances Working',
      count: activeCount,
      total: machines.length,
      icon: <Activity className="h-6 w-6" />,
      gradient: 'from-emerald-600 to-emerald-800',
      borderColor: 'border-emerald-500/50',
      glowColor: 'shadow-emerald-950/50',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-300',
      barColor: 'bg-emerald-400',
      accentText: 'text-emerald-400',
      subtitle: 'Operating within normal parameters',
    },
    {
      label: 'Shut Down',
      count: shutDownCount,
      total: machines.length,
      icon: <PowerOff className="h-6 w-6" />,
      gradient: 'from-slate-700 to-slate-900',
      borderColor: 'border-slate-500/40',
      glowColor: 'shadow-slate-950/50',
      iconBg: 'bg-slate-500/20',
      iconColor: 'text-slate-300',
      barColor: 'bg-slate-400',
      accentText: 'text-slate-400',
      subtitle: 'Offline or idle — not consuming power',
    },
    {
      label: 'Needs Immediate Attention',
      count: needsAttentionCount,
      total: machines.length,
      icon: <AlertTriangle className="h-6 w-6" />,
      gradient: 'from-rose-700 to-rose-900',
      borderColor: 'border-rose-500/50',
      glowColor: 'shadow-rose-950/50',
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-300',
      barColor: 'bg-rose-400',
      accentText: 'text-rose-400',
      subtitle: 'Flagged for anomaly or spike — inspect now',
      machines: attentionMachines,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
      {cubes.map((cube) => {
        const percent = cube.total > 0 ? ((cube.count / cube.total) * 100).toFixed(0) : '0';

        return (
          <div
            key={cube.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${cube.gradient} ${cube.borderColor} border p-5 shadow-xl ${cube.glowColor} transition-transform duration-200 hover:scale-[1.02] hover:shadow-2xl`}
          >
            {/* Background decorative circle */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/[0.04]" />
            <div className="absolute -bottom-8 -left-8 w-20 h-20 rounded-full bg-white/[0.03]" />

            {/* Icon */}
            <div className={`h-12 w-12 rounded-xl ${cube.iconBg} flex items-center justify-center ${cube.iconColor} mb-4`}>
              {cube.icon}
            </div>

            {/* Count */}
            <div className="flex items-baseline space-x-2">
              <span className="text-4xl font-black font-mono text-white tracking-tight">
                {cube.count}
              </span>
              <span className="text-sm font-medium text-white/50">
                / {cube.total}
              </span>
            </div>

            {/* Label */}
            <h3 className="text-sm font-bold text-white/90 mt-1 uppercase tracking-wide">
              {cube.label}
            </h3>

            {/* Subtitle */}
            <p className="text-[11px] text-white/40 mt-1 leading-snug">
              {cube.subtitle}
            </p>

            {/* Progress bar */}
            <div className="mt-4 w-full bg-black/30 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${cube.barColor} transition-all duration-700`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[10px] font-mono font-bold ${cube.accentText}`}>
                {percent}%
              </span>
              <span className="text-[10px] text-white/30 font-mono">of fleet</span>
            </div>

            {/* Machine names for attention cube */}
            {cube.machines && cube.machines.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                {cube.machines.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-[10px]">
                    <span className="text-rose-200 font-semibold">{m.name}</span>
                    <span className="text-rose-300 font-mono">{m.currentKW} kW</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
