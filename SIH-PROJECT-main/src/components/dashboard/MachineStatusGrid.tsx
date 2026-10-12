import React, { useState } from 'react';
import { 
  Cpu, 
  Power, 
  ShieldAlert,
  Grid,
  List,
  Info
} from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';
import type { Machine, MachineStatus } from '../../types/energy';
import { MachineAboutPanel } from './MachineAboutPanel';

export const MachineStatusGrid: React.FC = () => {
  const { 
    machines, 
    selectedMachineId, 
    setSelectedMachineId, 
    openKillSwitchModal, 
    searchQuery, 
    selectedZone,
    setSelectedZone
  } = useEnergy();

  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');
  const [selectedMachineIds, setSelectedMachineIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [aboutMachine, setAboutMachine] = useState<Machine | null>(null);

  const zones = ['ALL', 'Shop Floor A', 'Shop Floor B', 'Assembly Line 1', 'Heavy Machining', 'Packaging Bay'];
  const statuses = ['ALL', 'active', 'flagged', 'idle', 'offline'];

  const filteredMachines = machines.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.zone.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesZone = selectedZone === 'ALL' || m.zone === selectedZone;
    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchesSearch && matchesZone && matchesStatus;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMachineIds(filteredMachines.map(m => m.id));
    } else {
      setSelectedMachineIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedMachineIds.includes(id)) {
      setSelectedMachineIds(selectedMachineIds.filter(i => i !== id));
    } else {
      setSelectedMachineIds([...selectedMachineIds, id]);
    }
  };



  const getStatusBadge = (status: MachineStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>ACTIVE (Normal)</span>
          </span>
        );
      case 'flagged':
        return (
          <span className="bg-rose-950/90 border border-rose-500/50 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 animate-pulse">
            <ShieldAlert className="h-3 w-3 text-rose-400" />
            <span>FLAGGED (Breach)</span>
          </span>
        );
      case 'idle':
        return (
          <span className="bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>IDLE (Standby)</span>
          </span>
        );
      case 'offline':
        return (
          <span className="bg-slate-900 border border-slate-800 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-600" />
            <span>OFFLINE</span>
          </span>
        );
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider flex items-center space-x-2">
              <span>Monitored Machinery Grid</span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
                {filteredMachines.length} Assets
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Second-Level Power Telemetry & Remote Controls (10 Monitored Appliances)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {zones.map(z => <option key={z} value={z}>{z === 'ALL' ? 'All Zones' : z}</option>)}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            {statuses.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.toUpperCase()}</option>)}
          </select>

          <div className="bg-slate-900 border border-slate-800 p-0.5 rounded-lg flex space-x-1">
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded ${viewMode === 'GRID' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Grid View"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded ${viewMode === 'TABLE' ? 'bg-slate-800 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>


        </div>
      </div>

      {viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[500px] overflow-y-auto pr-1">
          {filteredMachines.map(m => {
            const isSelected = selectedMachineId === m.id;
            const isChecked = selectedMachineIds.includes(m.id);

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMachineId(m.id)}
                className={`p-3 rounded-xl border transition cursor-pointer relative group ${
                  isSelected 
                    ? 'bg-slate-900/90 border-cyan-500 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-500/50' 
                    : m.status === 'flagged'
                    ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(m.id);
                      }}
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition truncate max-w-[110px]">
                        {m.name}
                      </h4>
                      <p className="text-[10px] text-slate-400">{m.zone}</p>
                    </div>
                  </div>

                  {getStatusBadge(m.status)}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-500 text-[9px] block uppercase">Live Load</span>
                    <strong className={m.status === 'flagged' ? 'text-rose-400 font-bold' : 'text-cyan-400'}>
                      {(m.currentKW * 1000).toFixed(1)} W
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block uppercase">Baseline</span>
                    <span className="text-slate-300">{(m.baselineKW * 1000).toFixed(1)} W</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 text-[9px] block uppercase">Current</span>
                    <span className="text-slate-300">{m.currentAmps} A</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-slate-500 text-[9px] block uppercase">Efficiency</span>
                    <span className="text-emerald-400">{m.efficiencyScore}%</span>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <div className="h-5 w-24 flex items-end space-x-0.5">
                    {m.sparkline.map((val, idx) => {
                      const heightPercent = Math.min(100, (val / m.ratedPowerKW) * 100);
                      return (
                        <div
                          key={idx}
                          className={`w-full rounded-t transition-all ${
                            m.status === 'flagged' ? 'bg-rose-500' : 'bg-cyan-500/70'
                          }`}
                          style={{ height: `${Math.max(15, heightPercent)}%` }}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAboutMachine(m);
                      }}
                      title="View Machine About & Maintenance"
                      className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 transition"
                    >
                      <Info className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openKillSwitchModal(m);
                      }}
                      title="Remote Kill Switch Power Isolation"
                      className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/30 text-rose-300 transition"
                    >
                      <Power className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 font-semibold uppercase text-[10px] sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedMachineIds.length === filteredMachines.length && filteredMachines.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500"
                  />
                </th>
                <th className="p-3">Machine ID</th>
                <th className="p-3">Asset Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Zone</th>
                <th className="p-3">Status</th>
                <th className="p-3">Live kW</th>
                <th className="p-3">Baseline kW</th>
                <th className="p-3">Amps (A)</th>
                <th className="p-3">Efficiency</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-slate-200">
              {filteredMachines.map(m => (
                <tr 
                  key={m.id} 
                  onClick={() => setSelectedMachineId(m.id)}
                  className={`hover:bg-slate-900/80 transition cursor-pointer ${
                    selectedMachineId === m.id ? 'bg-cyan-950/30 border-l-2 border-cyan-500' : ''
                  }`}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedMachineIds.includes(m.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(m.id);
                      }}
                      className="rounded border-slate-700 bg-slate-800 text-cyan-500"
                    />
                  </td>
                  <td className="p-3 font-bold text-cyan-400">{m.id}</td>
                  <td className="p-3 font-sans font-semibold text-slate-100">{m.name}</td>
                  <td className="p-3 text-slate-400 font-sans">{m.type}</td>
                  <td className="p-3 text-slate-400 font-sans">{m.zone}</td>
                  <td className="p-3">{getStatusBadge(m.status)}</td>
                  <td className={`p-3 font-bold ${m.status === 'flagged' ? 'text-rose-400' : 'text-cyan-400'}`}>
                    {m.currentKW} kW
                  </td>
                  <td className="p-3 text-slate-300">{m.baselineKW} kW</td>
                  <td className="p-3 text-slate-300">{m.currentAmps} A</td>
                  <td className="p-3 text-emerald-400">{m.efficiencyScore}%</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAboutMachine(m);
                        }}
                        className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 rounded text-[10px] font-bold inline-flex items-center space-x-1"
                      >
                        <Info className="h-3 w-3" />
                        <span>About</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openKillSwitchModal(m);
                        }}
                        className="px-2 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded text-[10px] font-bold inline-flex items-center space-x-1"
                      >
                        <Power className="h-3 w-3" />
                        <span>Kill</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Machine About Panel Modal */}
      {aboutMachine && (
        <MachineAboutPanel
          machine={aboutMachine}
          onClose={() => setAboutMachine(null)}
        />
      )}
    </div>
  );
};
