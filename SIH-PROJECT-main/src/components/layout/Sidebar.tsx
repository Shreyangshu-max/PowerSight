import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  AlertOctagon, 
  Sparkles, 
  CreditCard, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { useEnergy } from '../../context/EnergyContext';
import type { NavTab } from '../../context/EnergyContext';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeCount?: number;
  color?: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, unactionedAlertsCount, backendConnected, sensorLogs } = useEnergy();
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'machines', label: 'Machines (10)', icon: Cpu },
    { id: 'alerts', label: 'Alerts & SLA', icon: AlertOctagon, badgeCount: unactionedAlertsCount },
    { id: 'insights', label: 'AI Diagnostics', icon: Sparkles, color: 'text-emerald-400' },
    { id: 'sensor-logs', label: 'Sensor Logs', icon: Activity, color: 'text-emerald-400', badgeCount: backendConnected ? sensorLogs.length : undefined },
    { id: 'billing', label: 'Financial Billing', icon: CreditCard },
    { id: 'admin', label: 'Admin Controls', icon: ShieldCheck, color: 'text-emerald-300' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className={`bg-black border-r border-emerald-500/20 transition-all duration-300 flex flex-col justify-between z-20 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-950/40 font-bold'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80'
              }`}
              title={item.label}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-emerald-400' : item.color || 'text-zinc-400'}`} />
              
              {!collapsed && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {item.badgeCount !== undefined && item.badgeCount > 0 && (
                <span className={`rounded-full bg-rose-600 text-white font-bold text-[10px] px-1.5 py-0.5 shadow-md shadow-rose-600/30 ${
                  collapsed ? 'absolute top-1 right-1' : 'ml-auto'
                }`}>
                  {item.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-zinc-900">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="ml-2 text-xs font-medium">Collapse Menu</span>}
        </button>
      </div>
    </aside>
  );
};
