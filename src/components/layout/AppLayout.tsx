'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // In Phase 1 shell, default to demo mode until Supabase credentials & ESP32 ingestion are configured
  const isDemoMode = true;
  const isHardwareOnline = false;

  const handleEmergencyStop = () => {
    alert('Emergency Stop triggered: Commanded immediate de-energize of Water Pump (GPIO18 -> HIGH / Active-Low OFF).');
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isDemoMode={isDemoMode}
          isHardwareOnline={isHardwareOnline}
          systemMode="MANUAL"
          lastTelemetryTime="Offline (Phase 1 Shell)"
          onEmergencyStop={handleEmergencyStop}
        />

        {/* Demo Mode & Hardware Status Advisory Banner */}
        {isDemoMode && (
          <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Hardware Advisory:</strong> Running in <strong>Demo Shell Mode</strong>. Live ESP32 DevKit V1 and Supabase backend credentials are not yet linked. Telemetry shown is simulated for interface verification.
                </span>
              </div>
              <Link
                href="/settings"
                className="shrink-0 underline hover:text-amber-100 font-medium ml-2"
              >
                Configure Credentials →
              </Link>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500">
          <p>
            Smart Agriculture IoT System • ESP32 DevKit V1 (38-pin) • HW-316 4-Channel Active-Low Relay • ESP32-CAM
          </p>
        </footer>
      </div>
    </div>
  );
}
