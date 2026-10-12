import React from 'react';
import {
  X,
  Wrench,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  Package,
  IndianRupee,
  CalendarClock,
  CircleDot,
  Cpu,
  MapPin,
  Zap,
} from 'lucide-react';
import type { Machine, MaintenanceRecord } from '../../types/energy';

interface MachineAboutPanelProps {
  machine: Machine;
  onClose: () => void;
}

const getMaintenanceTypeBadge = (type: MaintenanceRecord['type']) => {
  const styles: Record<MaintenanceRecord['type'], string> = {
    Preventive: 'bg-emerald-950 text-emerald-400 border-emerald-500/40',
    Corrective: 'bg-amber-950 text-amber-400 border-amber-500/40',
    Predictive: 'bg-violet-950 text-violet-400 border-violet-500/40',
    Emergency: 'bg-rose-950 text-rose-400 border-rose-500/40',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[type]}`}>
      {type.toUpperCase()}
    </span>
  );
};

export const MachineAboutPanel: React.FC<MachineAboutPanelProps> = ({ machine, onClose }) => {
  const now = new Date();
  const nextMaintDate = new Date(machine.nextMaintenanceDate);
  const daysUntilMaint = Math.ceil((nextMaintDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const warrantyDate = new Date(machine.warrantyExpiry);
  const isWarrantyActive = warrantyDate > now;
  const daysUntilWarrantyExpiry = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const totalMaintenanceCost = machine.maintenanceHistory.reduce((sum, r) => sum + r.cost, 0);

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0c1017] border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 cursor-default"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-[#0c1017]">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Cpu className="h-6 w-6 text-black" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-slate-100 tracking-wide">{machine.name}</h2>
                <div className="flex items-center space-x-3 mt-0.5">
                  <span className="text-[11px] text-cyan-400 font-mono font-bold">{machine.id}</span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{machine.zone}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                    <Zap className="h-3 w-3" />
                    <span>{machine.ratedPowerKW} kW Rated</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              title="Close panel (Esc)"
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Install Date */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Installed</span>
              </div>
              <p className="text-sm font-bold font-mono text-slate-100">{machine.installDate}</p>
            </div>

            {/* Warranty */}
            <div className={`border rounded-xl p-3 space-y-1 ${
              isWarrantyActive
                ? 'bg-emerald-950/40 border-emerald-500/30'
                : 'bg-rose-950/40 border-rose-500/30'
            }`}>
              <div className={`flex items-center space-x-1.5 ${isWarrantyActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Warranty</span>
              </div>
              <p className={`text-sm font-bold font-mono ${isWarrantyActive ? 'text-emerald-300' : 'text-rose-300'}`}>
                {isWarrantyActive ? `${daysUntilWarrantyExpiry}d Left` : 'Expired'}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{machine.warrantyExpiry}</p>
            </div>

            {/* Next Maintenance */}
            <div className={`border rounded-xl p-3 space-y-1 ${
              daysUntilMaint <= 7
                ? 'bg-amber-950/40 border-amber-500/30'
                : 'bg-slate-900/80 border-slate-800'
            }`}>
              <div className={`flex items-center space-x-1.5 ${daysUntilMaint <= 7 ? 'text-amber-400' : 'text-cyan-400'}`}>
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Next Service</span>
              </div>
              <p className={`text-sm font-bold font-mono ${daysUntilMaint <= 7 ? 'text-amber-300' : 'text-slate-100'}`}>
                {daysUntilMaint <= 0 ? 'Overdue!' : `In ${daysUntilMaint} days`}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">{machine.nextMaintenanceDate}</p>
            </div>

            {/* Total Maintenance Cost */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <IndianRupee className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Spent</span>
              </div>
              <p className="text-sm font-bold font-mono text-slate-100">{formatINR(totalMaintenanceCost)}</p>
              <p className="text-[10px] text-slate-400">{machine.maintenanceHistory.length} services</p>
            </div>
          </div>

          {/* Next Maintenance Alert */}
          {daysUntilMaint <= 7 && (
            <div className="bg-amber-950/60 border border-amber-500/40 p-3.5 rounded-xl flex items-center space-x-3 text-amber-200 text-xs">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-sm block">Maintenance Due Soon</span>
                Scheduled preventive maintenance is due {daysUntilMaint <= 0 ? 'now (overdue)' : `in ${daysUntilMaint} day${daysUntilMaint === 1 ? '' : 's'}`}. Plan downtime accordingly.
              </div>
            </div>
          )}

          {/* Maintenance History Timeline */}
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center space-x-2 mb-4">
              <Wrench className="h-4 w-4 text-cyan-400" />
              <span>Maintenance History</span>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                {machine.maintenanceHistory.length} Records
              </span>
            </h3>

            <div className="relative space-y-0">
              {/* Timeline vertical line */}
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-cyan-500/40 via-slate-700 to-transparent" />

              {machine.maintenanceHistory.map((record, _idx) => (
                <div key={record.id} className="relative pl-10 pb-5 last:pb-0 group">
                  {/* Timeline dot */}
                  <div className={`absolute left-[9px] top-1.5 h-3.5 w-3.5 rounded-full border-2 z-10 transition-transform group-hover:scale-125 ${
                    record.type === 'Emergency' ? 'bg-rose-500 border-rose-400' :
                    record.type === 'Corrective' ? 'bg-amber-500 border-amber-400' :
                    record.type === 'Predictive' ? 'bg-violet-500 border-violet-400' :
                    'bg-emerald-500 border-emerald-400'
                  }`} />

                  <div className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition space-y-2.5">
                    {/* Top row */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{record.id}</span>
                        {getMaintenanceTypeBadge(record.type)}
                      </div>
                      <div className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                        <Calendar className="h-3 w-3" />
                        <span className="font-mono">{record.date}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {record.description}
                    </p>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{record.technician}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{record.durationHours}h Duration</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <IndianRupee className="h-3 w-3 shrink-0" />
                        <span className="font-mono">{formatINR(record.cost)}</span>
                      </div>
                    </div>

                    {/* Parts replaced */}
                    {record.partsReplaced && record.partsReplaced.length > 0 && (
                      <div className="flex items-start space-x-1.5 text-[10px]">
                        <Package className="h-3 w-3 text-slate-500 mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {record.partsReplaced.map((part, pIdx) => (
                            <span
                              key={pIdx}
                              className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700"
                            >
                              {part}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center space-x-1.5">
                      <CircleDot className="h-3 w-3 text-emerald-400" />
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">{record.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer with Close Button */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">Press <kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-[10px] text-slate-300">Esc</kbd> or click outside to close</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold transition flex items-center space-x-1.5"
          >
            <X className="h-4 w-4" />
            <span>Close Panel</span>
          </button>
        </div>
      </div>
    </div>
  );
};
