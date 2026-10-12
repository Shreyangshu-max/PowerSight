import React from 'react';
import { EnergyProvider, useEnergy } from './context/EnergyContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { QuickStatsStrip } from './components/dashboard/QuickStatsStrip';
import { LivePowerGraph } from './components/dashboard/LivePowerGraph';
import { SuggestionBox } from './components/dashboard/SuggestionBox';
import { ApplianceStatusCubes } from './components/dashboard/ApplianceStatusCubes';
import { MachineStatusGrid } from './components/dashboard/MachineStatusGrid';
import { OperatorFeedbackModal } from './components/modals/OperatorFeedbackModal';
import { RemoteKillSwitchModal } from './components/modals/RemoteKillSwitchModal';
import { HistoricalLogView } from './components/views/HistoricalLogView';
import { AIInsightsView } from './components/views/AIInsightsView';
import { BillingView } from './components/views/BillingView';
import { SettingsView } from './components/views/SettingsView';
import { SensorLogsView } from './components/views/SensorLogsView';
import { AdminView } from './components/views/AdminView';

const DashboardContent: React.FC = () => {
  const { activeTab } = useEnergy();

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {activeTab === 'dashboard' && (
        <>
          {/* Quick Stats Financial Strip */}
          <QuickStatsStrip />

          {/* Central Split Area (~65% Graph / ~35% Suggestions Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left / Center (~65% = 8 cols on 12-col grid) */}
            <div className="lg:col-span-8">
              <LivePowerGraph />
            </div>

            {/* Right Sidebar (~35% = 4 cols on 12-col grid) */}
            <div className="lg:col-span-4">
              <SuggestionBox />
            </div>
          </div>

          {/* Appliance Status Cubes */}
          <ApplianceStatusCubes />
        </>
      )}

      {activeTab === 'machines' && <MachineStatusGrid />}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <LivePowerGraph />
          <MachineStatusGrid />
        </div>
      )}
      {activeTab === 'alerts' && <HistoricalLogView />}
      {activeTab === 'insights' && <AIInsightsView />}
      {activeTab === 'sensor-logs' && <SensorLogsView />}
      {activeTab === 'billing' && <BillingView />}
      {activeTab === 'admin' && <AdminView />}
      {activeTab === 'settings' && <SettingsView />}
    </main>
  );
};

export function App() {
  return (
    <EnergyProvider>
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black">
        <Header />
        
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <DashboardContent />
        </div>

        {/* Global Workflows & Confirmation Modals */}
        <OperatorFeedbackModal />
        <RemoteKillSwitchModal />
      </div>
    </EnergyProvider>
  );
}

export default App;
