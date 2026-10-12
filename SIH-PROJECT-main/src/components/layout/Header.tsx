import React, { useState } from 'react';
import { 
  Zap, 
  Search, 
  Bell, 
  Flame,
  ChevronDown,
  CheckCircle2,
  Power,
  Fan
} from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';
import { SIGNATURE_PROFILES } from '../../services/telemetryEngine';

// Color map for each signature badge
const BADGE_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  amber:  { bg: 'bg-amber-950/80',  border: 'border-amber-500/30',  text: 'text-amber-400'  },
  orange: { bg: 'bg-orange-950/80', border: 'border-orange-500/30', text: 'text-orange-400' },
  rose:   { bg: 'bg-rose-950/80',   border: 'border-rose-500/30',   text: 'text-rose-400'   },
  yellow: { bg: 'bg-yellow-950/80', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  sky:    { bg: 'bg-sky-950/80',    border: 'border-sky-500/30',    text: 'text-sky-400'    },
  violet: { bg: 'bg-violet-950/80', border: 'border-violet-500/30', text: 'text-violet-400' },
  purple: { bg: 'bg-purple-950/80', border: 'border-purple-500/30', text: 'text-purple-400' },
};

const NAME_COLOR: Record<number, string> = {
  1: 'text-amber-300',
  2: 'text-orange-300',
  3: 'text-rose-400 font-bold',
  4: 'text-yellow-300',
  5: 'text-sky-300',
  6: 'text-violet-300',
  7: 'text-purple-300',
};

export const Header: React.FC = () => {
  const { 
    searchQuery, 
    setSearchQuery, 
    unactionedAlertsCount,
    machines,
    selectedMachineId,
    setActiveTab,
    normalizeAll,
    triggerSignature,
    fanState,
    toggleFanState,
  } = useEnergy();

  const [isTogglingFan, setIsTogglingFan] = useState(false);

  const handleFanToggle = async () => {
    setIsTogglingFan(true);
    await toggleFanState();
    setTimeout(() => setIsTogglingFan(false), 400);
  };

  const [anomalyMenuOpen, setAnomalyMenuOpen] = useState(false);

  const targetMachineId = selectedMachineId || (machines.find(m => m.status === 'active') || machines[0])?.id;

  return (
    <header className="h-16 border-b border-emerald-500/20 bg-black/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="h-6 w-6 text-black fill-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-emerald-400 via-green-200 to-white bg-clip-text text-transparent">
                Power<span className="text-emerald-400">Sight</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">IoT Energy Monitoring &amp; Diagnostics</p>
          </div>
        </div>

        {/* ── Remote Fan Power Control Toggle ── */}
        <button
          onClick={handleFanToggle}
          disabled={isTogglingFan}
          title={`Click to turn ${fanState === 'ON' ? 'OFF' : 'ON'} the ESP32 Motor Fan`}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all shadow-md active:scale-95 ${
            fanState === 'ON'
              ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-emerald-500/20 hover:bg-emerald-900/90'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300 shadow-rose-950/30 hover:bg-rose-900/60'
          }`}
        >
          <Fan className={`h-4 w-4 ${fanState === 'ON' ? 'text-emerald-400 animate-spin' : 'text-rose-400'}`} />
          <span>FAN:</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-extrabold ${
            fanState === 'ON'
              ? 'bg-emerald-500 text-black'
              : 'bg-rose-600 text-white'
          }`}>
            {fanState}
          </span>
          <Power className={`h-3.5 w-3.5 opacity-80 ${fanState === 'ON' ? 'text-emerald-400' : 'text-rose-400'}`} />
        </button>
      </div>

      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search appliances by ID, name, or zone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-zinc-950/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* ── AI Diagnostic Signature Trigger ── */}
        <div className="relative">
          <button
            onClick={() => setAnomalyMenuOpen(!anomalyMenuOpen)}
            className="text-xs px-3 py-1.5 rounded-lg border bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/50 flex items-center space-x-1.5 font-medium transition"
          >
            <Flame className="h-3.5 w-3.5 text-rose-400" />
            <span className="hidden sm:inline">AI Signature Trigger</span>
            <ChevronDown className="h-3 w-3 opacity-70" />
          </button>

          {anomalyMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-50 p-1.5 text-xs">
              
              {/* Header */}
              <div className="px-2.5 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase border-b border-slate-800 mb-1">
                🧠 MSME AI Diagnostic Signatures
              </div>

              {/* Normalize button */}
              <button 
                onClick={() => {
                  normalizeAll();
                  setAnomalyMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg text-slate-200 flex items-center justify-between transition mb-1"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-emerald-400">Normalize</div>
                    <div className="text-[10px] text-slate-400">Reset to clean baseline graph</div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded font-mono border border-emerald-500/30">Normal</span>
              </button>

              <div className="border-t border-slate-800/60 my-1" />

              {/* 7 Signature buttons */}
              {SIGNATURE_PROFILES.map(profile => {
                const badge = BADGE_STYLES[profile.badgeColor] ?? BADGE_STYLES['amber'];
                return (
                  <button
                    key={profile.id}
                    onClick={() => {
                      if (targetMachineId) triggerSignature(targetMachineId, profile.id);
                      setAnomalyMenuOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg text-slate-200 flex items-center justify-between transition group"
                  >
                    <div className="flex-1 mr-2">
                      <div className={`font-semibold ${NAME_COLOR[profile.id] ?? 'text-slate-200'} flex items-center space-x-1.5`}>
                        <span className="text-slate-500 font-mono text-[10px]">SIG-{profile.id}</span>
                        <span>{profile.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{profile.graphProfile}</div>
                    </div>
                    <div className="flex flex-col items-end space-y-1 shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${badge.bg} ${badge.border} ${badge.text}`}>
                        {profile.badgeLabel}
                      </span>
                      <span className={`text-[9px] font-bold ${profile.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {profile.severity}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button 
          onClick={() => setActiveTab('alerts')}
          className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition"
          title="View Active Anomalies & Alerts"
        >
          <Bell className="h-4 w-4" />
          {unactionedAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shadow-lg shadow-rose-600/40 animate-pulse">
              {unactionedAlertsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
